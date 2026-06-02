namespace Medicinator.Api.Options;

/// <summary>
/// CORS設定
/// </summary>
public sealed class CorsOptions
{
    /// <summary>
    /// 設定セクション名
    /// </summary>
    public const string SectionName = "Cors";

    /// <summary>
    /// CORSポリシー名
    /// </summary>
    public const string PolicyName = "Frontend";

    /// <summary>
    /// 許可するオリジン
    /// </summary>
    public string[] AllowedOrigins { get; init; } = [];
}
