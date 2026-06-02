using Medicinator.Api.Dtos;

namespace Medicinator.Api.Services;

/// <summary>
/// Familyサービス
/// </summary>
public interface IFamilyService
{
    /// <summary>
    /// 認証ユーザーのFamily一覧を取得
    /// </summary>
    Task<IReadOnlyList<FamilyResponse>> GetFamiliesAsync(string firebaseUid, CancellationToken cancellationToken);

    /// <summary>
    /// Familyを作成
    /// </summary>
    Task<FamilyResponse> CreateFamilyAsync(string firebaseUid, CreateFamilyRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Family招待一覧を取得
    /// </summary>
    Task<IReadOnlyList<FamilyInviteResponse>> GetInvitesAsync(string firebaseUid, Guid familyId, CancellationToken cancellationToken);

    /// <summary>
    /// Family招待を作成
    /// </summary>
    Task<CreatedFamilyInviteResponse> CreateInviteAsync(string firebaseUid, Guid familyId, CancellationToken cancellationToken);

    /// <summary>
    /// Family招待を失効
    /// </summary>
    Task RevokeInviteAsync(string firebaseUid, Guid familyId, Guid inviteId, CancellationToken cancellationToken);

    /// <summary>
    /// 招待コードでFamilyへ参加
    /// </summary>
    Task<FamilyResponse> JoinFamilyAsync(string firebaseUid, JoinFamilyRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Family所属を検証
    /// </summary>
    Task EnsureMemberAsync(string firebaseUid, Guid familyId, CancellationToken cancellationToken);

    /// <summary>
    /// Family管理者権限を検証
    /// </summary>
    Task EnsureAdminAsync(string firebaseUid, Guid familyId, CancellationToken cancellationToken);
}
