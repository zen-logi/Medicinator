namespace Medicinator.Api.Security;

/// <summary>
/// レート制限ポリシー名
/// </summary>
public static class RateLimitingPolicies
{
    /// <summary>
    /// 認証済みユーザー全体の基本制限
    /// </summary>
    public const string AuthenticatedUser = "AuthenticatedUser";

    /// <summary>
    /// 招待参加など試行回数を絞る制限
    /// </summary>
    public const string SensitiveMutation = "SensitiveMutation";
}
