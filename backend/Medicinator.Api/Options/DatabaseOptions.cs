namespace Medicinator.Api.Options;

/// <summary>
/// DB設定
/// </summary>
public sealed class DatabaseOptions
{
    /// <summary>
    /// 設定セクション名
    /// </summary>
    public const string SectionName = "Database";

    /// <summary>
    /// 起動時にMigrationを適用するか
    /// </summary>
    public bool ApplyMigrationsOnStartup { get; init; }
}
