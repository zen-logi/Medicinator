namespace Medicinator.Api.Middleware;

/// <summary>
/// APIレスポンスへセキュリティヘッダーを付与するミドルウェア
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    /// <summary>
    /// リクエストを処理
    /// </summary>
    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;
        headers.TryAdd("X-Content-Type-Options", "nosniff");
        headers.TryAdd("Referrer-Policy", "no-referrer");
        headers.TryAdd("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
        headers.TryAdd("X-Frame-Options", "DENY");

        await next(context);
    }
}
