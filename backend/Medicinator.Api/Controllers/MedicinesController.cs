using Medicinator.Api.Authentication;
using Medicinator.Api.Dtos;
using Medicinator.Api.Security;
using Medicinator.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Medicinator.Api.Controllers;

/// <summary>
/// 薬API
/// </summary>
[ApiController]
[Authorize(Policy = AuthorizationPolicies.FamilyMember)]
[Route("api/families/{familyId:guid}/medicines")]
public sealed class MedicinesController(IMedicineService medicineService) : ControllerBase
{
    /// <summary>
    /// 薬一覧を取得
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MedicineResponse>>> GetMedicines(Guid familyId, CancellationToken cancellationToken)
    {
        return Ok(await medicineService.GetMedicinesAsync(User.GetFirebaseUid(), familyId, cancellationToken));
    }

    /// <summary>
    /// 薬を作成
    /// </summary>
    [HttpPost]
    [EnableRateLimiting(RateLimitingPolicies.SensitiveMutation)]
    public async Task<ActionResult<MedicineResponse>> CreateMedicine(Guid familyId, CreateMedicineRequest request, CancellationToken cancellationToken)
    {
        var response = await medicineService.CreateMedicineAsync(User.GetFirebaseUid(), familyId, request, cancellationToken);
        return CreatedAtAction(nameof(GetMedicines), new { familyId }, response);
    }

    /// <summary>
    /// 薬を更新
    /// </summary>
    [HttpPut("{medicineId:guid}")]
    [EnableRateLimiting(RateLimitingPolicies.SensitiveMutation)]
    public async Task<ActionResult<MedicineResponse>> UpdateMedicine(Guid familyId, Guid medicineId, UpdateMedicineRequest request, CancellationToken cancellationToken)
    {
        return Ok(await medicineService.UpdateMedicineAsync(User.GetFirebaseUid(), familyId, medicineId, request, cancellationToken));
    }
}
