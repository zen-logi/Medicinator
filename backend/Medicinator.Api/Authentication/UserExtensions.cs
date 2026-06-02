using System.Security.Claims;

namespace Medicinator.Api.Authentication;

/// <summary>
/// 認証ユーザー取得拡張
/// </summary>
public static class UserExtensions
{
    /// <summary>
    /// Firebase UIDを取得
    /// </summary>
    public static string GetFirebaseUid(this ClaimsPrincipal user)
    {
        return user.FindFirstValue("user_id")
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("認証ユーザーIDが取得できない");
    }
}
