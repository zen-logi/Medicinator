using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Medicinator.Api.Authentication;

/// <summary>
/// ローカル開発専用の認証ハンドラー
/// </summary>
public sealed class DevelopmentAuthenticationHandler(
    IOptionsMonitor<DevelopmentAuthenticationOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<DevelopmentAuthenticationOptions>(options, logger, encoder)
{
    /// <summary>
    /// スキーム名
    /// </summary>
    public const string SchemeName = "Development";

    /// <inheritdoc />
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var uid = Request.Headers.TryGetValue("X-Development-User", out var value)
            ? value.ToString()
            : "local-user";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, uid),
            new Claim("user_id", uid),
            new Claim(ClaimTypes.Email, $"{uid}@local.test")
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

/// <summary>
/// ローカル開発専用認証のオプション
/// </summary>
public sealed class DevelopmentAuthenticationOptions : AuthenticationSchemeOptions;
