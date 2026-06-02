# Medicinator デプロイ手順

この手順は、フロントエンドを Cloudflare Pages、バックエンド API を GCP Compute Engine の小さな VM 上の Docker Compose で動かす構成を前提にします。

## 必要なもの

### アカウント

- GitHub
- Cloudflare
- Google Cloud
- Firebase

### ドメイン

- `app.example.com`: フロントエンド
- `api.example.com`: バックエンド API

Cloudflare で DNS を管理する前提です。独自ドメインがない場合は、最初は Cloudflare Pages の `*.pages.dev` と VM の一時ドメインまたは IP で検証できます。

### ローカルまたは管理端末

- Git
- Docker
- SSH クライアント
- Google Cloud CLI
- Node.js / Corepack
- .NET SDK 10

## Firebase Auth

1. Firebase プロジェクトを作成
2. Authentication を有効化
3. Sign-in provider を有効化
   - Google
   - Email/Password
4. Web アプリを追加
5. Firebase Web Config を控える
6. Authorized domains に以下を追加
   - `app.example.com`
   - Cloudflare Pages の `*.pages.dev`
   - ローカル確認用に `localhost`

バックエンドは `FIREBASE_PROJECT_ID` だけを使って Firebase ID token を検証します。サービスアカウントキーは不要です。

## Cloudflare Pages

GitHub Actions から Wrangler で Direct Upload します。

1. Cloudflare で Pages project を作成
2. Production branch は `main` にする
3. Cloudflare API Token を作成
   - Cloudflare Pages へ deploy できる権限
4. GitHub repository variables を設定
5. GitHub repository secrets を設定

Repository variables:

```text
CLOUDFLARE_PAGES_PROJECT_NAME=medicinator
VITE_API_BASE_URL=https://api.example.com
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
```

Repository secrets:

```text
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
```

自動デプロイ workflow:

- `.github/workflows/deploy-frontend.yml`
- `main` に push するとフロントエンドを build し、Cloudflare Pages に deploy
- 手動実行も可能

## GCP VM

### VM 作成

最小構成:

- Machine type: `e2-micro`
- OS: Ubuntu LTS
- Region: Google Cloud Free Tier 対象リージョン
- Disk: 標準永続ディスク
- Firewall: SSH と API 公開に必要なポートだけ許可

API は VM の `80` 番ポートで受け、コンテナ内の ASP.NET Core API `8080` 番ポートへ転送します。Cloudflare DNS の proxy を有効にし、VM firewall は SSH と HTTP だけを開けます。

### VM 初期設定

VM に SSH して Docker を入れます。

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git rsync
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

一度ログアウトして再ログインします。

配置先を作成します。

```bash
sudo mkdir -p /opt/medicinator
sudo chown -R "$USER":"$USER" /opt/medicinator
```

最初だけ GitHub Actions が使う SSH 公開鍵を VM の `~/.ssh/authorized_keys` に追加します。

### VM の環境ファイル

VM 上に `/opt/medicinator/deploy/.env` を作成します。これは GitHub Actions の rsync 対象から除外されるため、VM 側に残ります。

```bash
mkdir -p /opt/medicinator/deploy
nano /opt/medicinator/deploy/.env
```

内容例:

```text
MEDICINATOR_API_HOST=api.example.com
MEDICINATOR_FRONTEND_ORIGIN=https://app.example.com

ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080

FIREBASE_PROJECT_ID=your-firebase-project-id

MEDICINATOR_DB_CONNECTION=Data Source=/data/medicinator.db
MEDICINATOR_APPLY_MIGRATIONS_ON_STARTUP=true
```

`MEDICINATOR_APPLY_MIGRATIONS_ON_STARTUP=true` は、単一 VM + SQLite の初期運用を簡単にするための設定です。将来、複数台構成や手動 migration 運用へ移す場合は `false` にしてください。

### 初回手動起動

GitHub Actions を使う前に、手動で一度起動確認する場合:

```bash
cd /opt/medicinator
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
curl -fsS http://localhost/health
```

## Backend 自動デプロイ

GitHub Actions が以下を行います。

1. `dotnet test`
2. VM に rsync でソースを転送
3. VM 上で `docker compose up -d --build --remove-orphans`
4. 古い Docker image を prune

自動デプロイ workflow:

- `.github/workflows/deploy-backend.yml`
- `main` に push すると backend/deploy 変更時に実行
- 手動実行も可能

Repository variables:

```text
PRODUCTION_DEPLOY_PATH=/opt/medicinator
```

Repository secrets:

```text
PRODUCTION_SSH_HOST=xxx.xxx.xxx.xxx
PRODUCTION_SSH_PORT=22
PRODUCTION_SSH_USER=ubuntu
PRODUCTION_SSH_PRIVATE_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

## Cloudflare DNS

推奨:

- `app.example.com`: Cloudflare Pages の custom domain
- `api.example.com`: VM の外部 IP へ proxy 有効の DNS record

API は Firebase ID token を検証し、CORS は `MEDICINATOR_FRONTEND_ORIGIN` だけを許可します。フロントエンドの実ドメインと `.env` の値を必ず一致させてください。

## 動作確認

フロント:

```text
https://app.example.com
```

API:

```bash
curl -fsS https://api.example.com/health
```

ログ:

```bash
cd /opt/medicinator
docker compose --env-file deploy/.env -f deploy/docker-compose.yml logs -f api
```

DB は Docker named volume `medicinator-data` の `/data/medicinator.db` に保存されます。volume を削除しない限り、コンテナを作り直しても DB ファイルは残ります。
