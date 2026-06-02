# アーキテクチャ規約

Medicinator はバックエンド、フロントエンド、デプロイ関心事に分けます。境界を明確にし、並行作業でも安全に開発できる状態を保ってください。

## バックエンド

- ASP.NET Core API は `backend/Medicinator.Api` に置く
- バックエンドテストは `backend/Medicinator.Api.Tests` に置く
- API 設定は環境変数で上書きできる形にする
- Firebase Auth を ID プロバイダーとし、保護された API では Firebase 発行の ID トークンを検証する
- フロントエンド固有の表示状態をバックエンドモデルへ入れない
- MVC + Service パターンを守る
- Service は必ず Interface を持ち、DI で利用する
- DI 登録とミドルウェア構成は `Startup.cs` に集約し、`Program.cs` は最小限にする

## フロントエンド

- Web アプリは `frontend/medicinator-web` に置く
- フロントエンドは Cloudflare Pages へデプロイできる成果物として扱う
- 公開 Firebase 設定と API エンドポイントはフロントエンド環境変数から読む
- バンドルされるフロントエンドコードにシークレットを埋め込まない
- package by feature を採用し、機能ごとに `features` 配下へ分割する
- UI はスマホと PC の両方で使いやすいレスポンシブ設計にする

## デプロイ

- デプロイ手順、設定例、Compose ファイルは `deploy` に置く
- VM ホストのバックエンドデプロイには Docker Compose を使う
- 初期の低コストバックエンドホストは GCP Always Free 対象の `e2-micro` VM を想定する
- 静的フロントエンド配信には Cloudflare Pages を使う
- パブリックルーティングには Cloudflare DNS/Proxy を使う
- サインインと ID 管理には Firebase Auth を使い、プロジェクト固有 ID は設定で差し替え可能にする

## 公開リポジトリの安全性

- ソース内の既定値は OSS として公開しても安全なものにする
- 設定例の値はプレースホルダーまたはローカル専用値にする
- シークレットは Git ではなく、実行環境の環境変数またはプラットフォームのシークレットストアへ置く
