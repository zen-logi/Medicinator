# AGENTS.md

このリポジトリは複数の作業者が並行して編集する可能性があります。ユーザーから割り当てられた担当範囲を守り、無関係な変更や他者の変更を戻さないでください。

## 必須参照

すべての作業者は、以下のリポジトリ規約に従ってください。

- [実装規約](.agents/implementation.md)
- [コメント規約](.agents/comments.md)
- [アーキテクチャ規約](.agents/architecture.md)

## リポジトリ構成

- `backend/Medicinator.Api`: ASP.NET Core API
- `backend/Medicinator.Api.Tests`: バックエンドテスト
- `frontend/medicinator-web`: Web フロントエンド
- `deploy`: デプロイ、インフラ、ランタイム設定例
- `.agents`: 自律作業者向けのリポジトリ規約

## 一時ファイル

一時ファイル、作業用出力、生成途中の成果物、ダウンロードしたアーティファクトは `D:\tmp` に置いてください。可能な限り C ドライブへの配置は避けてください。

## シークレット

シークレットはコミットしないでください。コミットしてよいのは `.env.example` のようなプレースホルダー値を含む設定例だけです。
