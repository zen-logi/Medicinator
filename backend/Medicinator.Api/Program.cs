using Medicinator.Api;

var builder = WebApplication.CreateBuilder(args);
var startup = new Startup(builder.Configuration, builder.Environment);

startup.ConfigureServices(builder.Services);

var app = builder.Build();
startup.Configure(app);

app.Run();

/// <summary>
/// テストホスト用Program部分クラス
/// </summary>
public partial class Program
{
}
