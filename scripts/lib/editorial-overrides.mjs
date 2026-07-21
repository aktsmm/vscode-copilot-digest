export const editorialOverrides = Object.freeze({
  "AI credit pools for cost centers in the billing UI": {
    jaTitle: "請求 UI で cost center の AI credit pool を直接管理可能に",
    jaSummary:
      "cost center の作成・編集を行う請求 UI から、AI credit pool を直接管理できるようになった。これまでは別の経路でしか管理できなかった。",
    jaWhy:
      "cost center 別の AI credit 運用を請求画面に集約できるため、Enterprise の予算・利用管理を進めやすくなります。",
  },
  "Copilot users can now see AI credits used per billing cycle": {
    jaTitle:
      "Copilot Business / Enterprise で請求サイクル内の AI credit 使用量を確認可能に",
    jaSummary:
      "Copilot Business と Copilot Enterprise の利用者が、個人予算を設定していなくても当月の AI credit 使用量を確認できるようになった。GitHub Copilot の usage 画面から確認する。",
    jaWhy:
      "個人予算を設けていない環境でも利用量を把握できるため、利用者自身のコスト意識や管理者との状況共有に役立ちます。",
  },
  "Expanded technical preview availability for the GitHub Copilot app": {
    jaTitle: "GitHub Copilot アプリの技術プレビュー対象を既存全プランへ拡大",
    jaSummary:
      "GitHub Copilot アプリの技術プレビューが、既存の Copilot Pro、Pro+、Business、Enterprise 利用者全員に提供された。Windows、macOS、Linux のデスクトップから agent 駆動の開発を始められる。",
    jaWhy:
      "対象プランの利用者は追加の申し込みなしでアプリを評価できるため、デスクトップ中心の agent 利用を試しやすくなります。",
  },
  "Copilot CLI: Improved UI, rubber duck, prompt scheduling, and voice input": {
    jaTitle: "Copilot CLI の UI 刷新、Rubber Duck、スケジュール実行、音声入力",
    jaSummary:
      "Copilot CLI が UI を刷新し、Rubber Duck、プロンプトのスケジュール実行、音声入力が一般提供になった。タブを含む実験的な新しいターミナル UI も追加される。",
    jaWhy:
      "ターミナル上の agent 作業を継続・見直し・予約実行しやすくなるため、CLI を日常利用するチームの運用に直接効きます。",
  },
  "Cloud and local sandboxes for GitHub Copilot now in public preview": {
    jaTitle: "GitHub Copilot のクラウド・ローカル sandbox が public preview に",
    jaSummary:
      "GitHub Copilot をローカルとクラウドの隔離された sandbox 内で実行できるようになった。tool 実行を分離した環境に閉じ込め、より安全に agent の作業を試せる public preview である。",
    jaWhy:
      "agent に実行を任せる際の安全境界を検証できるため、権限や信頼性を重視する組織の評価に役立ちます。",
  },
  "GitHub Copilot code review for Azure Repos is now in technical preview": {
    jaTitle: "Azure Repos 向け GitHub Copilot code review が技術プレビューに",
    jaSummary:
      "Azure Repos の pull request で GitHub Copilot code review をオンデマンド実行できる技術プレビューが公開された。Azure DevOps の既存レビュー フローに Copilot の指摘を組み込める。",
    jaWhy:
      "GitHub 以外のリポジトリ基盤を使うチームでも Copilot code review を評価でき、導入対象を広げられます。",
  },
  "Shape Copilot code review around your team": {
    jaTitle: "チームのツールと規約に合わせて Copilot code review を最適化",
    jaSummary:
      "Copilot code review がチームのツールや規約に適応し、変更の複雑さに応じてレビューの深さを調整できるようになった。統一された agent 基盤で複数の public preview を提供する。",
    jaWhy:
      "既存の開発規約やレビュー負荷に合わせて自動レビューを調整できるため、ノイズを抑えながら導入を進めやすくなります。",
  },
  "Extend GitHub with agent apps": {
    jaTitle: "agent apps で GitHub を拡張",
    jaSummary:
      "GitHub Marketplace から partner 提供の agent apps を GitHub App と同様にインストールし、GitHub 上の作業フローへ直接統合できるようになった。",
    jaWhy:
      "外部の AI agent を GitHub の issue、pull request、リポジトリ操作へ組み込みやすくなり、拡張の選択肢が増えます。",
  },
  "GitHub Copilot in Visual Studio Code, May releases": {
    jaTitle: "GitHub Copilot in Visual Studio Code の 2026年5月リリースまとめ",
    jaSummary:
      "VS Code の weekly stable リリース v1.120 から v1.123 までに入った GitHub Copilot 更新をまとめた changelog。Agents Window など、5月から6月初旬の agent 体験の変更を横断して確認できる。",
    jaWhy:
      "週次リリースで散らばった Copilot の変更をまとめて把握できるため、利用手順や検証計画を更新しやすくなります。",
  },
  "Fix with Copilot for failing Actions now in Pro, Pro+, and Max": {
    jaTitle:
      "失敗した Actions を Fix with Copilot で修正可能に（Pro / Pro+ / Max）",
    jaSummary:
      "GitHub Actions の job が失敗したとき、Copilot Pro、Pro+、Max 利用者は Fix with Copilot ボタンから Copilot cloud agent にワンクリックで修正を依頼できるようになった。",
    jaWhy:
      "CI 失敗から修正 pull request までの切り替えを減らせるため、個人プランでも障害対応の初動を速くできます。",
  },
  "Agent tasks REST API now available for Copilot Pro, Pro+, and Max": {
    jaTitle: "Copilot Pro / Pro+ / Max 向け Agent tasks REST API が利用可能に",
    jaSummary:
      "Copilot Pro、Pro+、Max 利用者が Agent tasks REST API から Copilot cloud agent のタスクを開始・追跡できる public preview が公開された。",
    jaWhy:
      "手動の issue 割り当てだけに頼らず、社内ツールや自動化から cloud agent を起動する検証を始められます。",
  },
  "Larger context windows and configurable reasoning levels for GitHub Copilot":
    {
      jaTitle: "GitHub Copilot の context window 拡大と reasoning レベル設定",
      jaSummary:
        "GitHub Copilot がより大きい context window と、用途に応じて選べる reasoning レベルに対応した。深い調査や複雑な作業で扱える文脈量と推論コストを調整しやすくする。",
      jaWhy:
        "長いタスクでの品質、速度、コストのバランスを調整できるため、複雑な agent 作業の設計に影響します。",
    },
  "GitHub Copilot in Visual Studio — May update": {
    jaTitle: "GitHub Copilot in Visual Studio の 2026年5月更新",
    jaSummary:
      "Visual Studio 2026 の GitHub Copilot に、計画、レビュー、作業管理を支える改善が入った。5月の主要な Copilot 体験をまとめて紹介する更新である。",
    jaWhy:
      "Visual Studio を主に使う開発者は、IDE 側で使える agent とレビュー機能の変化をまとめて確認できます。",
  },
  "Copilot Chat brings richer context to pull requests": {
    jaTitle: "Copilot Chat が pull request により豊富なコンテキストを提供",
    jaSummary:
      "github.com で diff や pull request を扱う Copilot Chat に、より豊富なコンテキストと新機能が追加された。以前の public preview から一般提供へ移行した。",
    jaWhy:
      "pull request を離れずに変更内容を理解・質問できるため、レビュー作業の往復を減らせます。",
  },
  "Enterprise-managed plugins in VS Code in public preview": {
    jaTitle: "VS Code の enterprise 管理 plugin が public preview に",
    jaSummary:
      "Enterprise 管理者が VS Code 向け plugin を構成・配布できる public preview が公開された。先行していた Copilot CLI の enterprise 管理 plugin と合わせ、組織で標準構成を展開しやすくする。",
    jaWhy:
      "利用者ごとの plugin 設定差を減らし、組織ポリシーに沿った VS Code と CLI の環境を整えやすくなります。",
  },
  "Claude Fable 5 is generally available for GitHub Copilot": {
    jaTitle: "Claude Fable 5 が GitHub Copilot で一般提供に",
    jaSummary:
      "Anthropic の Claude Fable 5 が GitHub Copilot で利用可能になった。長期にわたる自律的なコーディングや知識作業を想定した Mythos クラス初のモデルとして案内されている。",
    jaWhy:
      "長時間・複数段階の作業に使えるモデル候補が増えるため、モデル選択や評価基準を見直す材料になります。",
  },
  "Security validation for third-party coding agents": {
    jaTitle: "サードパーティ coding agent 向けセキュリティ検証が一般提供に",
    jaSummary:
      "Claude や OpenAI Codex など、リポジトリで直接作業するサードパーティ coding agent を対象にした security validation が一般提供になった。",
    jaWhy:
      "Copilot 以外の agent も併用する組織で、実行前後のセキュリティ統制を揃えやすくなります。",
  },
  "Copilot Chat now sees your agent sessions": {
    jaTitle: "Copilot Chat から agent session を参照・検索可能に",
    jaSummary:
      "Web 上の Copilot Chat と Copilot cloud agent の引き継ぎが改善され、過去の agent session を検索・問い合わせできるようになった。",
    jaWhy:
      "進行済みの agent 作業を会話から振り返れるため、状況把握や引き継ぎのためのコンテキスト切り替えを減らせます。",
  },
  "Agentic workflows no longer need a personal access token": {
    jaTitle: "GitHub Agentic Workflows で personal access token が不要に",
    jaSummary:
      "GitHub Agentic Workflows を GitHub Actions の組み込み GITHUB_TOKEN で実行できるようになった。personal access token の作成・保管が不要になる。",
    jaWhy:
      "CI 内の秘密情報管理を簡素化できるため、agentic workflow を安全に導入しやすくなります。",
  },
  "How we made GitHub Copilot CLI more selective about delegation": {
    jaTitle: "GitHub Copilot CLI の delegation をより選択的にした改善",
    jaSummary:
      "GitHub Copilot CLI が delegation をより慎重に選ぶようにした背景を解説する記事。orchestration を改善し、不要な handoff を減らして進行を速くする考え方を紹介している。",
    jaWhy:
      "subagent への委任過多を避ける設計の参考になり、CLI ベースの agent ワークフローの効率改善に役立ちます。",
  },
  "Copilot code review: New configurations and controls": {
    jaTitle: "Copilot code review に新しい設定と制御を追加",
    jaSummary:
      "Copilot code review に organization runner 制御、content exclusion、repository custom instructions の文字数制限撤廃が追加された。チームの規約に合わせてレビューを調整しやすくなる。",
    jaWhy:
      "実行環境、対象外コンテンツ、レビュー指示を細かく制御できるため、組織の統制要件に合わせやすくなります。",
  },
  "Copilot usage metrics now include more of your active users": {
    jaTitle: "Copilot usage metrics がより多くのアクティブ利用者を集計",
    jaSummary:
      "Copilot usage metrics レポートが client signal に加えて server-side telemetry を使うようになり、これまで見えにくかったアクティブ利用者も集計へ反映される。",
    jaWhy:
      "利用者数の基準が変わり得るため、導入効果の比較や既存ダッシュボードの読み方を見直す必要があります。",
  },
  "What are git worktrees, and why should I use them?": {
    jaTitle: "Git worktree とは何か、なぜ使うのか",
    jaSummary:
      "Git worktree の仕組み、使い方、近年利用が広がっている背景を解説する記事。複数の作業ツリーを並行して扱うための基礎を紹介している。",
    jaWhy:
      "agent と人が別タスクを並行して進める際の作業分離にも使えるため、Git 運用の選択肢として押さえておく価値があります。",
  },
  "Getting more from each token: How Copilot improves context handling and model routing":
    {
      jaTitle:
        "Copilot の context 処理とモデル routing で token を有効活用する改善",
      jaSummary:
        "GitHub Copilot が各 session の token をより有効に使うため、context handling と model routing を改善する取り組みを紹介している。コストと応答効率を高めることが主題である。",
      jaWhy:
        "利用量課金や長い agent session のコストに関わるため、Copilot の最適化方針を理解する材料になります。",
    },
  "Auto mode in Copilot Chat available for all users": {
    jaTitle: "Copilot Chat の Auto mode が全利用者に提供",
    jaSummary:
      "github.com と GitHub Mobile の Copilot Chat で、全 Copilot プラン向けに auto model selection が一般提供になった。Auto がタスクごとに最適なモデルを選ぶ。",
    jaWhy:
      "手動でモデルを選ばない運用が全プランで可能になるため、社内ガイドやモデル評価の前提に影響します。",
  },
  "Improving token efficiency in GitHub Copilot": {
    jaTitle: "GitHub Copilot の token 効率を改善する取り組み",
    jaSummary:
      "VS Code チームが、GitHub Copilot の token 効率を改善してコストとレイテンシを下げる取り組みを紹介している。",
    jaWhy:
      "日常的な Copilot 利用の応答速度とコストに関わるため、開発側の最適化方針を把握する材料になります。",
  },
  "Generated release notes credit you for Copilot pull requests": {
    jaTitle: "生成した release notes に Copilot 作成 pull request の貢献を記載",
    jaSummary:
      "新しい release の release notes を生成すると、前回 release 以降に merge された pull request の一覧へ Copilot が作成した pull request も反映されるようになった。",
    jaWhy:
      "agent が行った変更を release note 上でも追跡しやすくなり、AI 支援の可視性と説明責任に役立ちます。",
  },
  "How we built an internal data analytics agent": {
    jaTitle: "社内データ分析 agent を構築した方法",
    jaSummary:
      "GitHub 社内の Copilot 搭載分析 agent Qubot を使い、従業員が自然言語でデータに質問できるようにした事例と、構築から得た学びを紹介している。",
    jaWhy:
      "社内データを agent で扱う際の設計・運用の実例として、分析支援を検討するチームの参考になります。",
  },
  "What 50,000 Runs of a 5-Line Eval Taught Us": {
    jaTitle: "5行の評価を5万回実行して得た学び",
    jaSummary:
      "単純なタスクでも AI coding model が effort、token cost、tool 利用をどう調整するかを、5万回の評価実行から分析した記事。モデル選択とコストへの示唆を扱う。",
    jaWhy:
      "小さな評価でもモデルの振る舞いと費用が変わることを示しており、agent 評価基準を設計する際の参考になります。",
  },
  "Copilot CLI: New terminal interface is generally available": {
    jaTitle: "Copilot CLI の新しい terminal interface が一般提供に",
    jaSummary:
      "Microsoft Build 2026 で preview だった GitHub Copilot CLI の再設計された terminal interface が一般提供になった。GitHub 作業を扱うための tabbed layout が利用できる。",
    jaWhy:
      "CLI を中心に作業する開発者の操作面が変わるため、日常の terminal ワークフローを見直す契機になります。",
  },
  "I automated my job (and it made me a better leader)": {
    jaTitle: "仕事を自動化したことで、より良いリーダーになれた理由",
    jaSummary:
      "シニアリーダーが約40個の automation を日常業務に使い、時間の使い方をどう変えたかを紹介する記事。お気に入りの自動化例も扱う。",
    jaWhy:
      "開発以外の業務にも AI と自動化を広げる際の具体例として、個人の生産性設計を考える材料になります。",
  },
  "Changes to model selection for Free and Student plans": {
    jaTitle: "Free / Student プランのモデル選択を Auto に統一",
    jaSummary:
      "Copilot Free と Student プランでは、Copilot auto model selection が既定かつ唯一のモデル選択体験になる。Auto がタスクに最適なモデルを動的に選ぶ。",
    jaWhy:
      "対象プランでは手動モデル選択の前提がなくなるため、教育・試用環境の案内や評価方法を更新する必要があります。",
  },
  "Copilot code review: Analysis depth and efficiency updates": {
    jaTitle: "Copilot code review の分析深度と効率を改善",
    jaSummary:
      "Copilot code review が Copilot CLI と SDK の組み込み file exploration tools を使うようになり、既存ワークフローを変えずにレビューのコスト効率を高めた。",
    jaWhy:
      "自動レビューの精度と実行コストの両方に関わるため、レビュー運用の効率改善を評価する材料になります。",
  },
  "GitHub Copilot for Jira is now generally available": {
    jaTitle: "GitHub Copilot for Jira が一般提供に",
    jaSummary:
      "GitHub Copilot for Jira が一般提供になった。2026年3月の public preview 以降、model selection など利用者のフィードバックを反映した機能強化が進められている。",
    jaWhy:
      "Jira を起点にした開発管理へ Copilot を組み込む選択肢が本番利用の段階に入り、導入計画を立てやすくなります。",
  },
  "Iterating faster with TypeScript 7": {
    jaTitle: "TypeScript 7 で VS Code 開発を高速化する取り組み",
    jaSummary:
      "VS Code チームと TypeScript チームが TypeScript 7 を採用し、VS Code の開発速度を高めた取り組みを紹介している。",
    jaWhy:
      "VS Code 本体の開発基盤がどう変わるかを把握でき、拡張やツールチェーンへの影響を考える材料になります。",
  },
  "Evaluating performance and efficiency of the GitHub Copilot agentic harness across models and tasks":
    {
      jaTitle:
        "GitHub Copilot agentic harness の性能と効率をモデル・タスク横断で評価",
      jaSummary:
        "GitHub Copilot agentic harness が複数 benchmark で示す性能、token 効率、20以上のモデルを選べる柔軟性を解説する記事。",
      jaWhy:
        "agent harness の品質とコストをどう評価するかの実例として、社内評価やモデル選定の参考になります。",
    },
  "Claude Opus 4.8 (fast mode) is now in preview for GitHub Copilot": {
    jaTitle: "Claude Opus 4.8 の fast mode が GitHub Copilot で preview に",
    jaSummary:
      "Claude Opus 4.8 の fast mode が GitHub Copilot で段階的に preview 提供される。Claude Opus と同等の知能を保ちながら、出力 token 速度を大幅に高めるとしている。",
    jaWhy:
      "応答速度と高度な推論の両立を試せるため、長時間の agent 作業で使うモデル候補を評価しやすくなります。",
  },
  "Integrating Copilot cloud agent with Teams (public preview)": {
    jaTitle: "Copilot cloud agent と Teams の連携が public preview に",
    jaSummary:
      "GitHub Docs に、Microsoft Teams から Copilot cloud agent へタスクを割り当て、進捗を追跡する方法が追加された。GitHub Changelog やブログでは告知されていない Docs 起点の public preview である。",
    jaWhy:
      "Teams を作業の入口にしているチームは、会話から agent 作業を開始・確認する運用を早期に試せます。",
  },
  "Improved accuracy and coverage in Copilot usage metrics reports": {
    jaTitle: "Copilot usage metrics レポートの正確性とカバレッジを改善",
    jaSummary:
      "Copilot usage metrics API に、Copilot CLI の suggested lines of code など、レポートをより完全かつ正確にする3つの改善が入った。",
    jaWhy:
      "利用状況の集計基準が変わるため、既存の adoption 指標やレポート比較への影響を確認する必要があります。",
  },
  "Upcoming deprecation of Gemini 2.5 Pro and Gemini 3 Flash": {
    jaTitle: "Gemini 2.5 Pro と Gemini 3 Flash の廃止予定",
    jaSummary:
      "Gemini 2.5 Pro と Gemini 3 Flash は、Copilot Chat、inline edits、ask / agent modes、code completions を含む GitHub Copilot 全体験から7月31日に廃止予定である。",
    jaWhy:
      "対象モデルを明示指定している利用者や組織は、期限までに代替モデルと model policy を確認する必要があります。",
  },
  "Copilot CLI no longer needs a personal access token in GitHub Actions": {
    jaTitle:
      "GitHub Actions 上の Copilot CLI で personal access token が不要に",
    jaSummary:
      "GitHub Actions で GitHub Copilot CLI を実行する際、組み込み GITHUB_TOKEN を使えるようになった。personal access token を作成・保存する必要がなくなる。",
    jaWhy:
      "CI で Copilot CLI を使う場合の秘密情報管理が簡素化され、導入時のセキュリティ負荷を下げられます。",
  },
  "Cost centers now support AI credit pools": {
    jaTitle: "cost center で AI credit pool の上限を設定可能に",
    jaSummary:
      "enterprise の月間 included AI credits について、cost center が使える上限を設定できるようになった。現時点では REST API から利用でき、cost center 側の管理画面対応も案内されている。",
    jaWhy:
      "部門や cost center ごとに AI credit の消費を統制できるため、従量利用の予算管理を進めやすくなります。",
  },
  "Enterprises can default to auto model selection": {
    jaTitle: "Enterprise で auto model selection を既定に設定可能に",
    jaSummary:
      "Enterprise 管理者が enterprise managed-settings.json の model を auto に設定し、新しい会話で Copilot auto model selection を既定化できるようになった。",
    jaWhy:
      "利用者ごとの手動設定に頼らずモデル選択方針を統一できるため、組織展開と運用を簡素化できます。",
  },
  "Enterprise managed-settings.json is generally available": {
    jaTitle: "Enterprise managed-settings.json が一般提供に",
    jaSummary:
      "GitHub Enterprise Cloud の顧客が、選択した organization の .github-private リポジトリで管理する managed-settings.json を通じて AI の標準設定を定義できるようになった。",
    jaWhy:
      "AI 利用に関する組織標準をコードとして管理できるため、複数 organization への統制展開を行いやすくなります。",
  },
  "Kimi K2.7 Code is generally available in GitHub Copilot": {
    jaTitle: "Kimi K2.7 Code が GitHub Copilot で一般提供に",
    jaSummary:
      "open-weight model の Kimi K2.7 Code が GitHub Copilot で一般提供になった。Copilot の model picker で選べる最初の open-weight model として案内されている。",
    jaWhy:
      "モデル選択肢とガバナンスの検討範囲が広がるため、性能・コスト・利用方針を評価する材料になります。",
  },
  "Copilot vision is generally available": {
    jaTitle: "Copilot vision が一般提供に",
    jaSummary:
      "Copilot vision が一般提供になり、画像や PDF を chat prompt に直接添付して、コードと合わせて内容を推論できるようになった。",
    jaWhy:
      "設計資料、画面、PDF を含む調査を chat に持ち込めるため、コンテキスト共有の方法が広がります。",
  },
  "Visual Studio Code 1.128 (Insiders)": {
    jaTitle: "Visual Studio Code 1.128（Insiders）リリース",
    jaSummary:
      "Visual Studio Code 1.128（Insiders）の更新案内。Insiders 向け release notes から新機能と実験的な変更を確認できる。",
    jaWhy:
      "Stable 公開前の agent と editor の変更を早期に確認できるため、先行検証やフィードバック計画に役立ちます。",
  },
  "Per-user budgets for cost centers in the billing UI": {
    jaTitle: "請求 UI で cost center ごとのユーザー予算を設定可能に",
    jaSummary:
      "Enterprise 管理者が、cost center と予算を管理する請求 UI から cost center のユーザー単位予算を直接作成できるようになった。GitHub Enterprise Cloud 向けの機能である。",
    jaWhy:
      "cost center 内でも利用者ごとの予算を細かく管理できるため、AI credit の利用統制を段階的に進められます。",
  },
  "GitHub Copilot app available to all": {
    jaTitle: "GitHub Copilot アプリが全 Copilot プランで利用可能に",
    jaSummary:
      "GitHub Copilot アプリがすべての Copilot プランで利用可能になった。GitHub アカウントでサインインすれば、macOS、Windows、Linux のデスクトップから agent 駆動開発を始められる。",
    jaWhy:
      "プランによる利用制約がなくなるため、デスクトップ アプリを前提にした agent 開発の展開を検討しやすくなります。",
  },
  "Copilot Billing Preview app will be retired on August 3": {
    jaTitle: "Copilot Billing Preview アプリを8月3日に廃止予定",
    jaSummary:
      "Copilot 支出の確認に使われてきた Copilot Billing Preview アプリは2026年8月3日に廃止予定となった。より詳細な可視化は GitHub 側の機能へ移行する。",
    jaWhy:
      "旧アプリに依存した利用量確認や社内案内を、廃止前に新しい確認画面へ切り替える必要があります。",
  },
  "Automating cross-repo documentation with GitHub Agentic Workflows": {
    jaTitle:
      "GitHub Agentic Workflows で複数リポジトリのドキュメント更新を自動化",
    jaSummary:
      "Aspire チームが、merge 済みの製品変更から SME レビュー付きのドキュメント pull request を作る GitHub Agentic Workflows の活用例を紹介している。release と文書更新の遅れを縮める取り組みである。",
    jaWhy:
      "複数リポジトリにまたがる文書保守を自動化する具体例として、agentic workflow の実運用設計を考える参考になります。",
  },
  "Enterprise-managed OpenTelemetry export for VS Code and CLI": {
    jaTitle: "VS Code と CLI の OpenTelemetry export を Enterprise で管理",
    jaSummary:
      "organization が GitHub Copilot の OpenTelemetry（OTel）データ送信先を指定できるようになった。開発者ごとに OTEL_* 環境変数を設定せず、承認済み collector へ telemetry を送れる。",
    jaWhy:
      "agent telemetry の送信先を組織ポリシーとして統一できるため、observability とデータ統制を両立しやすくなります。",
  },
  "Deploy managed Copilot settings via MDM in VS Code and CLI": {
    jaTitle: "MDM で VS Code と CLI の管理済み Copilot 設定を配布可能に",
    jaSummary:
      "Enterprise 管理者が、既存の server-managed channel に加え、native mobile device management（MDM）と file-based configuration を通じて管理済み GitHub Copilot 設定を端末へ配布できるようになった。",
    jaWhy:
      "端末管理の仕組みを使って設定を配布できるため、大規模な開発環境で Copilot の統制を適用しやすくなります。",
  },
  "GitHub Copilot in Visual Studio Code, June 2026 releases": {
    jaTitle: "GitHub Copilot in Visual Studio Code の 2026年6月リリースまとめ",
    jaSummary:
      "VS Code v1.123 から v1.127 まで、2026年6月から7月初旬に公開された GitHub Copilot 更新をまとめた changelog。日常的に使う Copilot 体験を基盤にした変更を確認できる。",
    jaWhy:
      "weekly release の変更を月次の単位で把握できるため、導入チームの検証と社内周知を整理しやすくなります。",
  },
  "Visual Studio Code 1.129 (Insiders)": {
    jaTitle: "Visual Studio Code 1.129（Insiders）リリース",
    jaSummary:
      "Visual Studio Code 1.129（Insiders）の更新案内。Insiders 向け release notes から新機能と実験的な変更を確認できる。",
    jaWhy:
      "Stable 前の変更を確認できるため、agent 機能や拡張との互換性を早めに検証できます。",
  },
  "How GitHub Copilot enables zero DNS configuration for GitHub Pages": {
    jaTitle: "GitHub Copilot で GitHub Pages の DNS 設定を不要にする方法",
    jaSummary:
      "空のリポジトリから HTTPS 対応の custom domain を持つ GitHub Pages までを、DNS record を手作業で編集せず約14分で構築した事例を紹介している。",
    jaWhy:
      "Copilot を使ったインフラ設定とサイト公開の自動化例として、手作業の DNS 運用を減らす設計の参考になります。",
  },
  "GitHub Mobile: Fix merge conflicts with Copilot cloud agent": {
    jaTitle:
      "GitHub Mobile で Copilot cloud agent に merge conflict 修正を依頼可能に",
    jaSummary:
      "GitHub Mobile が Copilot cloud agent を使った pull request の merge conflict 修正に対応した。外出先でも conflict で止まった pull request を解消しやすくする。",
    jaWhy:
      "デスクトップへ戻らずに統合作業を前へ進められるため、モバイルからの agent 作業継続に役立ちます。",
  },
  "Add review cycles and time to adoption phases in the usage API": {
    jaTitle:
      "usage API の adoption phase に review cycle と定着までの時間を追加",
    jaSummary:
      "Copilot usage metrics API が、enterprise と organization レポートの AI adoption phase ごとに、code review の速度に関する2つの追加指標を返すようになった。",
    jaWhy:
      "利用者数だけでなくレビュー フローの変化を定量化できるため、Copilot 導入効果の分析を深められます。",
  },
  "Codex as agent provider and agentic enhancements in JetBrains IDEs": {
    jaTitle:
      "JetBrains IDEs で Codex を agent provider として追加し agent 機能を強化",
    jaSummary:
      "JetBrains IDEs に Codex の agent provider が public preview として追加された。Customizations editor の Hooks、より豊富な MCP server 管理、設定済み custom model などの agent 機能も拡張される。",
    jaWhy:
      "VS Code 以外の IDE でも agent 運用を広げる際に、モデル・Hooks・MCP 管理の選択肢が増えます。",
  },
  "Kimi K2.7 now available for Copilot Business and Enterprise": {
    jaTitle: "Kimi K2.7 が Copilot Business / Enterprise で利用可能に",
    jaSummary:
      "Copilot Pro、Pro+、Max 向けに案内されていた Kimi K2.7 が、Copilot Business と Copilot Enterprise でも利用可能になった。",
    jaWhy:
      "法人向けプランでも open-weight model を評価できるため、モデル選択と統制の方針を広げられます。",
  },
  "OpenAI's GPT-5.6 Sol, Terra, and Luna are now available in GitHub Copilot": {
    jaTitle: "OpenAI GPT-5.6 Sol / Terra / Luna が GitHub Copilot で利用可能に",
    jaSummary:
      "OpenAI の GPT-5.6 family が GitHub Copilot で段階的に提供される。Sol、Terra、Luna の3種類から、タスクに合わせてモデルを選べる。",
    jaWhy:
      "タスクの難易度やコストに応じてモデルを使い分ける選択肢が増えるため、既存のモデル運用を見直す材料になります。",
  },
  "Ask Copilot for a repository overview": {
    jaTitle: "Copilot にリポジトリの概要を質問可能に",
    jaSummary:
      "初めて調べるリポジトリの home page で、GitHub Copilot に高レベルな概要を質問できるようになった。リポジトリの構成や目的を素早く把握する入口を提供する。",
    jaWhy:
      "新しいコードベースの調査を始める時間を短縮できるため、onboarding や依存先の理解に役立ちます。",
  },
  "Better tools made Copilot code review worse. Here's how we actually improved it.":
    {
      jaTitle:
        "より良い tool が Copilot code review を悪化させた後、改善した方法",
      jaSummary:
        "Copilot code review を共通の Unix 風 code exploration tools へ移行した結果、review cost を下げるために agent workflow を pull request の根拠へ合わせて再設計した事例を解説している。",
      jaWhy:
        "tool を増やすだけでは品質が上がらないことを示す実例であり、agent の評価と運用設計を見直す参考になります。",
    },
  "GitHub Mobile: Improved filters and sorting for Copilot sessions": {
    jaTitle: "GitHub Mobile の Copilot session フィルターと並べ替えを改善",
    jaSummary:
      "GitHub Mobile で Copilot session の filter と sort が改善され、session 一覧が増えても目的の session を見つけやすくなった。絞り込み条件を使って表示を整理できる。",
    jaWhy:
      "複数の agent 作業をモバイルから追う場合でも、進行中・過去の session を管理しやすくなります。",
  },
  "Security reviews now available in the GitHub Copilot app": {
    jaTitle: "GitHub Copilot アプリで security review が利用可能に",
    jaSummary:
      "GitHub Copilot アプリ内で、進行中のコード変更に対する security review を直接実行できるようになった。/security-review slash command は public preview として提供される。",
    jaWhy:
      "コードをアプリから離さずセキュリティ観点の確認を始められるため、agent 作業の検証フローを短縮できます。",
  },
  "Agentic autofix for code scanning alerts in public preview": {
    jaTitle: "code scanning alert 向け agentic autofix が public preview に",
    jaSummary:
      "code scanning alert に対する agentic autofix が public preview になった。開発者のように関連ファイルを探索し、修正案を作ることで alert の remediation を進める。",
    jaWhy:
      "単純な依存更新では済まないセキュリティ修正を agent に任せられるため、alert 対応の滞留を減らせます。",
  },
  "Visual Studio Code 1.130 (Insiders)": {
    jaTitle: "Visual Studio Code 1.130（Insiders）リリース",
    jaSummary:
      "Visual Studio Code 1.130（Insiders）の更新案内。Insiders 向け release notes から新機能と実験的な変更を確認できる。",
    jaWhy:
      "将来の Stable 更新前に agent と editor の変更を確認できるため、早期評価とフィードバックに使えます。",
  },
  "GitHub Copilot in Visual Studio — June update": {
    jaTitle: "GitHub Copilot in Visual Studio の 2026年6月更新",
    jaSummary:
      "2026年6月の Visual Studio 向け GitHub Copilot は、利用状況の可視化、MCP server の trust layer、最初の C++ scenario など、visibility と trust を中心に改善された。",
    jaWhy:
      "Visual Studio を使う組織で、利用状況の把握と MCP を含む agent 利用の安全性を見直す材料になります。",
  },
  "Copilot code review: Customization and configurability improvements": {
    jaTitle: "Copilot code review のカスタマイズ性と設定可能性を改善",
    jaSummary:
      "Copilot code review が firewall、custom setup steps、独立した runner configuration を利用できるようになった。head branch の custom instructions も読み取り、変更のテストと検証を行いやすくする。",
    jaWhy:
      "レビュー実行環境と instruction を柔軟に調整できるため、組織のネットワーク・検証要件に合わせやすくなります。",
  },
  "GitHub Mobile: Fix pull request comments with Copilot cloud agent": {
    jaTitle:
      "GitHub Mobile で Copilot cloud agent に pull request コメントの修正を依頼可能に",
    jaSummary:
      "GitHub Mobile で Copilot code review の pull request コメントから直接 Fix with Copilot を選べるようになった。pull request の main view と comment の両方から操作できる。",
    jaWhy:
      "レビュー指摘への対応をモバイル上で開始できるため、待ち時間やデスクトップへの切り替えを減らせます。",
  },
  "Repository-level GitHub Copilot usage metrics generally available": {
    jaTitle: "リポジトリ単位の GitHub Copilot usage metrics が一般提供に",
    jaSummary:
      "Copilot usage metrics REST API がリポジトリ単位の activity を返すようになった。新しい2つの endpoint で、Copilot coding agent と Copilot code review の pull request activity を日次・リポジトリ別に確認できる。",
    jaWhy:
      "組織全体の集計だけでなくリポジトリごとの導入状況を分析できるため、展開対象や改善策を絞り込みやすくなります。",
  },
  "GitHub Copilot app now available in the usage metrics API": {
    jaTitle: "usage metrics API で GitHub Copilot アプリの利用状況を確認可能に",
    jaSummary:
      "Copilot usage metrics API が、enterprise と organization の1日・28日レポートで GitHub Copilot アプリの利用状況を返すようになった。管理者はアプリの導入状況を可視化できる。",
    jaWhy:
      "デスクトップ アプリの定着を既存の usage reporting に含めて追えるため、展開効果を評価しやすくなります。",
  },
  "How VS Code Builds with AI": {
    jaTitle: "VS Code チームが AI を使って開発する方法",
    jaSummary:
      "VS Code チームが、GitHub Copilot の agent mode、自動テスト、AI を使った code review を自らの開発ワークフローにどう組み込んでいるかを紹介する記事。",
    jaWhy:
      "製品チーム自身の AI 活用例から、agent、テスト、レビューを組み合わせる実運用の考え方を学べます。",
  },
  "Take your local GitHub sessions anywhere": {
    jaTitle: "ローカルで始めた GitHub session をどこからでも継続",
    jaSummary:
      "VS Code や CLI で始めた作業をスマートフォンで完了できるようにする、GitHub Copilot session の remote control が github.com と GitHub Mobile で一般提供になった。",
    jaWhy:
      "デスクを離れても長時間の agent 作業を確認・再開できるため、承認待ちでタスクが止まる場面を減らせます。",
  },
  "Introducing Copilot CLI and agentic capabilities enhancements in JetBrains IDEs":
    {
      jaTitle: "JetBrains IDEs で Copilot CLI と agent 機能を強化",
      jaSummary:
        "GitHub Copilot for JetBrains IDEs で Copilot CLI が利用可能になり、CLI session の機能と agentic capabilities が拡張された。",
      jaWhy:
        "JetBrains を使う開発者も IDE 内から Copilot CLI の agent 作業を扱えるため、VS Code との運用差を縮められます。",
    },
  "Gemini models in Copilot CLI, cloud agent, and the Copilot app": {
    jaTitle: "Gemini モデルを Copilot CLI、cloud agent、Copilot アプリへ拡大",
    jaSummary:
      "Gemini 3.1 Pro（Preview）と Gemini 3.5 Flash が、Copilot CLI、Copilot cloud agent、GitHub Copilot アプリを含む追加の GitHub Copilot surface で利用可能になった。",
    jaWhy:
      "同じモデルを複数の Copilot surface で使えるため、タスクごとのモデル選択と検証を一貫して進めやすくなります。",
  },
  "Visual Studio Code 1.123: Session sync and chronicle": {
    jaTitle: "Visual Studio Code 1.123: session 同期と chronicle",
    jaSummary:
      "chat.sessionSync.enabled により、chat session が GitHub アカウントへ自動同期され、端末や workspace をまたいで検索できる個人の作業履歴として利用できるようになった。organization 管理の設定である。",
    jaWhy:
      "複数端末で agent 作業を続ける際の履歴断絶を減らせるため、session 管理とナレッジの再利用に役立ちます。",
  },
  "Visual Studio Code 1.124": {
    jaTitle: "Visual Studio Code 1.124 リリース",
    jaSummary:
      "Visual Studio Code 1.124（Insiders）の更新案内。release notes から新機能と実験的な変更を確認できる。",
    jaWhy:
      "Stable 公開前の変更を確認できるため、agent 機能や拡張との互換性を早めに検証できます。",
  },
  "From one-off prompts to workflows: How to use custom agents in GitHub Copilot CLI":
    {
      jaTitle:
        "単発 prompt から workflow へ: GitHub Copilot CLI の custom agent 活用法",
      jaSummary:
        "custom agent を使って、GitHub Copilot CLI にチームの技術スタックと workflow を理解させ、単発の terminal prompt を再利用可能でレビューしやすいプロセスへ変える方法を紹介している。",
      jaWhy:
        "CLI 活用を個人の prompt 技巧からチームの再現可能な運用へ進める際の、実践的な設計例になります。",
    },
  "Visual Studio Code 1.125": {
    jaTitle: "Visual Studio Code 1.125 リリース",
    jaSummary:
      "Visual Studio Code 1.125（Insiders）の更新案内。release notes から新機能と実験的な変更を確認できる。",
    jaWhy:
      "Insiders 段階の変更を事前に確認できるため、利用中の agent workflow への影響を早めに評価できます。",
  },
  "Give GitHub Copilot CLI real code intelligence with language servers": {
    jaTitle:
      "language server で GitHub Copilot CLI に本格的な code intelligence を追加",
    jaSummary:
      "GitHub Copilot CLI 向けに LSP server をインストール・構成し、grep や decompile に頼る探索を実際の code intelligence へ置き換える方法を紹介している。",
    jaWhy:
      "CLI agent のコード理解を強化できるため、大規模コードベースでの調査精度と作業効率を上げやすくなります。",
  },
  "Dedicated security review command now available in Copilot CLI": {
    jaTitle: "Copilot CLI で専用 security review command が利用可能に",
    jaSummary:
      "GitHub Copilot CLI からコード変更の security review を直接実行できる /security-review slash command が、experimental な public preview として提供された。",
    jaWhy:
      "terminal を離れずに security review を始められるため、実装から検証までの agent workflow をつなげやすくなります。",
  },
  "Copilot CLI: Configure everything from one place with /settings": {
    jaTitle: "Copilot CLI の設定を /settings に集約",
    jaSummary:
      "GitHub Copilot CLI に schema-driven な統合設定画面が追加された。/settings slash command が /theme、/streamer-mode、/experimental など散在していた設定をまとめる。",
    jaWhy:
      "CLI の導入・運用時に設定場所を探す負担が減るため、チームの標準設定を整えやすくなります。",
  },
  "Visual Studio Code 1.126": {
    jaTitle: "Visual Studio Code 1.126 リリース",
    jaSummary:
      "Visual Studio Code 1.126（Insiders）の更新案内。release notes から新機能と実験的な変更を確認できる。",
    jaWhy:
      "先行リリースの内容を把握できるため、agent と editor の更新を Stable 前に検証できます。",
  },
  "Use your own language model key in VS Code": {
    jaTitle: "VS Code で独自の language model key を利用する方法",
    jaSummary:
      "VS Code の bring your own key（BYOK）で、Azure、Anthropic、Gemini、OpenAI、Hugging Face、OpenRouter、Ollama、Foundry Local などのモデルを接続する方法を紹介している。",
    jaWhy:
      "GitHub 提供モデル以外を使う際の接続先、コスト、データ統制を設計するための実践的な参照になります。",
  },
  "New features and Claude as agent provider preview in JetBrains IDEs": {
    jaTitle: "JetBrains IDEs に新機能と Claude agent provider preview を追加",
    jaSummary:
      "GitHub の organization / enterprise agent 対応、Copilot CLI session の message queueing と steering、agent debug log summary view、Claude agent provider preview などが JetBrains IDEs に追加された。",
    jaWhy:
      "JetBrains 環境でも複数 agent の操作・監視を進められるため、IDE 横断の agent 運用を検討しやすくなります。",
  },
  "Visual Studio Code 1.127": {
    jaTitle: "Visual Studio Code 1.127 リリース",
    jaSummary:
      "Visual Studio Code 1.127（Insiders）の更新案内。release notes から新機能と実験的な変更を確認できる。",
    jaWhy:
      "Insiders での変更を早期に確認できるため、Stable 展開前の検証とフィードバックに役立ちます。",
  },
  "How Prompt Tuning Improved GPT-5.5 in VS Code": {
    jaTitle: "prompt tuning で VS Code の GPT-5.5 を改善した方法",
    jaSummary:
      "VS Code チームと OpenAI が2週間の実験で GPT-5.5 の system prompt を検証し、tool call と後半の token 使用量を減らしながら編集速度を上げた取り組みを紹介している。",
    jaWhy:
      "モデル変更なしでも prompt 設計でコストと速度を改善できることを示し、agent の継続的な評価・改善の参考になります。",
  },
  "Copilot agent session streaming is now in public preview": {
    jaTitle: "Copilot agent session streaming が public preview に",
    jaSummary:
      "enterprise managed users を持つ GitHub Enterprise Cloud 顧客が、github.com 上の cloud agent や data-resident deployment を含む全 Copilot client の agent session data へアクセスできる public preview が公開された。",
    jaWhy:
      "agent session の状態を横断的に扱えるため、Enterprise での監視、分析、統制の基盤を検討しやすくなります。",
  },
  "New C++ language server config skill for Copilot CLI": {
    jaTitle: "Copilot CLI 向け C++ language server 設定 skill を追加",
    jaSummary:
      "Microsoft C++ Language Server が Copilot Plugins marketplace の plugin として利用可能になった。新しい built-in setup skill が project setup を自動化し、C++ code intelligence を導入しやすくする。",
    jaWhy:
      "C++ プロジェクトで Copilot CLI のコード理解を強化できるため、language server 導入の手作業を減らせます。",
  },
  "GitHub Mobile: Live notifications for Copilot CLI sessions": {
    jaTitle: "GitHub Mobile で Copilot CLI session の live notification に対応",
    jaSummary:
      "GitHub Mobile の live coding agent notification が、GitHub Mobile 外で開始した remote Copilot CLI session に対応した。session が進行する間もモバイルから agent 作業とつながりやすくなる。",
    jaWhy:
      "terminal で始めた長時間作業の状態を外出先でも把握できるため、承認待ちや完了を見逃しにくくなります。",
  },
  "Visual Studio Code 1.128: Multiple chats in a session now supports Claude agent":
    {
      jaTitle:
        "Visual Studio Code 1.128: session 内の複数 chat が Claude agent に対応",
      jaSummary:
        "Agents Window の Claude agent-host session が Anthropic Claude Agent SDK を使った agentic coding に対応し、関連する会話スレッドを一つの session にまとめる multiple chats を利用できるようになった。",
      jaWhy:
        "長い作業を話題ごとに分けながら同じ session の文脈を保てるため、Claude agent を使う複雑なタスクの整理に役立ちます。",
    },
  "Visual Studio Code 1.129: The agent host": {
    jaTitle: "Visual Studio Code 1.129: agent host の導入",
    jaSummary:
      "VS Code の agent session を、Copilot、Claude、Codex などの agent harness を実行する専用 process である agent host を中心に再設計する。Agent Host Protocol（AHP）により、一つの session を複数の VS Code window から接続・表示できる。",
    jaWhy:
      "agent session の実行基盤が変わるため、複数 window や複数 agent を使う運用の拡張性・観測性に影響します。",
  },
  "Visual Studio Code 1.123: Retry network-dependent commands in the sandbox": {
    jaTitle:
      "Visual Studio Code 1.123: sandbox 内でネットワーク依存コマンドを再試行",
    jaSummary:
      "local agent が許可済みでない domain へ接続する terminal command を実行した場合、chat.agent.sandbox.retryWithAllowNetworkRequests により unrestricted network access を持つ sandbox で自動再試行できる。再試行後も失敗した場合は sandbox 外へ fallback する。",
    jaWhy:
      "ネットワークが必要な作業で agent が止まりにくくなる一方、sandbox の通信境界が変わるため設定とセキュリティ方針の確認が必要です。",
  },
  "Visual Studio Code 1.124: Background send for new sessions": {
    jaTitle: "Visual Studio Code 1.124: 新規 session への background send",
    jaSummary:
      "新しい session の読み込み完了を待たず、Alt+Enter または Send 操作で request を background に送れるようになった。view は選択モデルと context を保ったまま即座に次の入力へ戻り、複数 session を続けて開始できる。",
    jaWhy:
      "新規 agent session の起動待ちを減らし、調査や並列タスクを続けて投入する際の操作速度を上げられます。",
  },
  "Visual Studio Code 1.125: View your additional spend usage in VS Code": {
    jaTitle: "Visual Studio Code 1.125: VS Code で追加利用分の使用量を確認",
    jaSummary:
      "Copilot status dashboard に追加 Copilot budget の消費率が表示され、overage charge に達する前に利用量を調整できるようになった。詳細な usage と追加利用の管理は Copilot settings から確認できる。",
    jaWhy:
      "従量利用の消費状況を editor 内で把握できるため、利用者と管理者がコスト超過を早めに避けやすくなります。",
  },
  "Visual Studio Code 1.126: Session-level cost information": {
    jaTitle: "Visual Studio Code 1.126: session 単位の cost information",
    jaSummary:
      "個々の turn だけでなく chat session 全体の cost を確認できるようになった。どの session が多くの credit を消費しているかを把握し、利用量を継続的に管理しやすくする。",
    jaWhy:
      "長い agent session のコストを全体として見えるため、高コストな作業パターンの発見と改善に役立ちます。",
  },
  "Visual Studio Code 1.127: Agents window (Preview)": {
    jaTitle: "Visual Studio Code 1.127: Agents Window の改善（Preview）",
    jaSummary:
      "Agents Window は、プロジェクトやマシンをまたぐ agent session の探索、反復、review に最適化した companion window である。session list を group 化し、並列実行で増えた session を整理しやすくする改善が入った。",
    jaWhy:
      "複数 agent を同時に動かす環境で session 一覧を見失いにくくなるため、並列作業の監督とレビューを進めやすくなります。",
  },
  "Visual Studio Code 1.128: Chat without a selected workspace in the Agents window":
    {
      jaTitle:
        "Visual Studio Code 1.128: Agents Window で workspace 未選択の chat を開始",
      jaSummary:
        "Agents Window で workspace を選ばずに chat を開始できるようになった。フォルダーに紐付かない質問は Chats section に表示され、workspace の chat、files、changes を使うプロジェクト作業と分けて扱える。",
      jaWhy:
        "軽い質問とリポジトリ作業を同じ Agents Window で混ぜずに扱えるため、session の目的と context を整理しやすくなります。",
    },
  "Visual Studio Code 1.129: New editor panel in the Agents window (Experimental)":
    {
      jaTitle:
        "Visual Studio Code 1.129: Agents Window の新しい editor panel（Experimental）",
      jaSummary:
        "Agents Window に、agent との会話と生成された files / changes の detail area を共通 tab bar を持つ docked pane にまとめる再設計された editor panel が追加された。main editor に近い感覚で agent の作業を review できる。",
      jaWhy:
        "会話と変更内容を行き来する review 操作がまとまるため、agent の成果物を確認・修正する負担を減らせます。",
    },
  "Visual Studio Code 1.123: Agents window (Preview)": {
    jaTitle:
      "Visual Studio Code 1.123: Agents Window の複数 session 表示（Preview）",
    jaSummary:
      "Agents Window で複数の agent session を並べて開けるようになった。別の session を side-by-side で表示し、プロジェクトやマシンをまたぐ agent 作業を探索・反復・review しやすくする。",
    jaWhy:
      "並列で動く agent task を同時に確認できるため、複数 session の監督と比較を一つの画面で進めやすくなります。",
  },
  "Visual Studio Code 1.123: Research agent (Preview)": {
    jaTitle: "Visual Studio Code 1.123: Research agent の導入（Preview）",
    jaSummary:
      "Copilot CLI の local session で利用できる preview の research agent が、未知のコード、ライブラリ、API を深く調べ、コードベースと外部情報を収集・統合した引用付き Markdown report を作成する。",
    jaWhy:
      "実装前の調査を agent に委任できるため、複雑な技術選定やコード理解の初動を短縮しやすくなります。",
  },
  "Visual Studio Code 1.124: Navigate between sessions": {
    jaTitle: "Visual Studio Code 1.124: session 間の移動を改善",
    jaSummary:
      "複数の agent session を素早く探して切り替えるため、searchable picker、back / forward navigation、位置を指定した直接移動など、keyboard 中心の session navigation が追加された。",
    jaWhy:
      "session 数が増えても目的の作業へ戻りやすくなるため、並列 agent 作業でのコンテキスト切り替えを減らせます。",
  },
  "Visual Studio Code 1.124: Restore sessions on reload": {
    jaTitle: "Visual Studio Code 1.124: reload 後に session を復元",
    jaSummary:
      "Agents Window を reload または再度開いた後も、表示していた session、並び順、active / pinned 状態、session ごとの layout を自動復元できるようになった。",
    jaWhy:
      "再起動や window の開き直しで作業配置を組み直す必要が減るため、長時間の agent 作業を継続しやすくなります。",
  },
  "Visual Studio Code 1.124: Close all sessions": {
    jaTitle: "Visual Studio Code 1.124: すべての session を一括で閉じる",
    jaSummary:
      "新しい Close All Sessions command により、開いている session を一度に閉じられるようになった。session に focus がある状態で Ctrl+K Ctrl+W（macOS では Cmd+K Cmd+W）などから利用できる。",
    jaWhy:
      "多数の session を個別に閉じる手間が減るため、新しい作業へ切り替える前の整理を素早く行えます。",
  },
  "Visual Studio Code 1.125: Install model providers from the Language Models editor":
    {
      jaTitle:
        "Visual Studio Code 1.125: Language Models editor から model provider を導入",
      jaSummary:
        "BYOK 以外にも extension が model provider を提供できるようになり、Language Models editor の Install Model Providers ボタンから該当 extension を検索・導入しやすくなった。",
      jaWhy:
        "必要な provider extension を発見しやすくなるため、VS Code のモデル接続先を拡張する導入障壁を下げられます。",
    },
  "Visual Studio Code 1.125: Better agentic interaction with forwarded ports": {
    jaTitle: "Visual Studio Code 1.125: forwarded port を使う agent 操作を改善",
    jaSummary:
      "remote workspace で agent が forwarded port を要求した際、remote proxy が無効なら URL を書き換え、その変更を agent へ通知するようになった。port 番号の違いで browser を開きにくかった問題を緩和する。",
    jaWhy:
      "remote development で agent が開発中のアプリへアクセスしやすくなり、browser を使う検証フローの失敗を減らせます。",
  },
  "Visual Studio Code 1.125: Extension auto-update setting": {
    jaTitle: "Visual Studio Code 1.125: extension 自動更新設定",
    jaSummary:
      "extensions.autoUpdate 設定により、extension の自動更新を有効または無効にできる。organization で管理される設定として、管理者が利用者の更新方針を統制できる。",
    jaWhy:
      "extension 更新の速度と安定性のバランスを組織単位で決められるため、開発環境の変更管理に役立ちます。",
  },
  "Visual Studio Code 1.126: Multiple chats in an agent host Copilot session": {
    jaTitle:
      "Visual Studio Code 1.126: agent host の Copilot session で複数 chat を保持",
    jaSummary:
      "Agents Window の agent host から開始した Copilot session が複数の chat を同時に保持できるようになった。同じ workspace と作業 context を共有したまま、関連する会話を並行して進められる。",
    jaWhy:
      "一つの実装を待つ間に別の調査を進められるため、長い agent task の並列性と文脈維持を両立できます。",
  },
  "Visual Studio Code 1.126: Agentic code feedback with agent host harnesses": {
    jaTitle:
      "Visual Studio Code 1.126: agent host harness での agentic code feedback",
    jaSummary:
      "Agents Window で生成コードへ残した comment が agent host に保存され、listComments や resolveComments などの server-side tool を通じて agent がフィードバックを扱えるようになった。client を切断しても comment は保持される。",
    jaWhy:
      "生成コードへのレビュー指摘を session をまたいで agent と共有できるため、修正依頼と確認のループを安定させられます。",
  },
  "Visual Studio Code 1.126: Open new folders in Restricted Mode": {
    jaTitle:
      "Visual Studio Code 1.126: 新しい folder を Restricted Mode で開く",
    jaSummary:
      "Workspace Trust が、新しい folder を開くときに直ちに trust dialog を出す代わりに、まず Restricted Mode で内容を確認できるようになった。未知のコードを開く際の安全境界を保つ。",
    jaWhy:
      "不明なリポジトリを先に確認してから trust を判断できるため、agent と terminal を使う前の安全確認を進めやすくなります。",
  },
  "Visual Studio Code 1.127: Troubleshoot agent behavior with /troubleshoot": {
    jaTitle: "Visual Studio Code 1.127: /troubleshoot で agent の挙動を診断",
    jaSummary:
      "/troubleshoot skill が chat session log を分析して agent の挙動を診断できるようになった。custom instructions が無視される理由や応答が遅い理由を調べられ、local / remote の agent host session も対象になる。",
    jaWhy:
      "再現が難しい agent 問題を session log から調査できるため、カスタマイズや性能のトラブルシュートを進めやすくなります。",
  },
  "Visual Studio Code 1.127: Subagent credits": {
    jaTitle: "Visual Studio Code 1.127: subagent の AI credit を表示",
    jaSummary:
      "agent が subagent へ委任した作業の cost を可視化するため、chat response の subagent section に hover するとその subagent が使った AI credit を確認できるようになった。",
    jaWhy:
      "委任した作業のコストを把握できるため、subagent を多用する workflow の費用対効果を評価しやすくなります。",
  },
  "Visual Studio Code 1.127: Sandboxing for terminal commands on macOS and Linux":
    {
      jaTitle:
        "Visual Studio Code 1.127: macOS / Linux の terminal command を sandbox 化",
      jaSummary:
        "macOS と Linux で、agent が起動する terminal command を network access を遮断し filesystem access を制限した sandbox 内で実行する rollout が始まった。sandbox 外の権限が必要なときだけ承認を求める。",
      jaWhy:
        "command ごとの承認負荷を下げながら安全境界を保てるため、agent の自律実行を段階的に広げやすくなります。",
    },
  "Visual Studio Code 1.128: Read-only subagent chats in the Agents window (Preview)":
    {
      jaTitle:
        "Visual Studio Code 1.128: Agents Window の read-only subagent chat（Preview）",
      jaSummary:
        "agent が subagent へ委任した作業の進捗を、main conversation を中断せず read-only peer chat として追えるようになった。subagent chat は必要になるまで tab strip から隠される。",
      jaWhy:
        "worker agent の進行を見守りながら主作業を続けられるため、複数 subagent を使う workflow の監督がしやすくなります。",
    },
  "Visual Studio Code 1.128: Keyboard shortcuts for chats in the Agents window":
    {
      jaTitle:
        "Visual Studio Code 1.128: Agents Window の chat 用 keyboard shortcut",
      jaSummary:
        "Agents Window の multi-chat session で、chat の作成、再表示、次・前の chat への移動、open chat の切り替え、active tab の終了や削除を keyboard から操作できるようになった。",
      jaWhy:
        "複数 chat を使う session で mouse 操作を減らせるため、agent との対話を素早く切り替えられます。",
    },
  "Visual Studio Code 1.129: Session-management tools for Agent Host sessions":
    {
      jaTitle: "Visual Studio Code 1.129: Agent Host session の管理 tool",
      jaSummary:
        "agent host 上で動く Copilot、Claude、Codex が、現在の会話を離れずに他の session と chat を列挙、作成、観察、操作できる session-management tools を利用できるようになった。",
      jaWhy:
        "agent 自身が複数 session の状態を把握して作業を振り分けられるため、複雑なマルチ agent 運用の土台になります。",
    },
  "Visual Studio Code 1.129: Agents window improvements": {
    jaTitle: "Visual Studio Code 1.129: Agents Window の改善",
    jaSummary:
      "Agents Window の new-session flow に、前回の agent mode と approval 設定を記憶する既定値、folder / worktree isolation の選択を簡単にする checkbox などの小さな改善が入った。",
    jaWhy:
      "新しい agent session を繰り返し作る際の設定操作が減るため、日常的な agent 作業の開始を速くできます。",
  },
});
