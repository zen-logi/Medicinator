namespace Medicinator.Api.Models;

/// <summary>
/// 薬の服用タイミング
/// </summary>
public sealed class MedicineScheduleTiming
{
    /// <summary>
    /// 服用タイミングID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Family ID
    /// </summary>
    public Guid FamilyId { get; set; }

    /// <summary>
    /// 薬ID
    /// </summary>
    public Guid MedicineId { get; set; }

    /// <summary>
    /// タイミング名
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// 表示順
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// 薬
    /// </summary>
    public Medicine? Medicine { get; set; }
}
