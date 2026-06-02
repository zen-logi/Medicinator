FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY backend/Medicinator.Api/Medicinator.Api.csproj backend/Medicinator.Api/
RUN dotnet restore backend/Medicinator.Api/Medicinator.Api.csproj

COPY backend/Medicinator.Api/ backend/Medicinator.Api/
RUN dotnet publish backend/Medicinator.Api/Medicinator.Api.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system medicinator \
    && useradd --system --gid medicinator --home-dir /app --shell /usr/sbin/nologin medicinator \
    && mkdir -p /data \
    && chown -R medicinator:medicinator /app /data

COPY --from=build /app/publish .
RUN chown -R medicinator:medicinator /app
EXPOSE 8080

USER medicinator
ENTRYPOINT ["dotnet", "Medicinator.Api.dll"]
