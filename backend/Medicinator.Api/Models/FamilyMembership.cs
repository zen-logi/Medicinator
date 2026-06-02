namespace Medicinator.Api.Models;

/// <summary>
/// Family所属
/// </summary>
public sealed class FamilyMembership
{
    /// <summary>
    /// 所属ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Family ID
    /// </summary>
    public Guid FamilyId { get; set; }

    /// <summary>
    /// Firebase UID
    /// </summary>
    public required string FirebaseUid { get; set; }

    /// <summary>
    /// 表示名
    /// </summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// ロール
    /// </summary>
    public FamilyRole Role { get; set; }

    /// <summary>
    /// 参加日時
    /// </summary>
    public DateTimeOffset JoinedAt { get; set; }

    /// <summary>
    /// Family
    /// </summary>
    public Family? Family { get; set; }
}
