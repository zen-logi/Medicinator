using Medicinator.Api.Authentication;
using Medicinator.Api.Dtos;
using Medicinator.Api.Security;
using Medicinator.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Medicinator.Api.Controllers;

/// <summary>
/// 服薬記録API
/// </summary>
[ApiController]
[Authorize(Policy = AuthorizationPolicies.FamilyMember)]
[Route("api/families/{familyId:guid}/intakes")]
public sealed class MedicationIntakesController(IMedicationIntakeService medicationIntakeService) : ControllerBase
{
    /// <summary>
    /// 服薬記録一覧を取得
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MedicationIntakeResponse>>> GetIntakes(Guid familyId, [FromQuery] DateOnly? day, CancellationToken cancellationToken)
    {
        return Ok(await medicationIntakeService.GetIntakesAsync(User.GetFirebaseUid(), familyId, day, cancellationToken));
    }

    /// <summary>
    /// 服薬記録を作成
    /// </summary>
    [HttpPost]
    [EnableRateLimiting(RateLimitingPolicies.SensitiveMutation)]
    public async Task<ActionResult<MedicationIntakeResponse>> CreateIntake(Guid familyId, CreateMedicationIntakeRequest request, CancellationToken cancellationToken)
    {
        var response = await medicationIntakeService.CreateIntakeAsync(User.GetFirebaseUid(), familyId, request, cancellationToken);
        return CreatedAtAction(nameof(GetIntakes), new { familyId }, response);
    }

    /// <summary>
    /// 服薬記録を削除
    /// </summary>
    [HttpDelete]
    [EnableRateLimiting(RateLimitingPolicies.SensitiveMutation)]
    public async Task<IActionResult> DeleteIntake(Guid familyId, [FromQuery] DeleteMedicationIntakeRequest request, CancellationToken cancellationToken)
    {
        await medicationIntakeService.DeleteIntakeAsync(User.GetFirebaseUid(), familyId, request, cancellationToken);
        return NoContent();
    }
}
