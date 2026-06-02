using Medicinator.Api.Data;
using Medicinator.Api.Dtos;
using Medicinator.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Medicinator.Api.Services;

/// <inheritdoc />
public sealed class PersonService(MedicinatorDbContext dbContext, IFamilyService familyService) : IPersonService
{
    /// <inheritdoc />
    public async Task<IReadOnlyList<PersonResponse>> GetPeopleAsync(string firebaseUid, Guid familyId, CancellationToken cancellationToken)
    {
        await familyService.EnsureMemberAsync(firebaseUid, familyId, cancellationToken);
        return await dbContext.People
            .AsNoTracking()
            .Where(x => x.FamilyId == familyId)
            .OrderBy(x => x.Name)
            .Select(x => new PersonResponse(x.Id, x.FamilyId, x.Name, x.Note, x.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<PersonResponse> CreatePersonAsync(string firebaseUid, Guid familyId, CreatePersonRequest request, CancellationToken cancellationToken)
    {
        await familyService.EnsureAdminAsync(firebaseUid, familyId, cancellationToken);
        var person = new Person
        {
            Id = Guid.NewGuid(),
            FamilyId = familyId,
            Name = NormalizeRequired(request.Name, 120),
            Note = NormalizeOptional(request.Note, 500),
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.People.Add(person);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToResponse(person);
    }

    /// <inheritdoc />
    public async Task<PersonResponse> UpdatePersonAsync(string firebaseUid, Guid familyId, Guid personId, UpdatePersonRequest request, CancellationToken cancellationToken)
    {
        await familyService.EnsureAdminAsync(firebaseUid, familyId, cancellationToken);
        var person = await dbContext.People.SingleOrDefaultAsync(x => x.FamilyId == familyId && x.Id == personId, cancellationToken)
            ?? throw new KeyNotFoundException("飲む人が見つからない");

        person.Name = NormalizeRequired(request.Name, 120);
        person.Note = NormalizeOptional(request.Note, 500);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToResponse(person);
    }

    /// <inheritdoc />
    public async Task DeletePersonAsync(string firebaseUid, Guid familyId, Guid personId, CancellationToken cancellationToken)
    {
        await familyService.EnsureAdminAsync(firebaseUid, familyId, cancellationToken);
        var person = await dbContext.People.SingleOrDefaultAsync(x => x.FamilyId == familyId && x.Id == personId, cancellationToken)
            ?? throw new KeyNotFoundException("飲む人が見つからない");
        var hasMedicine = await dbContext.Medicines.AnyAsync(x => x.FamilyId == familyId && x.PersonId == personId, cancellationToken);
        var hasIntake = await dbContext.MedicationIntakes.AnyAsync(x => x.FamilyId == familyId && x.PersonId == personId, cancellationToken);
        if (hasMedicine || hasIntake)
        {
            throw new InvalidOperationException("薬または服薬記録がある飲む人は削除できない");
        }

        dbContext.People.Remove(person);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// レスポンスへ変換
    /// </summary>
    private static PersonResponse ToResponse(Person person) => new(person.Id, person.FamilyId, person.Name, person.Note, person.CreatedAt);

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
    /// 任意文字列を正規化
    /// </summary>
    private static string? NormalizeOptional(string? value, int maxLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrEmpty(normalized))
        {
            return null;
        }

        return normalized.Length <= maxLength ? normalized : normalized[..maxLength];
    }
}
