# Medicinator デプロイ手順

この手順は、フロントエンドを Cloudflare Pages、バックエンド API を Cloudflare Workers、データベースを Cloudflare D1 で動かす構成を前提にする。

## 必要なもの

### アカウント

- GitHub
- Cloudflare
- Firebase

### ドメイン

- `app.example.com`: フロントエンド
- `api.example.com`: バックエンド API

Cloudflare で DNS を管理する前提です。独自ドメインがない場合は、最初は Cloudflare Pages の `*.pages.dev` と Workers の `*.workers.dev` で検証できます。

### ローカルまたは管理端末

- Git
- Node.js / Corepack
- .NET SDK 10
- Wrangler

Wrangler はプロジェクトローカルで実行する。

```bash
corepack enable
corepack pnpm dlx wrangler --version
corepack pnpm dlx wrangler login
```

一時的な SQL、ログ、作業出力を作る場合は `D:\tmp` 配下を使う。

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

Workers API は Firebase プロジェクト ID を環境変数 `FIREBASE_PROJECT_ID` として受け取り、Firebase ID token を検証する。サービスアカウントキーは不要。フロントエンドへ渡す Firebase Web Config は公開前提の値だが、Cloudflare API Token や署名鍵などの秘密値は secrets に入れる。

Frontend repository variables:

```text
VITE_API_BASE_URL=https://api.example.com
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
```

Workers runtime variables:

```text
FIREBASE_PROJECT_ID=your-firebase-project-id
FRONTEND_ORIGIN=https://app.example.com
AUTH_DEV_BYPASS=false
```

## Cloudflare Pages

フロントエンドは Cloudflare Pages の Git 連携で自動デプロイする。GitHub Actions から Pages へアップロードする workflow は使わない。

Cloudflare Pages の Build settings:

```text
Framework preset: Vite
Root directory: frontend/medicinator-web
Build command: corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm build
Build output directory: dist
```

Cloudflare Pages environment variables:

```text
VITE_API_BASE_URL=https://api.example.com
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
```

Cloudflare Pages の pnpm build scripts 制御で失敗する場合は、Build command を以下にする。

```text
corepack enable && corepack pnpm install --frozen-lockfile --config.dangerouslyAllowAllBuilds=true && corepack pnpm build
```

## Cloudflare Workers + D1

ASP.NET Core API を Workers へそのままデプロイする構成ではない。Workers で動く API 実装を用意し、永続化先を SQLite ファイルから D1 へ移す。API の公開ドメインは `api.example.com`、CORS 許可元は `https://app.example.com` にそろえる。

### Worker 設定例

Worker project の `wrangler.toml` または `wrangler.jsonc` に D1 binding、環境変数、custom domain を設定する。以下は OSS 公開しても安全なプレースホルダー例です。

```toml
name = "medicinator-api"
main = "src/index.ts"
compatibility_date = "2026-06-01"

[vars]
AUTH_DEV_BYPASS = "false"

[[d1_databases]]
binding = "DB"
database_name = "medicinator"
database_id = "00000000-0000-0000-0000-000000000000"
migrations_dir = "migrations"

[[routes]]
pattern = "api.example.com"
custom_domain = true
```

preview や staging を使う場合は、production と別の D1 database を作り、`--env staging` 用の binding を分ける。PR preview が production D1 に接続しないようにする。

### D1 database 作成

```bash
corepack pnpm dlx wrangler d1 create medicinator
```

出力された `database_id` を `wrangler.toml` の `[[d1_databases]]` に反映する。`database_id` は秘密値ではないが、実プロジェクト固有値なので公開サンプルではプレースホルダーにする。

このリポジトリでは OSS 公開を前提に、`wrangler.toml` の `database_id` は placeholder のままにする。本番 deploy では GitHub Actions の `D1_DATABASE_ID` variable を `wrangler.toml` に一時差し込みする。

### D1 migrations

最初の migration を作る。

```bash
corepack pnpm dlx wrangler d1 migrations create medicinator initial_schema
```

生成された `migrations/*.sql` に schema を書く。ローカル D1 に適用して確認する。

```bash
corepack pnpm dlx wrangler d1 migrations apply medicinator --local
corepack pnpm dlx wrangler d1 execute medicinator --local --command "SELECT name FROM sqlite_master WHERE type = 'table';"
```

production D1 へ適用する。

```bash
corepack pnpm dlx wrangler d1 migrations apply medicinator --remote
```

migration は Worker deploy の前に適用する。破壊的変更は、旧 Worker と新 Worker の両方が動ける期間を作ってから段階的に行う。

### Worker deploy

```bash
corepack pnpm dlx wrangler deploy
```

環境を分ける場合:

```bash
corepack pnpm dlx wrangler d1 migrations apply medicinator --remote --env production
corepack pnpm dlx wrangler deploy --env production
```

### Secrets

通常の Medicinator API では Firebase Project ID と CORS origin だけでよく、サービスアカウントキーは置かない。秘密値が必要になった場合は `wrangler secret put` を使う。

```bash
corepack pnpm dlx wrangler secret put SOME_SECRET_NAME
```

ローカル開発だけの値は Worker project の `.dev.vars` に置く。`.dev.vars` はコミットしない。

```text
FIREBASE_PROJECT_ID=local-dev
FRONTEND_ORIGIN=http://localhost:5173
AUTH_DEV_BYPASS=true
```

## GitHub Actions

フロントエンドは Cloudflare Pages の Git 連携が自動で build/deploy する。リポジトリ内にフロントエンド用 deploy workflow は置かない。バックエンドは `.github/workflows/deploy-backend.yml` で D1 migrations を適用してから Worker を deploy する。

Backend repository variables:

```text
CLOUDFLARE_WORKER_DIRECTORY=workers/medicinator-api
D1_DATABASE_NAME=medicinator
D1_DATABASE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLOUDFLARE_WORKER_ENV=production
```

`CLOUDFLARE_WORKER_DIRECTORY` は `wrangler.toml`、`wrangler.jsonc`、または `wrangler.json` があるディレクトリを指す。`CLOUDFLARE_WORKER_ENV` は任意で、Wrangler の `env.production` などを使う場合だけ設定する。

`FIREBASE_PROJECT_ID` と `FRONTEND_ORIGIN` は workflow が `wrangler secret put` で Worker runtime に同期する。

```text
FIREBASE_PROJECT_ID=your-firebase-project-id
FRONTEND_ORIGIN=https://app.example.com
```

Backend repository secrets:

```text
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
```

Cloudflare API Token には、対象アカウントの Workers Scripts と D1 を更新できる最小権限を付与する。

## Cloudflare DNS

推奨:

- `app.example.com`: Cloudflare Pages の custom domain
- `api.example.com`: Cloudflare Workers の custom domain

Worker の custom domain は `wrangler.toml` の `routes` で管理できる。

```toml
[[routes]]
pattern = "api.example.com"
custom_domain = true
```

Cloudflare dashboard で管理する場合は、Workers の Domains & Routes から `api.example.com` を追加する。Cloudflare は Worker を origin として扱うため、外部 origin への CNAME は不要。

Cloudflare DNS の例:

```text
app.example.com  CNAME  <cloudflare-pages-project>.pages.dev  Proxied
api.example.com  Worker custom domain                         Proxied
```

API は Firebase ID token を検証し、CORS は `FRONTEND_ORIGIN=https://app.example.com` だけを許可するため、フロントエンドの実ドメイン、Pages の `VITE_API_BASE_URL`、Worker の runtime variable を一致させる。

## 動作確認

フロント:

```text
https://app.example.com
```

API:

```bash
curl -fsS https://api.example.com/health
```

D1 migration 状態:

```bash
corepack pnpm dlx wrangler d1 migrations list medicinator --remote
```

Worker ログ:

```bash
corepack pnpm dlx wrangler tail medicinator-api
```
