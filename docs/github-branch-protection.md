# GitHub ブランチ保護

Medicinator は `develop` を開発統合ブランチ、`main` を本番反映ブランチとして扱う。

## ブランチ運用

```text
feature/* -> develop -> main
```

- 通常の作業ブランチは `develop` から作成する
- 通常の Pull Request は `develop` に向ける
- `main` への Pull Request は `develop` からのみ作成する
- `main` への push をきっかけに本番向け deploy が走る
- `develop` への push では本番 deploy しない

GitHub の UI だけでは「main への PR は develop からのみ」を完全には表現しづらいため、CI の `Branch Policy` job でも検証する。

## Repository Settings

`Settings` -> `General` -> `Pull Requests`:

- `Allow squash merging`: 有効
- `Allow merge commits`: 無効推奨
- `Allow rebase merging`: 任意
- `Automatically delete head branches`: 有効

`Settings` -> `Branches` -> `Default branch`:

- 通常作業を `develop` 起点にする場合、default branch は `develop` 推奨
- `main` を default branch のままにする場合、PR 作成時に base branch を必ず `develop` に変更する

## Ruleset: main

`Settings` -> `Rules` -> `Rulesets` で `main` 向けの branch ruleset を作成する。

推奨設定:

- Enforcement status: `Active`
- Target branches: `main`
- Restrict deletions: 有効
- Block force pushes: 有効
- Require a pull request before merging: 有効
- Required approvals: `1` 以上
- Dismiss stale pull request approvals when new commits are pushed: 有効
- Require review from Code Owners: 有効
- Require status checks to pass: 有効
- Require branches to be up to date before merging: 有効推奨
- Require deployments to succeed before merging: 任意

Required status checks:

```text
Branch Policy
Backend
Frontend Format
Frontend
Worker API
```

`main` への Pull Request は `Branch Policy` が `develop` 以外を拒否する。

## Ruleset: develop

`develop` 向けにも branch ruleset を作成する。

推奨設定:

- Enforcement status: `Active`
- Target branches: `develop`
- Restrict deletions: 有効
- Block force pushes: 有効
- Require a pull request before merging: 有効
- Required approvals: `1` 以上
- Dismiss stale pull request approvals when new commits are pushed: 有効
- Require review from Code Owners: 有効推奨
- Require status checks to pass: 有効

Required status checks:

```text
Branch Policy
Backend
Frontend Format
Frontend
Worker API
```

## Code Owners

`.github/CODEOWNERS` でリポジトリ全体の code owner を指定する。

```text
* @zen-logi
```

別のレビュワーや team を必須にする場合は、`@zen-logi` を対象のユーザーまたは team に置き換える。

## Production Environment

`.github/workflows/deploy-backend.yml` は `environment: production` を使う。

必要に応じて `Settings` -> `Environments` -> `production` で deployment reviewer を設定する。これにより、`main` への merge 後でも Cloudflare Workers への本番 deploy 前に承認を要求できる。
