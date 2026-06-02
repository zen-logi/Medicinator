namespace Medicinator.Api.Models;

/// <summary>
/// Family内ロール
/// </summary>
public enum FamilyRole
{
    /// <summary>
    /// 所有者
    /// </summary>
    Owner = 1,

    /// <summary>
    /// 管理者
    /// </summary>
    Admin = 3,

    /// <summary>
    /// 一般メンバー
    /// </summary>
    Member = 2
}
