namespace Medicinator.Api.Dtos;

/// <summary>
/// 服薬記録作成リクエスト
/// </summary>
public sealed record CreateMedicationIntakeRequest(Guid PersonId, Guid MedicineId, DateTimeOffset TakenAt, string TimingName, string? Note);

/// <summary>
/// 服薬記録削除リクエスト
/// </summary>
public sealed record DeleteMedicationIntakeRequest(Guid PersonId, Guid MedicineId, DateOnly Day, string TimingName);

/// <summary>
/// 服薬記録レスポンス
/// </summary>
public sealed record MedicationIntakeResponse(
    Guid Id,
    Guid FamilyId,
    Guid PersonId,
    string PersonName,
    Guid MedicineId,
    string MedicineName,
    DateTimeOffset TakenAt,
    string TimingName,
    string? Note,
    string RecordedByFirebaseUid,
    DateTimeOffset CreatedAt);
