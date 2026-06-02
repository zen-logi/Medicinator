namespace Medicinator.Api.Models;

/// <summary>
/// 共有利用するFamily
/// </summary>
public sealed class Family
{
    /// <summary>
    /// Family ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// 表示名
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// 作成日時
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// メンバー
    /// </summary>
    public List<FamilyMembership> Memberships { get; set; } = [];

    /// <summary>
    /// 招待
    /// </summary>
    public List<FamilyInvite> Invites { get; set; } = [];
}
