namespace Medicinator.Api.Authentication;

/// <summary>
/// 認可ポリシー名
/// </summary>
public static class AuthorizationPolicies
{
    /// <summary>
    /// Familyメンバーのみ許可
    /// </summary>
    public const string FamilyMember = "FamilyMember";
}
