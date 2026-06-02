using Medicinator.Api.Dtos;

namespace Medicinator.Api.Services;

/// <summary>
/// 薬サービス
/// </summary>
public interface IMedicineService
{
    /// <summary>
    /// 薬一覧を取得
    /// </summary>
    Task<IReadOnlyList<MedicineResponse>> GetMedicinesAsync(string firebaseUid, Guid familyId, CancellationToken cancellationToken);

    /// <summary>
    /// 薬を作成
    /// </summary>
    Task<MedicineResponse> CreateMedicineAsync(string firebaseUid, Guid familyId, CreateMedicineRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// 薬を更新
    /// </summary>
    Task<MedicineResponse> UpdateMedicineAsync(string firebaseUid, Guid familyId, Guid medicineId, UpdateMedicineRequest request, CancellationToken cancellationToken);
}
