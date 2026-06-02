namespace Medicinator.Api.Models;

/// <summary>
/// 薬を飲む人
/// </summary>
public sealed class Person
{
    /// <summary>
    /// 人ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Family ID
    /// </summary>
    public Guid FamilyId { get; set; }

    /// <summary>
    /// 表示名
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// メモ
    /// </summary>
    public string? Note { get; set; }

    /// <summary>
    /// 作成日時
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// Family
    /// </summary>
    public Family? Family { get; set; }
}
