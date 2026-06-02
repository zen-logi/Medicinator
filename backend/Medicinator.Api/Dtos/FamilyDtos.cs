using Medicinator.Api.Models;

namespace Medicinator.Api.Dtos;

/// <summary>
/// Family作成リクエスト
/// </summary>
public sealed record CreateFamilyRequest(string Name, string DisplayName);

/// <summary>
/// Familyレスポンス
/// </summary>
public sealed record FamilyResponse(Guid Id, string Name, FamilyRole Role);

/// <summary>
/// Family招待作成レスポンス
/// </summary>
public sealed record CreatedFamilyInviteResponse(Guid Id, string InviteCode, DateTimeOffset ExpiresAt);

/// <summary>
/// Family招待レスポンス
/// </summary>
public sealed record FamilyInviteResponse(
    Guid Id,
    Guid FamilyId,
    string CreatedByFirebaseUid,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt,
    DateTimeOffset? UsedAt,
    DateTimeOffset? RevokedAt);

/// <summary>
/// Family参加リクエスト
/// </summary>
public sealed record JoinFamilyRequest(string InviteCode, string DisplayName);

/// <summary>
/// 自分の情報レスポンス
/// </summary>
public sealed record MeResponse(string FirebaseUid, IReadOnlyList<FamilyResponse> Families);
