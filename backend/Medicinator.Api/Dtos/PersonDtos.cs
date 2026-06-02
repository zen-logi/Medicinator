namespace Medicinator.Api.Dtos;

/// <summary>
/// 飲む人作成リクエスト
/// </summary>
public sealed record CreatePersonRequest(string Name, string? Note);

/// <summary>
/// 飲む人更新リクエスト
/// </summary>
public sealed record UpdatePersonRequest(string Name, string? Note);

/// <summary>
/// 飲む人レスポンス
/// </summary>
public sealed record PersonResponse(Guid Id, Guid FamilyId, string Name, string? Note, DateTimeOffset CreatedAt);
