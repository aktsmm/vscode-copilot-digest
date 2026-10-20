# 自動化運用メモ

このリポジトリの自動化は、日次収集レーン、Pages 公開レーン、Discord 通知レーン、GitHub Agentic Workflows（gh-aw）によるスライド・要約・点検レーンで構成しています。データ収集と本文更新を分離しつつ、最終的な Pages 公開までを GitHub Actions 側でつなぐのが基本方針です。

## 全体像

1. [collect-updates.yml](../.github/workflows/collect-updates.yml) が `npm run collect` を実行し、ソース収集の後に全期間の原文・公式資料を補完する
2. 変更があれば `data/**` と `summaries/**` を `github-actions[bot]` が commit する
3. collect workflow から [deploy-pages.yml](../.github/workflows/deploy-pages.yml) を workflow dispatch し、最新データで Pages を再生成する
4. スライド・要約・点検の agentic workflow が日本語の文面を書き、PR を作る。PR は merger が検証して自動 merge し、Pages を再デプロイする（下の「agentic workflow（gh-aw）のレーン」を参照）。日次本文（`summaries/daily`）と Discord 通知は、collect が `data/slides` と `data/summaries-ja.json` を読んで自動で良くなる

## 日次収集と通知

- [collect-updates.yml](../.github/workflows/collect-updates.yml) は毎日 06:30 / 14:30 / 22:30 JST 目安で実行する。GitHub Actions の schedule は高負荷時に遅延しうる
- Node.js 22 で `npm ci` と `npm run collect` を実行し、[data/events](../data/events) を毎日更新する。[summaries/daily](../summaries/daily) は公開済み更新または未来日付項目がある日だけ生成する
- 補完結果と証跡は [data/resources.json](../data/resources.json) に保存する。取得ページの `.cache/resource-pages` は Actions cache で引き継ぎ、新しい検出より古い原文キャッシュは再取得する
- 日本語の要約がまだ無い実在の記事は、捨てずに、原文の抜粋（先頭に「（原文の抜粋）」）付きで載せる。抜粋も無く定型文しか出せないものだけを、collector が保存前に除外し、`latestRun.skippedLowInformationEvents` に記録する（公開カードには定型文を出さない）
- 日付だけの見出し差分（`Oct.13 Release` など）は内容が無いので、読者向けカードにもスライド候補にも出さない。内容のある差分は「ページに追加された内容」として載せる
- 収集の後に `node scripts/backfill-skipped.mjs --coverage` が、フィードに出ているのに `data/events` に無い記事（過去に捨てたものを含む）を、記事ページから読み直して戻す。最後に `node scripts/coverage-report.mjs --strict` で漏れを確認し、残っていれば run を失敗させて知らせる（2 週間ごとの点検依頼でも確認する）
- **提供終了・廃止ページ**: `retirements.html`（英語版は `en/retirements.html`）は、提供終了・廃止・移行に関わる更新だけを新しい順に並べる。ヘッダーの「提供終了・廃止」から行ける。検索の対象には入れない（ハイライト一覧と重複するため）。ダウンロード欄の上のキーワード欄は、一覧の文字（スライドがある更新ではカードの文字）に対して絞り込み、種類（GA / Preview / 廃止 / アナウンス / 更新）はスライドの無い更新にも効く
- **About ページ**: `about.html`（英語版は `en/about.html`）は、サイトの目的、収集元（`config/sources.json`）、つくり方、ご利用にあたっての注意と、データの状態を出す。件数・収集期間・最終確認はビルド時に `data/` と静的 API の coverage から計算するので、手で更新しない。本文は `scripts/lib/about-page.mjs`
- **カードの具体性**: スライドがある更新のカードは、副題に加えて、スライドの `core` パネルの先頭 2〜4 項目（対象プラン、設定・手順、前提と制限など）を箇条書きで表示する。「〜を確認できる」で終わる変更点の文は、箇条書きがあれば出さない。書かれた要約（`data/summaries-ja.json`）も `points` を持てて、持たない既存分は次回の要約依頼で書き直しの対象に戻る（`current` に今の文面が付く）
- **スライドの作成ペース**: [slide-dispatch.yml](../.github/workflows/slide-dispatch.yml) が 1 日 4 回（各回最大 10 件）、スライドが無い更新を新しい順に選び、1 件ずつ agentic workflow（[slide.md](../.github/workflows/slide.md)）を起動する。スケジュールの遅れや runner の待ちで前後する。急ぐときは `slide-dispatch.yml` を手動で実行する（`ids` に ID、`limit` に件数）
- **日本語の題名**: スライドがある更新のカードは、スライドの日本語の題名（`title.ja`）を見出しにし、英語の原題は「原題」として小さく添える。書かれた要約（`data/summaries-ja.json`）も `title` を持てて、持たない既存分は次回の要約依頼で書き直しの対象に戻る。同じ記事のページの別の節（`#` 以降が違う URL）は、別の更新として扱う
- **一覧との連動**: ダウンロード欄の期間・種類・トピックは、その下の更新一覧にも効く（最初は過去 30 日）。スライドがある更新のカードには「スライドあり・保存対象」のチェックがあり、外すとその 1 件が JSON / PDF / PPTX から外れる（一覧側と「個別に選ぶ」側は同じ選択を共有する）。スライドが無い更新は、日付とトピックでだけ絞り込まれる
- **ダウンロードの選び方**: トップとハイライトのダウンロード欄は、期間・種類・トピックで絞り込んだうえで、「個別に選ぶ」から 1 件ずつ外せる（最初は全部が選択済み。「すべて選択」「すべて解除」あり）。JSON / PDF / PPTX は、選んだものだけを 1 つにまとめる
- **要約の流れ**: [summarize-dispatch.yml](../.github/workflows/summarize-dispatch.yml)（1 日 4 回）が、英語の抜粋のままになっている更新（スライドも要約も無いもの）があり、要約の PR が開いていないときだけ agentic workflow [summarize.md](../.github/workflows/summarize.md) を起動する。agent は最大 30 件の記事を開いて日本語の要約を [data/summaries-ja.json](../data/summaries-ja.json) に書き足す（手動実行も可）。カードの文面は、スライド → 要約 → 原文の抜粋の順で選ばれる。`tests/card-boilerplate.test.mjs` が、定型文や、多くのカードで繰り返される文を検出して失敗させる
- agentic workflow（gh-aw）のネットワーク許可は、各 `.md` の `network.allowed` に書く（code.visualstudio.com、github.blog、docs.github.com、learn.microsoft.com、www.publickey1.jp など）。取得元を足すときは `.md` を直し、`gh aw compile` で `.lock.yml` を作り直して一緒にコミットする。digest 用の執筆レーン（Copilot coding agent）だけは、リポジトリの Environment `copilot` の変数 `COPILOT_AGENT_FIREWALL_ALLOW_LIST_ADDITIONS` を使う
- 変更がなければ commit せず終了する
- 変更があった場合は `github-actions[bot]` が `data/**` と `summaries/**` を commit / push する
- collect の最後に [deploy-pages.yml](../.github/workflows/deploy-pages.yml) を dispatch して、push 起点 workflow の非連鎖を補う
- [notify-weekly-discord.yml](../.github/workflows/notify-weekly-discord.yml) は毎週水曜 06:00 JST 目安で実行し、直近 7 日分の週間要約を Discord Webhook へ送る
- [notify-important-discord.yml](../.github/workflows/notify-important-discord.yml) は毎日 07:30 JST 目安で、前日の GA・Preview・廃止の更新だけを最大 5 件、日本語の見出し・要約つきで 1 通にまとめて送る（無い日は送らない。日本語化を待つため前日分）。週次は日本語化済みの更新を最大 8 件（その週の全更新から選ぶ）。どちらも、まだ英語の抜粋のままの更新は含めない。通知はスライドと書かれた要約（サイトのカードと同じ文面）を使う。Webhook が失敗すると `Discord notification failed` の Issue を作る

## Pages 公開の仕組み

- Pages 用の HTML は [scripts/build-pages.mjs](../scripts/build-pages.mjs) で静的生成する
- 生成対象はトップページ、日本語 / 英語の日次詳細、週間詳細、ハイライト一覧、日次アーカイブ一覧、週間アーカイブ一覧、検索ページ、raw データ導線を含む
- 公開済み更新が 0 件の空日は Pages の日次詳細や日次アーカイブに含めず、最新公開日も直近の公開済み日次を基準にする
- トップページは最新 6 件のハイライトを表示し、全件一覧は 50 件ごとにページ分割する
- 日次・週間・ハイライト一覧は source / topic / importance フィルタと並び替えを持ち、選択状態を URL query に同期する
- Pages build は資料を再取得せず台帳を読む。HTML 生成後に Pagefind インデックスを作り、`finalize-search.mjs` が版付き bundle を配置する。両検索 UI は同じ版のインデックスを参照する
- カードと検索結果の「原文」「関連ドキュメント」は外部リンク、「掲載日のまとめを見る」は日次まとめの更新アンカーへのサイト内リンク。古い日次更新と、検索条件・言語切替後のアンカーも保持する
- 検索対象は `data-pagefind-body` を持つ公開ページだけで、日次・週間の詳細本文とハイライト一覧本文を対象にする
- 専用検索ページは source / topic facet、URL 同期、軽い query expansion、結果重複除去を持つ
- 検索 UI / index の詳細設計は [search-architecture.md](search-architecture.md) を参照する
- Pages のヘッダーに出す `最終更新` は最新の Pages 再生成時刻を表示する
- まれに live の Pages 配信が stale で、日本語 / 英語のどちらか片方だけ古い HTML を返すことがある。その場合は `site/**` と live ページを見比べ、必要なら [deploy-pages.yml](../.github/workflows/deploy-pages.yml) を手動 dispatch して再確認する

## agentic workflow（gh-aw）のレーンと、止まらないための仕組み

**認証と運用**: agentic workflow は Secret `COPILOT_GITHUB_TOKEN`（Copilot Requests 権限のみの fine-grained PAT。OAuth トークンは使えない）で動く。Copilot エンジンには web-fetch ツールが無いので、agent は [scripts/fetch-text.mjs](../scripts/fetch-text.mjs)（許可した host だけ取得）で記事を読む。agent は AWF の sandbox（secret なし、`network.allowed` の host のみ）で動くので、shell は制限していない。

スライド・要約・点検は、GitHub Agentic Workflows（gh-aw）で動く。`.github/workflows/*.md` が正本で、`gh aw compile` が `*.lock.yml` を作る（lock は手で編集しない）。モデルは `claude-sonnet-5.5` に固定している。認証は Secret `COPILOT_GITHUB_TOKEN`（Copilot Requests 権限のある個人トークン）。

| レーン | 起動 | 1 回の内容 | PR のタイトル |
|---|---|---|---|
| スライド [slide.md](../.github/workflows/slide.md) | [slide-dispatch.yml](../.github/workflows/slide-dispatch.yml) が 1 日 4 回、1 件ずつ起動 | 記事を読み `data/slides/{id}.json` を 1 枚書き（想定問答 `qa` を含む）、`npm run validate:slides` を通す | `slides: ...` |
| 要約 [summarize.md](../.github/workflows/summarize.md) | [summarize-dispatch.yml](../.github/workflows/summarize-dispatch.yml) が 1 日 4 回、未処理があるときだけ | 最大 30 件の要約を `data/summaries-ja.json` に書く | `summaries: ...` |
| 点検 [maintain.md](../.github/workflows/maintain.md) | 毎週月曜 04:00 JST が目安 | `scripts/health-report.mjs` の事実から原因を調べて直す | `maint: ...` |

- **読めない更新**: スライドの agent が記事を読めなかったときは、ファイルを作らず `Slide skip: {id}`（ラベル `slide-skip`）の Issue を作る。以後の依頼から外れる（再試行するには、その Issue を閉じてラベルを外す）。
- **merge**: [auto-merge-agent-prs.yml](../.github/workflows/auto-merge-agent-prs.yml)（毎時、各 agent の完了後）が [scripts/merge-agent-prs.mjs](../scripts/merge-agent-prs.mjs) を main のコードで実行する。内蔵トークンで作られた PR は `pull_request` の検証が走らないため、各 PR を main に merge した作業ブランチで検証してから squash merge する。許可範囲は、スライドが `data/slides/{16 桁の hex}.json` 1 件、要約が `data/summaries-ja.json` のみ、点検が `scripts/lib/maintenance-guard.mjs` の範囲内。範囲外や検証失敗は `needs-human-review` を付けて止める。merge した後は `deploy-pages.yml` を起動する。
- **点検の権限**: `scripts/` `tests/` `docs/` `config/` `data/slides/` `data/summaries-ja.json` `.github/workflows/*.yml`（lock と `.md` を除く）`.github/instructions/` `package*.json` の範囲に収まれば自動 merge する。レーンを制御するファイル（`auto-merge-agent-prs.yml`、`watchdog.yml`、`deploy-pages.yml`、`scripts/merge-agent-prs.mjs`、`scripts/lib/maintenance-guard.mjs`）、agentic workflow の `.md` と `*.lock.yml`、`data/events` などのデータ、新しい secret の参照、`write-all`、`pull_request_target` の追加、workflow の削除、install スクリプトの追加は、`needs-human-review` で止める。ガードは main のコードを使うので、PR 自身は弱められない。
- [watchdog.yml](../.github/workflows/watchdog.yml)（毎日 05:41 JST が目安）は、AI を使わずに止まりを直す: `COPILOT_GITHUB_TOKEN` の有効期限を確認し、無効または残り 21 日未満なら `token-health` ラベルの Issue を作る（内蔵トークンで作るので、個人トークンが死んでいても通知される）。60 分以上動いている agent の run を取り消す。直近の Pages デプロイが失敗していれば 1 回だけ再実行する。
- **失敗したら自動で直す**: [heal-on-failure.yml](../.github/workflows/heal-on-failure.yml) が、収集・デプロイ・merge・スライド依頼・各 agent の失敗を検知し、6 時間以内に点検が動いていなければ `maintain.lock.yml` を起動する（毎週の定期実行を待たない）。点検の agent は `scripts/health-report.mjs` の `.work/health.json`（失敗した run、開いている `[aw] ... failed` Issue、ライブサイトの応答、直近のデプロイ、最新の event の古さ、待機中・不成立の PR、バックログ）を読み、原因を直す PR か、直せないものの Issue を 1 件ずつ作る。watchdog は、同じ workflow の最新の run が成功していれば `[aw]` の失敗 Issue を閉じる。
- **全テストの毎日実行**: [full-tests.yml](../.github/workflows/full-tests.yml)（毎日 07:50 JST が目安）が `build:pages`、`npm test`、`npm run test:e2e` を main で実行する。収集が走らせるのは `test:data` だけで、ページ系のテストだけが落ちる不具合は workflow の失敗として表に出ないため。ここが失敗すると heal-on-failure が保守 agent を起動する
- **収集の直後にスライド・要約を始める**: 収集が新しいデータを commit したときは、そのまま `slide-dispatch.yml` と `summarize-dispatch.yml` を起動する（定期実行を待たない。未処理が無ければ何もしない）。新着の日本語化が、最大 6 時間ほど早くなる
- **lock の同期**: `tests/workflow-lock.test.mjs` が、gh-aw の `*.md` を編集したのに `gh aw compile` を忘れた状態（lock の `body_hash` とのずれ）と、`permissions` の欠落・`write-all`・`pull_request_target` を検出する。保守 agent がプロンプトだけを書き換えても、merger のテストで止まる
- **PowerPoint の文字の重なり**: PPTX は枠の位置と高さが固定なので、ブラウザのフォント計測で必要な高さを見積もり、枠に収まるまでフォントを縮め、パネルは見積もった高さで縦に並べる（`scripts/lib/downloads.mjs`）。収まらないものは `window.__pptxOverflow` に記録され、`tests/pptx-fit.test.mjs` が全スライドで失敗にする。スライド PR は merger が `node tests/pptx-fit.test.mjs <id>` で同じ検査をしてから merge し、直らない内容（長すぎる文）は PR が閉じられて再生成される。検査が落ちたら heal-on-failure から保守 agent が見積もり・レイアウトを直す
- **品質ゲート**: merge 前に、スライドは `scripts/render-pdf.mjs` で 1 ページに収まるか（最小フォントでも溢れないか）を確認する。要約・点検は `npm run test:pages` まで通す。検証や merge の競合に失敗したスライド・要約の PR は、merger が閉じて次の依頼で書き直させる。同じ更新の PR が 2 回閉じられたら、依頼から外す（点検が原因を見る）。`collect-updates.yml` と merger は同じ `data-write` ロックを使い、main への push が重ならない。スライドの agent は、`examples/slides/` の実際のスライド（GA / Preview / 廃止 / 更新）を見本にする。
- **想定問答（スライドノート）**: スライドの任意項目 `qa`（3〜5 組の質問と答え、日本語）は、発表者向けの想定問答で、ページや PDF には出さず、PPTX のスライドノート（「【想定問答】」）と JSON に入る。新しいスライドは agent が書く。既存のスライドへは、`slide-dispatch.yml` の `qa_backfill`（手動）か、新しい更新が無いときの余力で追加する（agent は `qa` だけを足し、merger が他の項目が変わっていないことを確認する）。
- **事実チェック**: merge 前に `scripts/verify-slide-facts.mjs` が、スライド（想定問答を含む）の版番号・設定名などの識別子、数値、日付が、スライドが引用したページ（`references` と `evidence`）に実在するかを確認する。識別子が 1 つでも無ければ、数値が 2 つ以上無ければ、却下する（ページを取得できないときは確認を飛ばす）。実在の 47 枚で誤検出が 0 件になることを確認している。
- **回し方と上限**: スライドの依頼は 1 日 4 回（各回最大 10 件）、要約は [summarize-dispatch.yml](../.github/workflows/summarize-dispatch.yml) が 1 日 4 回、未処理があり要約の PR が開いていないときだけ agent を起動する（何も無い日は agent の費用がかからない）。agent の 1 日の上限は、リポジトリ変数 `GH_AW_DEFAULT_MAX_DAILY_AI_CREDITS`（1500）で止める。
- **運用状況**: [pipeline-status.yml](../.github/workflows/pipeline-status.yml) が毎日、Issue「Pipeline status」（ラベル `pipeline-status`）を更新する。サイトの応答、最新データ、直近のデプロイ、スライド・要約の件数と残り、失敗の run を 1 つの表で見られる（AI は使わない）。
- トークンが切れると agentic workflow は全て止まる。GitHub Models は 2026-07-30 に廃止されたため、トークンなしの代替手段はない。

## 完全自動ではない部分

- スライド・要約・点検の PR は、タイトルの接頭辞（`slides:` / `summaries:` / `maint:`）で判定する。digest 用 workflow（validate / auto-merge / review 正規化 / redeploy）を変えるときは、これらの PR を処理しない条件を保つこと（`tests/slide-lane.test.mjs` が検証）
- Secret: `COPILOT_GITHUB_TOKEN`（agentic workflow が Copilot を使うための個人トークン）、`PDF_PASSWORD`（スライド PDF の暗号化。`deploy-pages.yml` だけが使い、未設定なら PDF は公開されない）、`DISCORD_WEBHOOK_URL`

- agentic workflow を使うには、Secret `COPILOT_GITHUB_TOKEN` と、リポジトリ設定の「Actions に PR の作成・承認を許可」が必要
- repo 側では auto-merge を有効化し、Actions の `GITHUB_TOKEN` は write 権限と PR review approve 権限を持つ前提にしている
- workflow の `GITHUB_TOKEN` で実行した collect commit や direct merge は通常の push workflow を自動連鎖しないため、Pages 再デプロイは dispatch で補う
- `Collect updates` が失敗すると、`heal-on-failure.yml` が点検の agent（`maintain.md`）を起動する。agent は収集・分類のコード（`scripts/**`）と関連テストを直す PR を作り、`data/**` は変えない。直せないものは Issue にまとめる

## Workflow 一覧

- [collect-updates.yml](../.github/workflows/collect-updates.yml): 毎日 3 回の収集と event / summary 更新
- [deploy-pages.yml](../.github/workflows/deploy-pages.yml): Pages 再生成と公開
- [notify-weekly-discord.yml](../.github/workflows/notify-weekly-discord.yml): 毎週水曜 06:00 JST の週間 Discord 要約通知。本文は短い概要に留め、主な更新は embed カードで表示する
- [notify-important-discord.yml](../.github/workflows/notify-important-discord.yml): 毎日の重要な更新（GA / Preview / 廃止）の Discord 通知
- [build-weekly-draft.yml](../.github/workflows/build-weekly-draft.yml): 毎週金曜 06:00 JST の週間ドラフト生成
- [build-biweekly-draft.yml](../.github/workflows/build-biweekly-draft.yml): 手動の隔週ドラフト生成
- [publish-qiita.yml](../.github/workflows/publish-qiita.yml): Qiita 投稿
- [test-discord-notification.yml](../.github/workflows/test-discord-notification.yml): Discord preview 通知の実送信テスト
- [slide-dispatch.yml](../.github/workflows/slide-dispatch.yml) / [summarize-dispatch.yml](../.github/workflows/summarize-dispatch.yml): スライド・要約の agent を起動する（AI なし）
- [slide.md](../.github/workflows/slide.md) / [summarize.md](../.github/workflows/summarize.md) / [maintain.md](../.github/workflows/maintain.md): agentic workflow の正本（`gh aw compile` で `*.lock.yml` を作る）
- [auto-merge-agent-prs.yml](../.github/workflows/auto-merge-agent-prs.yml): agent の PR の検証と merge、Pages の再デプロイ
- [heal-on-failure.yml](../.github/workflows/heal-on-failure.yml): 失敗した workflow を検知して点検の agent を起動する
- [watchdog.yml](../.github/workflows/watchdog.yml): token の期限、固まった run、失敗したデプロイ、回復した失敗 Issue
- [pipeline-status.yml](../.github/workflows/pipeline-status.yml): 運用状況 Issue の毎日の更新

## Secrets

- `DISCORD_WEBHOOK_URL`: Discord 通知と通知テスト用
- `PAGES_BASE_URL`: Discord 通知に載せる Pages URL のベース。未設定時は公開 URL を既定値として使う
- `QIITA_ACCESS_TOKEN`: Qiita 投稿用
- `COPILOT_GITHUB_TOKEN`: agentic workflow が Copilot を使うための fine-grained PAT（「Copilot Requests」権限のみ。OAuth トークンは使えない）
- `PDF_PASSWORD`: スライド PDF の暗号化（`deploy-pages.yml` だけが使う）

## セキュリティメモ

- リポジトリ内に Discord Webhook URL や GitHub token を直書きしない構成です。通知や投稿はすべて GitHub Secrets 経由です
- `github-script` への workflow input は script 直埋め込みではなく `env` 経由で渡します
- agent の PR は `scripts/merge-agent-prs.mjs` だけが merge する（スライドは 1 ファイル、要約は 1 ファイル、点検は `scripts/lib/maintenance-guard.mjs` の範囲）。agent は secret の無い sandbox で動き、書き込みは PR（safe output）だけに限られる
- `needs-human-review` ラベルがある PR は必ず手動確認に倒れます
- agent が読むページは、`scripts/fetch-text.mjs` と `network.allowed` の host に限る。取得した本文は信頼できないデータとして扱うよう、各 agent の指示に書いてある

## Node / action バージョン

GitHub hosted runner の Node 20 deprecation warning に合わせて主要 action は新しい major へ更新していますが、Pages 系 action は upstream 側の都合で warning が出る可能性があります。

- `actions/checkout@v6`
- `actions/setup-node@v6`
- `actions/github-script@v8`

## 手動テストの入口

- `gh workflow run notify-weekly-discord.yml -f date_key=YYYY-MM-DD`
- `gh workflow run test-discord-notification.yml -f date_key=YYYY-MM-DD`
- `gh workflow run deploy-pages.yml`
- `node scripts/notify-discord.mjs --mode weekly --date YYYY-MM-DD --window-days 7 --dry-run --force-preview`
  - dry-run JSON の `content` と `embeds` を確認する。読みやすさ guard が文字数超過、ASCII `...`、長すぎる非 URL 行を検出する。
  - 通知本文には Pages URL と検索 URL を出し、先頭 embed は要約、各イベント embed には該当日次 Pages への field を出す。
  - `--include-og` を付けると各イベント URL の `og:image` を短い timeout で取得し、取得できた場合だけ thumbnail に載せる。取得失敗時も通知生成は継続する。
  - `--thread-id` または `--thread-name` は opt-in の Discord thread 投稿用。dry-run では実送信せず、実 webhook 送信時だけ query parameter として使う。
- `npm test`
  - Pages / Discord UX guard では、生成済み `site` の検索 facet、フィルタ、Pagefind 対象、Discord dry-run payload を確認する。検索や Pages UI を変えた後は、先に `npm run build:pages` で `site` を更新してから実行する。

## まず見るべき確認ポイント

- agent の PR が出ない・merge されないときは、Issue「Pipeline status」と `[aw] ... failed` の Issue、merger の run のログ（`Auto-merge stopped` のコメントも）を先に見る
- Pages だけ古い場合は workflow 失敗より先に live HTML の stale 配信を疑い、[deploy-pages.yml](../.github/workflows/deploy-pages.yml) を手動 dispatch して再確認する

## 資料の補完

通常の `collect` は全期間の未補完項目を検証し、原文・公式資料の台帳を `data/resources.json` に保存する。収集 workflow は `.cache/resource-pages` を引き継ぎ、台帳を通常の `data` commit に含める。途中再開、失敗の再試行、日本語本文の検証、全期間件数の解釈は [resource-enrichment.md](resource-enrichment.md) を参照。
