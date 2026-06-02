using Medicinator.Api.Authentication;
using Medicinator.Api.Dtos;
using Medicinator.Api.Security;
using Medicinator.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Medicinator.Api.Controllers;

/// <summary>
/// Family API
/// </summary>
[ApiController]
[Authorize]
[Route("api/families")]
public sealed class FamiliesController(IFamilyService familyService) : ControllerBase
{
    /// <summary>
    /// Family一覧を取得
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FamilyResponse>>> GetFamilies(CancellationToken cancellationToken)
    {
        return Ok(await familyService.GetFamiliesAsync(User.GetFirebaseUid(), cancellationToken));
    }

    /// <summary>
    /// Familyを作成
    /// </summary>
    [HttpPost]
    [EnableRateLimiting(RateLimitingPolicies.SensitiveMutation)]
    public async Task<ActionResult<FamilyResponse>> CreateFamily(CreateFamilyRequest request, CancellationToken cancellationToken)
    {
        var response = await familyService.CreateFamilyAsync(User.GetFirebaseUid(), request, cancellationToken);
        return CreatedAtAction(nameof(GetFamilies), new { id = response.Id }, response);
    }

    /// <summary>
    /// Family招待一覧を取得
    /// </summary>
    [HttpGet("{familyId:guid}/invites")]
    public async Task<ActionResult<IReadOnlyList<FamilyInviteResponse>>> GetInvites(Guid familyId, CancellationToken cancellationToken)
    {
        return Ok(await familyService.GetInvitesAsync(User.GetFirebaseUid(), familyId, cancellationToken));
    }

    /// <summary>
    /// Family招待を作成
    /// </summary>
    [HttpPost("{familyId:guid}/invites")]
    [EnableRateLimiting(RateLimitingPolicies.SensitiveMutation)]
    public async Task<ActionResult<CreatedFamilyInviteResponse>> CreateInvite(Guid familyId, CancellationToken cancellationToken)
    {
        var response = await familyService.CreateInviteAsync(User.GetFirebaseUid(), familyId, cancellationToken);
        return CreatedAtAction(nameof(GetInvites), new { familyId }, response);
    }

    /// <summary>
    /// Family招待を失効
    /// </summary>
    [HttpDelete("{familyId:guid}/invites/{inviteId:guid}")]
    [EnableRateLimiting(RateLimitingPolicies.SensitiveMutation)]
    public async Task<IActionResult> RevokeInvite(Guid familyId, Guid inviteId, CancellationToken cancellationToken)
    {
        await familyService.RevokeInviteAsync(User.GetFirebaseUid(), familyId, inviteId, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// 招待コードでFamilyへ参加
    /// </summary>
    [HttpPost("join")]
    [EnableRateLimiting(RateLimitingPolicies.SensitiveMutation)]
    public async Task<ActionResult<FamilyResponse>> JoinFamily(JoinFamilyRequest request, CancellationToken cancellationToken)
    {
        return Ok(await familyService.JoinFamilyAsync(User.GetFirebaseUid(), request, cancellationToken));
    }
}
