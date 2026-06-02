namespace Medicinator.Api.Models;

/// <summary>
/// Family招待
/// </summary>
public sealed class FamilyInvite
{
    /// <summary>
    /// 招待ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Family ID
    /// </summary>
    public Guid FamilyId { get; set; }

    /// <summary>
    /// 招待コードハッシュ
    /// </summary>
    public required string CodeHash { get; set; }

    /// <summary>
    /// 作成者Firebase UID
    /// </summary>
    public required string CreatedByFirebaseUid { get; set; }

    /// <summary>
    /// 作成日時
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// 有効期限
    /// </summary>
    public DateTimeOffset ExpiresAt { get; set; }

    /// <summary>
    /// 使用日時
    /// </summary>
    public DateTimeOffset? UsedAt { get; set; }

    /// <summary>
    /// 失効日時
    /// </summary>
    public DateTimeOffset? RevokedAt { get; set; }

    /// <summary>
    /// Family
    /// </summary>
    public Family? Family { get; set; }
}
