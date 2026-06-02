using Medicinator.Api.Authentication;
using Medicinator.Api.Dtos;
using Medicinator.Api.Security;
using Medicinator.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Medicinator.Api.Controllers;

/// <summary>
/// 飲む人API
/// </summary>
[ApiController]
[Authorize(Policy = AuthorizationPolicies.FamilyMember)]
[Route("api/families/{familyId:guid}/people")]
public sealed class PeopleController(IPersonService personService) : ControllerBase
{
    /// <summary>
    /// 飲む人一覧を取得
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PersonResponse>>> GetPeople(Guid familyId, CancellationToken cancellationToken)
    {
        return Ok(await personService.GetPeopleAsync(User.GetFirebaseUid(), familyId, cancellationToken));
    }

    /// <summary>
    /// 飲む人を作成
    /// </summary>
    [HttpPost]
    [EnableRateLimiting(RateLimitingPolicies.SensitiveMutation)]
    public async Task<ActionResult<PersonResponse>> CreatePerson(Guid familyId, CreatePersonRequest request, CancellationToken cancellationToken)
    {
        var response = await personService.CreatePersonAsync(User.GetFirebaseUid(), familyId, request, cancellationToken);
        return CreatedAtAction(nameof(GetPeople), new { familyId }, response);
    }

    /// <summary>
    /// 飲む人を更新
    /// </summary>
    [HttpPut("{personId:guid}")]
    [EnableRateLimiting(RateLimitingPolicies.SensitiveMutation)]
    public async Task<ActionResult<PersonResponse>> UpdatePerson(Guid familyId, Guid personId, UpdatePersonRequest request, CancellationToken cancellationToken)
    {
        return Ok(await personService.UpdatePersonAsync(User.GetFirebaseUid(), familyId, personId, request, cancellationToken));
    }

    /// <summary>
    /// 飲む人を削除
    /// </summary>
    [HttpDelete("{personId:guid}")]
    [EnableRateLimiting(RateLimitingPolicies.SensitiveMutation)]
    public async Task<IActionResult> DeletePerson(Guid familyId, Guid personId, CancellationToken cancellationToken)
    {
        await personService.DeletePersonAsync(User.GetFirebaseUid(), familyId, personId, cancellationToken);
        return NoContent();
    }
}
