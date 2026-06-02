using Medicinator.Api.Dtos;

namespace Medicinator.Api.Services;

/// <summary>
/// 飲む人サービス
/// </summary>
public interface IPersonService
{
    /// <summary>
    /// 飲む人一覧を取得
    /// </summary>
    Task<IReadOnlyList<PersonResponse>> GetPeopleAsync(string firebaseUid, Guid familyId, CancellationToken cancellationToken);

    /// <summary>
    /// 飲む人を作成
    /// </summary>
    Task<PersonResponse> CreatePersonAsync(string firebaseUid, Guid familyId, CreatePersonRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// 飲む人を更新
    /// </summary>
    Task<PersonResponse> UpdatePersonAsync(string firebaseUid, Guid familyId, Guid personId, UpdatePersonRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// 飲む人を削除
    /// </summary>
    Task DeletePersonAsync(string firebaseUid, Guid familyId, Guid personId, CancellationToken cancellationToken);
}
