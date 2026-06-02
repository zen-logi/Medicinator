using Microsoft.AspNetCore.Mvc;

namespace Medicinator.Api.Middleware;

/// <summary>
/// 例外をProblemDetailsへ変換するミドルウェア
/// </summary>
public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    /// <summary>
    /// リクエストを処理
    /// </summary>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            await WriteProblemDetailsAsync(context, exception);
        }
    }

    /// <summary>
    /// 例外に対応するProblemDetailsを書き込む
    /// </summary>
    private async Task WriteProblemDetailsAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title) = exception switch
        {
            ArgumentException => (StatusCodes.Status400BadRequest, "入力値が不正"),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "対象が見つからない"),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "操作権限がない"),
            InvalidOperationException => (StatusCodes.Status409Conflict, "現在の状態では操作できない"),
            _ => (StatusCodes.Status500InternalServerError, "サーバーエラー")
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Unhandled exception occurred");
        }
        else
        {
            logger.LogWarning(exception, "Handled application exception occurred");
        }

        if (context.Response.HasStarted)
        {
            throw exception;
        }

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = title
        };

        await context.Response.WriteAsJsonAsync(problem);
    }
}
