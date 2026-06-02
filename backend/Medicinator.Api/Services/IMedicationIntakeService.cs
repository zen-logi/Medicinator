using Medicinator.Api.Dtos;

namespace Medicinator.Api.Services;

/// <summary>
/// 服薬記録サービス
/// </summary>
public interface IMedicationIntakeService
{
    /// <summary>
    /// 服薬記録一覧を取得
    /// </summary>
    Task<IReadOnlyList<MedicationIntakeResponse>> GetIntakesAsync(string firebaseUid, Guid familyId, DateOnly? day, CancellationToken cancellationToken);

    /// <summary>
    /// 服薬記録を作成
    /// </summary>
    Task<MedicationIntakeResponse> CreateIntakeAsync(string firebaseUid, Guid familyId, CreateMedicationIntakeRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// 服薬記録を削除
    /// </summary>
    Task DeleteIntakeAsync(string firebaseUid, Guid familyId, DeleteMedicationIntakeRequest request, CancellationToken cancellationToken);
}
