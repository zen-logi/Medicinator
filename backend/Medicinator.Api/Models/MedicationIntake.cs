namespace Medicinator.Api.Models;

/// <summary>
/// 服薬記録
/// </summary>
public sealed class MedicationIntake
{
    /// <summary>
    /// 服薬記録ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Family ID
    /// </summary>
    public Guid FamilyId { get; set; }

    /// <summary>
    /// 人ID
    /// </summary>
    public Guid PersonId { get; set; }

    /// <summary>
    /// 薬ID
    /// </summary>
    public Guid MedicineId { get; set; }

    /// <summary>
    /// 飲んだ日時
    /// </summary>
    public DateTimeOffset TakenAt { get; set; }

    /// <summary>
    /// 服用タイミング名
    /// </summary>
    public required string TimingName { get; set; }

    /// <summary>
    /// メモ
    /// </summary>
    public string? Note { get; set; }

    /// <summary>
    /// 記録作成者Firebase UID
    /// </summary>
    public required string RecordedByFirebaseUid { get; set; }

    /// <summary>
    /// 作成日時
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// 人
    /// </summary>
    public Person? Person { get; set; }

    /// <summary>
    /// 薬
    /// </summary>
    public Medicine? Medicine { get; set; }
}
