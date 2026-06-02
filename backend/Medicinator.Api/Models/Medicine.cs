namespace Medicinator.Api.Models;

/// <summary>
/// 薬マスタ
/// </summary>
public sealed class Medicine
{
    /// <summary>
    /// 薬ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Family ID
    /// </summary>
    public Guid FamilyId { get; set; }

    /// <summary>
    /// 飲む人ID
    /// </summary>
    public Guid PersonId { get; set; }

    /// <summary>
    /// 薬名
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// 用量表記
    /// </summary>
    public required string DosageLabel { get; set; }

    /// <summary>
    /// 服用用法
    /// </summary>
    public required string Usage { get; set; }

    /// <summary>
    /// 服用開始日
    /// </summary>
    public DateOnly StartsOn { get; set; }

    /// <summary>
    /// 服用終了日
    /// </summary>
    public DateOnly? EndsOn { get; set; }

    /// <summary>
    /// 作成日時
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// Family
    /// </summary>
    public Family? Family { get; set; }

    /// <summary>
    /// 飲む人
    /// </summary>
    public Person? Person { get; set; }

    /// <summary>
    /// 服用タイミング
    /// </summary>
    public List<MedicineScheduleTiming> ScheduleTimings { get; set; } = [];
}
