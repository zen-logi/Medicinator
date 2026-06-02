using Medicinator.Api.Data;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Medicinator.Api.Health;

/// <summary>
/// DB接続状態を確認するヘルスチェック
/// </summary>
public sealed class DatabaseHealthCheck(MedicinatorDbContext dbContext) : IHealthCheck
{
    /// <inheritdoc />
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);
        return canConnect
            ? HealthCheckResult.Healthy("DBへ接続可能")
            : HealthCheckResult.Unhealthy("DBへ接続不可");
    }
}
