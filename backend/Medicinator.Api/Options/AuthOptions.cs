namespace Medicinator.Api.Options;

/// <summary>
/// 認証設定
/// </summary>
public sealed class AuthOptions
{
    /// <summary>
    /// 設定セクション名
    /// </summary>
    public const string SectionName = "Auth";

    /// <summary>
    /// FirebaseプロジェクトID
    /// </summary>
    public string FirebaseProjectId { get; init; } = string.Empty;

    /// <summary>
    /// 開発用認証バイパスを許可するか
    /// </summary>
    public bool AllowDevelopmentBypass { get; init; }
}
