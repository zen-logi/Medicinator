namespace Medicinator.Api.Dtos;

/// <summary>
/// 薬作成リクエスト
/// </summary>
public sealed record CreateMedicineRequest(
    Guid PersonId,
    string Name,
    string DosageLabel,
    string Usage,
    DateOnly StartsOn,
    DateOnly? EndsOn,
    IReadOnlyList<string> TimingNames);

/// <summary>
/// 薬更新リクエスト
/// </summary>
public sealed record UpdateMedicineRequest(
    Guid PersonId,
    string Name,
    string DosageLabel,
    string Usage,
    DateOnly StartsOn,
    DateOnly? EndsOn,
    IReadOnlyList<string> TimingNames);

/// <summary>
/// 薬レスポンス
/// </summary>
public sealed record MedicineResponse(
    Guid Id,
    Guid FamilyId,
    Guid PersonId,
    string Name,
    string DosageLabel,
    string Usage,
    DateOnly StartsOn,
    DateOnly? EndsOn,
    IReadOnlyList<string> TimingNames,
    DateTimeOffset CreatedAt);
