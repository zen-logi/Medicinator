using Medicinator.Api.Authentication;
using Medicinator.Api.Dtos;
using Medicinator.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Medicinator.Api.Controllers;

/// <summary>
/// 自分の情報API
/// </summary>
[ApiController]
[Authorize]
[Route("api/me")]
public sealed class MeController(IFamilyService familyService) : ControllerBase
{
    /// <summary>
    /// 自分の情報を取得
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<MeResponse>> GetMe(CancellationToken cancellationToken)
    {
        var firebaseUid = User.GetFirebaseUid();
        var families = await familyService.GetFamiliesAsync(firebaseUid, cancellationToken);
        return Ok(new MeResponse(firebaseUid, families));
    }
}
