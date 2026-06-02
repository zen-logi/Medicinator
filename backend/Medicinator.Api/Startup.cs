using System.Threading.RateLimiting;
using Medicinator.Api.Authentication;
using Medicinator.Api.Data;
using Medicinator.Api.Health;
using Medicinator.Api.Middleware;
using Medicinator.Api.Options;
using Medicinator.Api.Security;
using Medicinator.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Medicinator.Api;

/// <summary>
/// アプリケーション起動構成
/// </summary>
public sealed class Startup(IConfiguration configuration, IWebHostEnvironment environment)
{
    /// <summary>
    /// DIサービスを登録
    /// </summary>
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddControllers();
        services.AddOpenApi();
        services.AddEndpointsApiExplorer();
        services.AddHsts(options =>
        {
            options.Preload = true;
            options.IncludeSubDomains = true;
            options.MaxAge = TimeSpan.FromDays(180);
        });

        services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.SectionName));
        services.Configure<CorsOptions>(configuration.GetSection(CorsOptions.SectionName));
        services.Configure<DatabaseOptions>(configuration.GetSection(DatabaseOptions.SectionName));

        services.AddDbContext<MedicinatorDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? "Data Source=medicinator.db";
            options.UseSqlite(connectionString);
        });

        ConfigureAuthentication(services);
        ConfigureRateLimiting(services);

        services.AddAuthorizationBuilder()
            .AddPolicy(AuthorizationPolicies.FamilyMember, policy => policy.RequireAuthenticatedUser());

        services.AddCors(options =>
        {
            var cors = configuration.GetSection(CorsOptions.SectionName).Get<CorsOptions>() ?? new CorsOptions();
            options.AddPolicy(CorsOptions.PolicyName, policy =>
            {
                if (cors.AllowedOrigins.Length == 0)
                {
                    policy.AllowAnyOrigin();
                }
                else
                {
                    policy.WithOrigins(cors.AllowedOrigins);
                }

                policy.AllowAnyHeader().AllowAnyMethod();
            });
        });

        services.AddScoped<IFamilyService, FamilyService>();
        services.AddScoped<IPersonService, PersonService>();
        services.AddScoped<IMedicineService, MedicineService>();
        services.AddScoped<IMedicationIntakeService, MedicationIntakeService>();
        services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database");
    }

    /// <summary>
    /// HTTPパイプラインを構成
    /// </summary>
    public void Configure(WebApplication app)
    {
        if (environment.IsDevelopment())
        {
            app.MapOpenApi();
        }
        else
        {
            app.UseHsts();
        }

        if (environment.IsDevelopment() || ShouldApplyMigrationsOnStartup())
        {
            ApplyMigrations(app);
        }

        app.UseMiddleware<ExceptionHandlingMiddleware>();
        app.UseMiddleware<SecurityHeadersMiddleware>();
        app.UseHttpsRedirection();
        app.UseCors(CorsOptions.PolicyName);
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseRateLimiter();
        app.MapHealthChecks("/health");
        app.MapControllers();
    }

    /// <summary>
    /// DBへMigrationを適用
    /// </summary>
    private static void ApplyMigrations(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<MedicinatorDbContext>();
        dbContext.Database.Migrate();
    }

    /// <summary>
    /// 起動時Migration適用を判定
    /// </summary>
    private bool ShouldApplyMigrationsOnStartup()
    {
        var database = configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
        return database.ApplyMigrationsOnStartup;
    }

    /// <summary>
    /// Firebase JWTまたは開発用認証を構成
    /// </summary>
    private void ConfigureAuthentication(IServiceCollection services)
    {
        var auth = configuration.GetSection(AuthOptions.SectionName).Get<AuthOptions>() ?? new AuthOptions();
        var useDevelopmentBypass = environment.IsDevelopment() && auth.AllowDevelopmentBypass;

        if (useDevelopmentBypass)
        {
            services.AddAuthentication(DevelopmentAuthenticationHandler.SchemeName)
                .AddScheme<DevelopmentAuthenticationOptions, DevelopmentAuthenticationHandler>(
                    DevelopmentAuthenticationHandler.SchemeName,
                    _ => { });
            return;
        }

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = $"https://securetoken.google.com/{auth.FirebaseProjectId}";
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = $"https://securetoken.google.com/{auth.FirebaseProjectId}",
                    ValidateAudience = true,
                    ValidAudience = auth.FirebaseProjectId,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    NameClaimType = "user_id"
                };

                options.Events = new JwtBearerEvents();
            });
    }

    /// <summary>
    /// レート制限を構成
    /// </summary>
    private static void ConfigureRateLimiting(IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    GetRateLimitPartitionKey(context),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 180,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    }));

            options.AddPolicy(RateLimitingPolicies.SensitiveMutation, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    GetRateLimitPartitionKey(context),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    }));
        });
    }

    /// <summary>
    /// レート制限の分割キーを取得
    /// </summary>
    private static string GetRateLimitPartitionKey(HttpContext context)
    {
        return context.User.Identity?.Name
            ?? context.Connection.RemoteIpAddress?.ToString()
            ?? "anonymous";
    }
}
