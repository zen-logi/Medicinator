using System.Security.Cryptography;
using System.Text;
using Medicinator.Api.Data;
using Medicinator.Api.Dtos;
using Medicinator.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Medicinator.Api.Services;

/// <inheritdoc />
public sealed class FamilyService(MedicinatorDbContext dbContext) : IFamilyService
{
    /// <inheritdoc />
    public async Task<IReadOnlyList<FamilyResponse>> GetFamiliesAsync(string firebaseUid, CancellationToken cancellationToken)
    {
        return await dbContext.FamilyMemberships
            .AsNoTracking()
            .Where(x => x.FirebaseUid == firebaseUid)
            .Include(x => x.Family)
            .OrderBy(x => x.Family!.Name)
            .Select(x => new FamilyResponse(x.FamilyId, x.Family!.Name, x.Role))
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<FamilyResponse> CreateFamilyAsync(string firebaseUid, CreateFamilyRequest request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var family = new Family
        {
            Id = Guid.NewGuid(),
            Name = NormalizeRequired(request.Name, 120),
            CreatedAt = now
        };

        family.Memberships.Add(new FamilyMembership
        {
            Id = Guid.NewGuid(),
            FamilyId = family.Id,
            FirebaseUid = firebaseUid,
            DisplayName = NormalizeRequired(request.DisplayName, 120),
            Role = FamilyRole.Owner,
            JoinedAt = now
        });

        dbContext.Families.Add(family);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new FamilyResponse(family.Id, family.Name, FamilyRole.Owner);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<FamilyInviteResponse>> GetInvitesAsync(string firebaseUid, Guid familyId, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(firebaseUid, familyId, cancellationToken);

        return await dbContext.FamilyInvites
            .AsNoTracking()
            .Where(x => x.FamilyId == familyId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new FamilyInviteResponse(
                x.Id,
                x.FamilyId,
                x.CreatedByFirebaseUid,
                x.CreatedAt,
                x.ExpiresAt,
                x.UsedAt,
                x.RevokedAt))
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<CreatedFamilyInviteResponse> CreateInviteAsync(string firebaseUid, Guid familyId, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(firebaseUid, familyId, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var inviteCode = await CreateUniqueInviteCodeAsync(cancellationToken);
        var invite = new FamilyInvite
        {
            Id = Guid.NewGuid(),
            FamilyId = familyId,
            CodeHash = HashInviteCode(inviteCode),
            CreatedByFirebaseUid = firebaseUid,
            CreatedAt = now,
            ExpiresAt = now.AddDays(7)
        };

        dbContext.FamilyInvites.Add(invite);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new CreatedFamilyInviteResponse(invite.Id, FormatInviteCode(inviteCode), invite.ExpiresAt);
    }

    /// <inheritdoc />
    public async Task RevokeInviteAsync(string firebaseUid, Guid familyId, Guid inviteId, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(firebaseUid, familyId, cancellationToken);
        var invite = await dbContext.FamilyInvites
            .SingleOrDefaultAsync(x => x.FamilyId == familyId && x.Id == inviteId, cancellationToken)
            ?? throw new KeyNotFoundException("招待が見つからない");

        invite.RevokedAt ??= DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<FamilyResponse> JoinFamilyAsync(string firebaseUid, JoinFamilyRequest request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var inviteCode = NormalizeInviteCode(request.InviteCode);
        var inviteHash = HashInviteCode(inviteCode);
        var invite = await dbContext.FamilyInvites
            .Include(x => x.Family)
            .ThenInclude(x => x!.Memberships)
            .SingleOrDefaultAsync(x => x.CodeHash == inviteHash, cancellationToken)
            ?? throw new KeyNotFoundException("招待が見つからない");

        if (invite.ExpiresAt <= now || invite.UsedAt is not null || invite.RevokedAt is not null)
        {
            throw new InvalidOperationException("招待は利用できない");
        }

        var family = invite.Family ?? throw new KeyNotFoundException("Familyが見つからない");

        var existing = family.Memberships.SingleOrDefault(x => x.FirebaseUid == firebaseUid);
        if (existing is not null)
        {
            invite.UsedAt = now;
            await dbContext.SaveChangesAsync(cancellationToken);
            return new FamilyResponse(family.Id, family.Name, existing.Role);
        }

        var membership = new FamilyMembership
        {
            Id = Guid.NewGuid(),
            FamilyId = family.Id,
            FirebaseUid = firebaseUid,
            DisplayName = NormalizeRequired(request.DisplayName, 120),
            Role = FamilyRole.Member,
            JoinedAt = now
        };

        dbContext.FamilyMemberships.Add(membership);
        invite.UsedAt = now;
        await dbContext.SaveChangesAsync(cancellationToken);

        return new FamilyResponse(family.Id, family.Name, membership.Role);
    }

    /// <inheritdoc />
    public async Task EnsureMemberAsync(string firebaseUid, Guid familyId, CancellationToken cancellationToken)
    {
        var exists = await dbContext.FamilyMemberships
            .AnyAsync(x => x.FamilyId == familyId && x.FirebaseUid == firebaseUid, cancellationToken);

        if (!exists)
        {
            throw new UnauthorizedAccessException("Familyへのアクセス権がない");
        }
    }

    /// <inheritdoc />
    public async Task EnsureAdminAsync(string firebaseUid, Guid familyId, CancellationToken cancellationToken)
    {
        var role = await dbContext.FamilyMemberships
            .Where(x => x.FamilyId == familyId && x.FirebaseUid == firebaseUid)
            .Select(x => (FamilyRole?)x.Role)
            .SingleOrDefaultAsync(cancellationToken);

        if (role is null)
        {
            throw new UnauthorizedAccessException("Familyへのアクセス権がない");
        }

        if (role is not (FamilyRole.Owner or FamilyRole.Admin))
        {
            throw new UnauthorizedAccessException("Family管理権限がない");
        }
    }

    /// <summary>
    /// 必須文字列を正規化
    /// </summary>
    private static string NormalizeRequired(string value, int maxLength)
    {
        var normalized = value.Trim();
        if (normalized.Length == 0)
        {
            throw new ArgumentException("必須項目が空");
        }

        return normalized.Length <= maxLength ? normalized : normalized[..maxLength];
    }

    /// <summary>
    /// 招待コードを正規化
    /// </summary>
    private static string NormalizeInviteCode(string value)
    {
        var normalized = NormalizeRequired(value, 64)
            .Replace("-", string.Empty, StringComparison.Ordinal)
            .Replace(" ", string.Empty, StringComparison.Ordinal)
            .ToUpperInvariant();

        if (normalized.Length != 24)
        {
            throw new ArgumentException("招待コードの形式が不正");
        }

        return normalized;
    }

    /// <summary>
    /// 招待コードをハッシュ化
    /// </summary>
    private static string HashInviteCode(string inviteCode)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(inviteCode));
        return Convert.ToHexString(bytes);
    }

    /// <summary>
    /// 招待コードを表示用に整形
    /// </summary>
    private static string FormatInviteCode(string inviteCode)
    {
        return string.Join("-", Enumerable.Range(0, 4).Select(index => inviteCode.Substring(index * 6, 6)));
    }

    /// <summary>
    /// 重複しない招待コードを生成
    /// </summary>
    private async Task<string> CreateUniqueInviteCodeAsync(CancellationToken cancellationToken)
    {
        for (var i = 0; i < 20; i++)
        {
            var code = Convert.ToHexString(RandomNumberGenerator.GetBytes(12));
            var hash = HashInviteCode(code);
            var exists = await dbContext.FamilyInvites.AnyAsync(x => x.CodeHash == hash, cancellationToken);
            if (!exists)
            {
                return code;
            }
        }

        throw new InvalidOperationException("招待コードを生成できない");
    }
}
