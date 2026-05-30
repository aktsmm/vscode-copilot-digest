export function safeDate(value) {
  const date = new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

const officialSourceIds = new Set([
  "github-changelog",
  "github-changelog-copilot",
  "github-copilot-blog",
  "vscode-feed",
  "vscode-updates",
  "vscode-release-notes-1-109",
  "copilot-whats-new",
]);

const sourceGroupPriority = {
  github: 4,
  vscode: 3,
  platform: 2,
  other: 1,
};

const monthMap = {
  January: "1月",
  February: "2月",
  March: "3月",
  April: "4月",
  May: "5月",
  June: "6月",
  July: "7月",
  August: "8月",
  September: "9月",
  October: "10月",
  November: "11月",
  December: "12月",
};

const vscodeReleaseSummaries = {
  1.121: {
    ja: "agent 体験の継続強化が主題の release。Agents ウィンドウの継続改善に加え、リモートマシン上での agent セッション実行（Experimental）、OpenTelemetry と Azure Managed Grafana による agent observability、Claude agent の Auto 権限モードプレビューが含まれる。",
    en: "This release continues to strengthen the agent experience with further Agents window improvements, experimental remote-machine agent session execution, OpenTelemetry and Azure Managed Grafana agent observability, and a Claude agent Auto permission mode in preview.",
  },
  "1.120": {
    ja: "Agents ウィンドウが VS Code Stable にプレビュー公開され、複数プロジェクト・複数 agent の作業専用画面が使えるようになった。BYOK モデルへの token 使用量の可視化と thinking effort 設定、Copilot CLI plugin の自動検出も追加。terminal tool 出力圧縮、terminal コマンドのリスク評価、Claude と Copilot CLI への Plan mode 制御など、agent の実用性を高める変更がまとまった release。",
    en: "The Agents window moves to Stable preview, providing a dedicated companion window for multi-project and multi-agent work. The release also adds BYOK model token usage visibility, thinking-effort controls for BYOK reasoning models, automatic discovery of Copilot CLI plugins in VS Code, terminal tool-output compression, terminal command risk assessment, and Plan mode control for Claude and Copilot CLI.",
  },
  1.119: {
    ja: "Changes ビューが Git 統合になり、terminal 経由の変更も含めて agent セッション中のファイル変更全体を把握しやすくなった。Copilot CLI にモデルバッジが追加され、使用モデルと multiplier を応答ごとに確認できる。新しい sandbox モードではファイルシステム隔離を維持しながら外部ネットワークアクセスも許可でき、オンライン通信が必要なタスクへの対応が広がった。ブラウザータブをチャットのコンテキストとして添付する機能や、model picker への実コスト表示なども加わった。",
    en: "The Changes view in agent host sessions is now powered by Git, capturing all file changes including those from terminal commands. Copilot CLI adds model badges showing the model and multiplier used for each response. A new sandbox mode allows outbound network traffic while keeping filesystem isolation, expanding extension and task support. Additional highlights include browser-tab snapshots as chat context and actual model costs in the model picker.",
  },
  1.122: {
    ja: "agent 体験と BYOK 運用をさらに広げる release。Agents ウィンドウの hover details や local harness 改善、agent session の OpenTelemetry 属性、sandboxing の再試行挙動変更に加え、GitHub sign-in なしの BYOK と integrated browser の device emulation が入った。",
    en: "This release expands agent workflows and BYOK operations with Agents window hover details and local-harness improvements, OpenTelemetry attributes for agent sessions, updated sandbox retry behavior, BYOK without GitHub sign-in, and integrated-browser device emulation.",
  },
  1.118: {
    ja: "agent 体験の拡張が主題の release。VS Code Agents companion app の進化（Insiders）、GitHub.com やモバイルから進行中の Copilot CLI セッションを遠隔操作できる Remote control（Experimental）、CLI セッションタイトルのサーフェス横断一元管理、Copilot の Git co-author 自動追加が入った。全ユーザーへの semantic indexing 展開と GitHub 横断テキスト検索、skills 専用コンテキスト（Experimental）も加わり、agent を継続運用しやすくする変更がまとまっている。",
    en: "The headline is agent experience: the VS Code Agents companion app gains a title-bar entry point (Insiders), CLI sessions can be monitored and steered remotely from GitHub.com or mobile (Experimental), session titles now sync across all surfaces, and Copilot is added as a Git co-author by default. All users also get semantic indexing in non-GitHub repos and GitHub cross-repo text search.",
  },
  1.117: {
    ja: "Copilot Business / Enterprise ユーザー向け BYOK 対応が入り、OpenRouter・Ollama・Google・OpenAI など自前 API key でモデルを chat に接続できるようになった。chat 応答の incremental rendering（Experimental）追加、Agent Sessions ビューでの最終更新順ソート、background terminal コマンドのシステム通知対応など、agent 体験全体を使いやすくする変更がまとまって入った。",
    en: "This release brings BYOK for Copilot Business and Enterprise, letting organizations connect their own API keys for providers like OpenRouter, Ollama, Google, and OpenAI. It also adds experimental incremental rendering for chat responses, sort-by-recent-activity in Agent Sessions, and system notifications for background terminal commands, making agent workflows more practical day-to-day.",
  },
  1.116: {
    ja: "デバッグ体験と agent 操作性の強化が中心。前のセッションの agent debug log をディスクに保存して後から確認できるようになり、Copilot CLI での thinking effort 設定、Chat Customizations ウェルカムページ、tool 確認 carousel（Experimental）、GitHub Copilot の組み込み対応が入った。",
    en: "This release focuses on debugging and agent operability: previous agent session logs can now be stored and reviewed, Copilot CLI gains thinking-effort controls, the Chat Customizations dialog gets a welcome page with AI-assisted drafting, a tool-confirmation carousel lands as experimental, and GitHub Copilot is now built in without a separate extension.",
  },
  1.115: {
    ja: "VS Code Agents companion app の preview 追加に加え、browser tool のラベル改善と重複タブ抑制、background terminal への send_to_terminal、background terminal notifications、Edit Mode 撤去時期の明確化が入った。agent を長時間タスク込みで扱いやすくする release。",
    en: "This release adds the VS Code Agents preview app, clearer browser tool labels with duplicate-tab suppression, send_to_terminal plus background terminal notifications, and a firmer Edit Mode removal timeline to make longer agent workflows more practical.",
  },
  1.114: {
    ja: "chat 体験の整理が中心。画像カルーセルで動画もプレビューでき、最終回答だけをコピーするコマンドや、過去セッションにも使える /troubleshoot が入った。#codebase は常に semantic search となり、TypeScript 6.0 にも対応した。",
    en: "This release focuses on streamlining chat: video previews in the carousel, a Copy Final Response command, /troubleshoot support for previous sessions, a simplified semantic-only #codebase flow, and TypeScript 6.0 support.",
  },
  1.113: {
    ja: "チャットカスタマイズを 1 画面で管理するエディタ、モデル picker からの思考量切り替え、CLI / Claude agent での MCP 対応と session fork、入れ子の subagent、画像プレビュー、新しい既定テーマが中心。",
    en: "The main themes are a unified chat customizations editor, thinking-effort controls in the model picker, MCP and session forking for CLI and Claude agents, nested subagents, image preview, and refreshed default themes.",
  },
  1.112: {
    ja: "agent 運用と開発体験の改善が中心。Copilot CLI の steering / queueing と権限レベル、/troubleshoot と debug log の export/import、画像とバイナリ対応、monorepo customization、MCP sandboxing、統合ブラウザーのデバッグが入った。",
    en: "This release improves both agent and developer experience with Copilot CLI steering and permission levels, /troubleshoot plus debug-log export and import, image and binary support, monorepo customizations, MCP sandboxing, and integrated browser debugging.",
  },
  1.111: {
    ja: "週次 stable 化後の最初のリリース。agent permission picker、Autopilot preview、agent-scoped hooks、debug event snapshot、改善された chat tips、AI CLI profile group など、agent の自律性と運用性を前に進めた。",
    en: "The first weekly Stable release introduced the agent permission picker, Autopilot preview, agent-scoped hooks, debug event snapshots, improved chat tips, and an AI CLI profile group to make agents more autonomous and easier to operate.",
  },
  "1.110": {
    ja: "Agent plugin やブラウザー自動操作ツール、session memory、context compaction、chat session fork など agent 拡張性とセッション管理を中心に強化。NES の長距離版、Kitty graphics protocol、TypeScript 7 への内部移行も進んだ。",
    en: "The release advances agent extensibility via agent plugins, agentic browser tools, session memory, context compaction, and chat session forking. Long-distance NES, Kitty graphics protocol support, and TypeScript-Go adoption for internal builds also landed.",
  },
  1.109: {
    ja: "multi-agent development を前面に出したリリース。message steering と queueing、agent hooks、Claude 設定互換、slash command としての skills、session 管理、Copilot Memory、sandboxing、統合ブラウザー強化などがまとまって入った。",
    en: "This release positioned VS Code as the home for multi-agent development, with message steering and queueing, agent hooks, Claude config compatibility, skills as slash commands, session management, Copilot Memory, sandboxing, and integrated browser improvements.",
  },
  1.108: {
    ja: "年末ハウスキーピングで 6,000 件の issue をクローズ。Agent Skills (Experimental)、session picker 統合、terminal tool の auto approve 拡大、custom glyph 800 種対応、git blame の ignore-whitespace 設定が追加された。",
    en: "The December housekeeping closed nearly 6,000 issues. Agent Skills (Experimental), session picker unification, expanded terminal auto-approve rules, 800 custom glyphs, and a git blame ignore-whitespace setting were added.",
  },
  1.107: {
    ja: "マルチエージェント連携が主題。Agent Sessions と Chat の統合ビュー、ローカルセッションのバックグラウンド継続、Git worktree 隔離、Claude skills 再利用、custom agent のサブエージェント化、org 共有 agent (Experimental) が入った。",
    en: "Multi-agent orchestration is the headline. Agent Sessions are unified into the Chat view with local sessions running in background, Git worktree isolation, Claude skills reuse, custom agents as subagents, and org-shared agents (Experimental).",
  },
  1.106: {
    ja: "Agent HQ を一元管理するリリース。Agent Sessions view、Plan agent、Cloud / CLI agent 統合、chat mode → custom agent リネーム、Terminal IntelliSense GA、inline suggestions OSS 化、tool approval と trust 強化が入った。",
    en: "The release centers on Agent HQ: Agent Sessions view, Plan agent, Cloud and CLI agent integration, chat modes renamed to custom agents, Terminal IntelliSense GA, inline suggestions open-sourced, and enhanced tool approval and trust.",
  },
};

const exactSummaryMappings = {
  "Visual Studio Code 1.114: Preview videos in the image carousel": {
    ja: "チャット添付や Explorer のコンテキストメニューから開く画像カルーセルで、動画もそのまま再生・切り替えできるようになった。画像と動画を同じビューアーで確認でき、会話中の確認作業がしやすくなる。",
    en: "The image carousel now supports videos from chat attachments and the Explorer context menu, so images and videos can be previewed and navigated in the same viewer.",
  },
  "Visual Studio Code 1.114: Copy final response in chat": {
    ja: "チャットのコンテキストメニューに、agent の思考や tool call を除いた最終 Markdown 部分だけをコピーするコマンドが追加された。共有や転記のときに最終回答だけを抜き出しやすい。",
    en: "Chat now includes a Copy Final Response command that copies only the final Markdown section of the agent response, excluding thinking traces and tool calls.",
  },
  "Visual Studio Code 1.114: Workspace search simplification": {
    ja: "#codebase が常に semantic search 専用になり、local index と remote index の区別も廃止された。index 管理を意識せず、より一貫したコードベース検索を agent が使えるようになる。",
    en: "The #codebase tool is now purely semantic and no longer distinguishes between local and remote indexes, giving agents more consistent workspace search without manual index management.",
  },
  "Visual Studio Code 1.114: Troubleshoot previous chat sessions (Preview)": {
    ja: "/troubleshoot で過去の chat session を #session から選んで調査できるようになった。問題を再現しなくても、以前の session の debug log をもとに振る舞いを追いやすい。",
    en: "The /troubleshoot flow can now inspect previous chat sessions via #session, making it easier to diagnose problems after the fact without reproducing them.",
  },
  "GitHub Copilot CLI combines model families for a second opinion": {
    ja: "Copilot CLI に experimental な Rubber Duck が入り、別モデル系列からセカンドオピニオンを受けられるようになった。計画直後や複雑な実装後、テスト前の見落とし検出に効く。",
    en: "Copilot CLI now has an experimental Rubber Duck reviewer that asks a model from a different family to critique plans and implementations at high-value checkpoints, helping catch blind spots before they compound.",
  },
  "Agent-driven development in Copilot Applied Science": {
    ja: "Copilot Applied Science チームが、評価データ分析の toil を減らすために agent-first なリポジトリと運用を整えた事例。/plan を軸にした計画、継続的な refactor と docs、process で agent を支える考え方が中心。",
    en: "A Copilot Applied Science case study on building an agent-first repository to automate benchmark-analysis toil, emphasizing planning with /plan, continuous refactoring and documentation, and process guardrails over blaming agents.",
  },
  "Building AI-powered GitHub issue triage with the Copilot SDK": {
    ja: "Copilot SDK と Copilot CLI をサーバー側で動かし、React Native の issue triage アプリに AI 要約を組み込む実装例。session lifecycle の後始末、fallback、cache を含めて本番運用寄りの構成が示されている。",
    en: "A practical example of adding AI issue triage to a React Native app by running the Copilot SDK and Copilot CLI server-side, with production-minded patterns for session cleanup, fallback behavior, and cached summaries.",
  },
  "マイクロソフト、Claude CodeやGitHub Copilotに「このアプリをデプロイせよ」と指示すればAIが最適なインフラ構成やサービスでデプロイしてくれる「Azure Skills Plugin」公開":
    {
      ja: "Microsoft が Azure Skills Plugin を公開し、Claude Code や GitHub Copilot にアプリ配備を指示すると、適した Azure インフラやサービス構成の提案とデプロイ実行を進められるようにする内容。AI agent にクラウド構成判断を持たせる流れとして注目される。",
      en: "Japanese-language coverage of Microsoft's Azure Skills Plugin, which lets Claude Code and GitHub Copilot guide Azure infrastructure selection and application deployment more autonomously.",
    },
  "GitHub Copilot CLI、メインのAIモデルとは異なるAIモデルをセカンドオピニオンに使う「Rubber Duck」モード":
    {
      ja: "GitHub Copilot CLI の experimental な Rubber Duck モードを紹介する記事。メインとは別の AI モデルをセカンドオピニオン役として呼び、計画や実装の見落とし確認に使える点が主題。",
      en: "Japanese-language coverage of GitHub Copilot CLI's Rubber Duck mode, which brings in a second model as a reviewer to critique plans and implementation decisions.",
    },
  "Continuous AI for accessibility: How GitHub transforms feedback into inclusion":
    {
      ja: "アクセシビリティに関するフィードバックを継続的に AI で取り込み、製品改善へ回す GitHub の取り組み。単発修正で終わらせず、改善ループを開発プロセスへ組み込む考え方が主題。",
      en: "A look at how GitHub uses AI continuously to turn accessibility feedback into product improvements, treating accessibility work as an ongoing loop rather than a one-off fix.",
    },
  "The era of “AI as text” is over. Execution is the new interface.": {
    ja: "AI をテキスト応答だけでなく実行主体として組み込む時代に入った、という整理。Copilot SDK や MCP を前提に、agent が action を起こす interface として AI を使う考え方が主題。",
    en: "A framing piece that argues AI should be treated as an execution layer, with tools, SDKs, and workflows that let agents take action instead of only returning text.",
  },
  "Join or host a GitHub Copilot Dev Days event near you": {
    ja: "GitHub Copilot Dev Days の参加・開催案内。近隣イベントへの参加や、自分でイベントを主催するための情報がまとまっている。",
    en: "An announcement for GitHub Copilot Dev Days that points readers to nearby events and explains how to host one themselves.",
  },
  "From idea to pull request: A practical guide to building with GitHub Copilot CLI":
    {
      ja: "Copilot CLI を起点に計画し、IDE で判断し、最後は GitHub の pull request へつなぐ実践ガイド。issue 作成から Node.js CLI アプリ実装、テスト、PR までをハンズオンで追える。",
      en: "A practical guide to starting in Copilot CLI, making decisions in the IDE, and finishing in a GitHub pull request, walking through issue creation, app implementation, tests, and reviewable output.",
    },
  "What's new with GitHub Copilot coding agent": {
    ja: "GitHub Copilot coding agent の最近の更新まとめ。branch や pull request をまたぐ開発フローと、agent の作業体験がどう広がったかを俯瞰できる。",
    en: "A roundup of recent GitHub Copilot coding agent changes, useful for understanding how branch, pull request, and agent workflows are expanding.",
  },
  "Dungeons & Desktops: Building a procedurally generated roguelike with GitHub Copilot CLI":
    {
      ja: "GitHub Copilot CLI を使い、任意のコードベースを手続き生成ローグライクのダンジョンに変換する拡張を作った実践記事。Copilot CLI を使った試作の進め方を具体例で確認できる。",
      en: "A practical post showing how one engineer used GitHub Copilot CLI to build an extension that turns any codebase into a procedurally generated roguelike dungeon.",
    },
  "Fix merge conflicts in three clicks with Copilot cloud agent": {
    ja: "github.com の pull request 上で、新しい Fix with Copilot ボタンからマージ競合を 3 クリックで解消できるようになった。コメント送信後は Copilot cloud agent が競合解消、build と test の確認、push までをクラウド実行環境で処理する。",
    en: "Pull requests on github.com can now resolve merge conflicts in three clicks through a new Fix with Copilot button, with Copilot cloud agent handling conflict resolution, build and test validation, and the push from its cloud environment.",
  },
  "GitHub recognized as a Leader in the Gartner® Magic Quadrant™ for Enterprise AI Coding Agents for the third year in a row":
    {
      ja: "GitHub は 2026 年の Gartner Magic Quadrant for Enterprise AI Coding Agents で 3 年連続の Leader と位置付けられ、実行力では 12 ベンダー中で最上位とされた。GitHub は複数モデル対応、issue から code review・pull request・Actions までをまたぐ agentic workflow、ガバナンスとセキュリティ統制を強みとして挙げている。",
      en: "GitHub says it was named a Leader for the third consecutive year in Gartner's 2026 Magic Quadrant for Enterprise AI Coding Agents and ranked highest in ability to execute among the 12 evaluated vendors. The post highlights GitHub's multi-model support, agentic workflows spanning issues through code review, pull requests, and Actions, plus governance and security controls as key differentiators.",
    },
  "Model selection for Claude and Codex agents on github.com": {
    ja: "github.com 上の Claude / Codex サードパーティ coding agent で、タスク開始時にモデルを選べるようになった。Claude では Anthropic 系、Codex では OpenAI 系の利用可能モデルから選択でき、最新モデルが順次使える。Business / Enterprise では管理者が対象 policy を有効化し、リポジトリ側でも Settings > Copilot > Cloud agent から agent を有効化する必要がある。",
    en: "Model selection is now available when starting tasks with the Claude and Codex third-party coding agents on github.com, with Anthropic models for Claude and OpenAI models for Codex. Business and Enterprise users must have the relevant admin policy enabled, and the repository owner must also enable the agent in Copilot cloud-agent settings.",
  },
  "Copilot data residency in US + EU and FedRAMP compliance now available": {
    ja: "GitHub Copilot が US / EU リージョンの data residency に対応し、推論処理と関連データを指定地域内に保持できるようになった。米国政府向けには FedRAMP Moderate 準拠のモデルホストと基盤も提供される。GA の Copilot 機能一式が対象で、利用時は管理者が Copilot settings で policy を明示的に有効化する必要があり、data-resident / FedRAMP リクエストには model multiplier が 10% 上乗せされる。",
    en: "GitHub Copilot now supports US and EU data residency so inference processing and related data stay within the chosen geography, and US government customers also get FedRAMP Moderate compliant infrastructure. The generally available Copilot feature set is covered, admins must explicitly enable the policy, and data-resident or FedRAMP requests carry a 10% model-multiplier increase.",
  },
  "Remote control CLI sessions on web and mobile in public preview": {
    ja: "Copilot CLI の実行中セッションを Web とモバイルから遠隔操作できる `copilot --remote` が public preview になった。ローカル端末で走らせたまま、ブラウザーやモバイル側から進行確認や指示の継続ができるようにする更新。",
    en: "`copilot --remote` is now in public preview, letting running Copilot CLI sessions be monitored and steered from the web or mobile while the local terminal continues the work.",
  },
  "Enforcing new limits and retiring Opus 4.6 Fast from Copilot Pro+": {
    ja: "GitHub Copilot Pro+ で高い同時実行や集中的な利用が増えていることを受け、新しい利用制限を導入し、Opus 4.6 Fast を提供対象から外すと告知した。過度な利用を抑えつつ、正規利用者向けの安定運用を守るための変更。",
    en: "GitHub is introducing new usage limits for Copilot Pro+ and retiring Opus 4.6 Fast after seeing more high-concurrency, high-intensity usage patterns, aiming to preserve a stable experience for legitimate users.",
  },
  "Building Long-Distance Next Edit Suggestions": {
    ja: "離れた位置まで一度に編集提案する Long-Distance Next Edit Suggestions の実装解説。長距離編集候補を成立させるためのモデル設計と評価の工夫が主題。",
    en: "A technical deep dive into making Next Edit Suggestions work across larger distances in a file, covering the model and product changes needed for more ambitious edit predictions.",
  },
  "Your Home for Multi-Agent Development": {
    ja: "VS Code をマルチエージェント開発のハブとして位置づける記事。複数 agent の役割分担や session 管理をひとつの開発体験として扱う方向性が示されている。",
    en: "An overview of how VS Code is positioning itself as the hub for multi-agent development, bringing agent roles, sessions, and tools into one workflow.",
  },
  "Making agents practical for real-world development": {
    ja: "agent を実運用に載せるための VS Code 側の改善をまとめた記事。guardrail、context、debugging など、試用から日常利用へ進めるための整理が中心。",
    en: "A VS Code article about the work required to make agents usable in day-to-day development, especially around context, guardrails, debugging, and trust.",
  },
  "Giving Agents a Visual Voice: MCP Apps Support in VS Code": {
    ja: "VS Code で MCP Apps を扱えるようにし、agent がテキストだけでなく UI を伴う形で結果を返せるようにする解説。MCP を通じた app 的な拡張体験が主題。",
    en: "An explanation of MCP Apps support in VS Code, which lets agents return richer app-like experiences instead of only plain text responses.",
  },
  "Building docfind: Fast Client-Side Search with Rust and WebAssembly": {
    ja: "Rust と WebAssembly で高速な client-side 検索を実装する docfind の技術解説。大きいドキュメント群でも静的配布のまま検索体験を保つ設計が中心。",
    en: "A technical article on building a fast client-side search experience with Rust and WebAssembly for large static documentation sets.",
  },
  "Introducing the VS Code Insiders Podcast": {
    ja: "VS Code Insiders Podcast の開始告知。新機能や開発の舞台裏を音声で追える公式チャンネルが追加された。",
    en: "An announcement for the VS Code Insiders Podcast, a new official audio channel for release chatter and behind-the-scenes development updates.",
  },
  "GitHub Mobile: Research and code with Copilot cloud agent anywhere": {
    ja: "GitHub Mobile でも Copilot cloud agent で調査や実装を進めやすくなり、pull request 以外の作業もモバイルから継続できるようになった。席を離れていても cloud agent の流れを止めにくい。",
    en: "GitHub Mobile now supports a broader research-and-code flow with Copilot cloud agent beyond pull-request-only work, so progress can continue away from the desktop.",
  },
  "Ask Copilot in security assessments now available": {
    ja: "組織管理者やセキュリティ管理者が、シークレット リスク評価や Code Security リスク評価の結果から Copilot を直接開き、状況に応じた説明や次の対応案を確認できるようになった。セキュリティ評価から対処判断までをその場で進めやすくする更新。",
    en: "Organization admins and security managers can now open Copilot directly from secret risk assessment or Code Security risk assessment results to get contextual explanations and guided next steps.",
  },
  "Copilot-reviewed pull request merge metrics now in the usage metrics API": {
    ja: "Copilot usage metrics API に、Copilot code review を受けて merge された pull request 数と、その pull request の merge までの median time を見る指標が追加された。enterprise / organization 単位で single-day と 28-day rolling の両方を比較できる。",
    en: "The Copilot usage metrics API now includes metrics for how many pull requests were both reviewed by Copilot code review and merged, plus the median time-to-merge for those pull requests across both single-day and 28-day rolling reports.",
  },
  "GitHub Copilot in Visual Studio Code, March Releases": {
    ja: "VS Code の weekly stable 化後、v1.111 から v1.115 までの Copilot / agent 更新をまとめた changelog。Autopilot、browser / terminal tool 改善、customization など、この 1 か月の変化を横断して追える。",
    en: "A changelog roundup for GitHub Copilot in VS Code covering the weekly stable releases from v1.111 through v1.115, including Autopilot, browser and terminal tool improvements, and broader agent workflow changes.",
  },
  "Visual Studio Code 1.117: Incremental rendering of chat responses (Experimental)":
    {
      ja: "chat 応答をブロック単位でストリーミング描画する incremental rendering が experimental として追加された。トークン到着に合わせてブロックを順次表示するため、長い応答の体感待ち時間が短くなる。`chat.experimental.incrementalRendering.enabled` で有効化できる。",
      en: "Experimental incremental rendering streams chat responses block-by-block as tokens arrive instead of using the default timer-based approach, reducing the perceived wait for longer responses. Enable it via `chat.experimental.incrementalRendering.enabled`.",
    },
  "Visual Studio Code 1.117: Sort agent sessions by recent activity": {
    ja: "Agent Sessions ビューで、セッションを作成日または最終更新日の順に並べ替えられるようになった。セッション数が増えても直前の作業に素早く戻れる。",
    en: "The Agent Sessions view can now sort sessions by when they were created or last updated, making it easier to return to recent work when sessions accumulate.",
  },
  "Visual Studio Code 1.117: System notifications for background terminal commands":
    {
      ja: "agent がバックグラウンドで長時間 terminal コマンドを実行しているとき、その状況がチャット応答にシステム通知として表示されるようになった。terminal に切り替えなくてもコマンドの進捗を把握できる。",
      en: "Long-running background terminal commands now surface as system notifications in the chat response, so you can monitor their status without switching to the terminal view.",
    },
  "Visual Studio Code 1.117: Visual Studio Code Agents (Insiders)": {
    ja: "VS Code Agents app（VS Code Insiders 同梱のプレビュー）が 1.115 から継続して進化。複数リポジトリにまたがる並列セッション、インライン diff レビュー、多段階コーディングタスクの反復などを agent ネイティブな環境でまとめて扱える companion app。",
    en: "The VS Code Agents companion app shipped with VS Code Insiders continues to evolve since its 1.115 introduction, providing parallel sessions across repos, inline diff review, and iterative multi-step coding tasks in an agent-native environment.",
  },
  "Bring your own language model key in VS Code now available": {
    ja: "Copilot Business / Enterprise ユーザーが VS Code で BYOK を利用できるようになった。OpenRouter・Ollama・Google・OpenAI などのプロバイダーへの自前 API key を VS Code chat でモデルとして接続できる。管理者は GitHub.com の Copilot ポリシー設定で Bring Your Own Language Model Key ポリシーを有効化し、組織内で使えるモデルプロバイダーを制御する。",
    en: "BYOK is now available for Copilot Business and Enterprise in VS Code, letting teams connect their own API keys for providers such as OpenRouter, Ollama, Google, and OpenAI directly in VS Code chat. Administrators control which providers are available via the Bring Your Own Language Model Key policy in Copilot settings on GitHub.com.",
  },
  "C++ code intelligence for GitHub Copilot CLI in public preview": {
    ja: "Microsoft C++ Language Server が Copilot CLI で public preview になった。Visual Studio や VS Code で使われているのと同じ IntelliSense エンジンを基盤としており、Copilot CLI での C++ コードインテリジェンスが強化される。",
    en: "The Microsoft C++ Language Server is now in public preview for Copilot CLI. Powered by the same IntelliSense engine used in Visual Studio and VS Code, it brings richer C++ code intelligence to CLI-based development workflows.",
  },
  "GitHub Copilot for Jira: Our latest enhancements": {
    ja: "GitHub Copilot cloud agent の Jira 連携に継続的な改善が加わり、チームが統合の動作をより柔軟に制御・カスタマイズできるようになった。Jira を利用する開発チームが Copilot cloud agent の活用範囲を広げやすくなる。",
    en: "GitHub Copilot cloud agent's Jira integration received continued enhancements, giving teams greater control and customizability over how the integration behaves in their Jira workflows.",
  },
  "Copilot code review user counts now aggregate in usage metrics API": {
    ja: "Copilot code review の active ユーザー・passive ユーザーの識別に続き、usage metrics API の enterprise / organization レポートに集計値が追加された。コードレビュー機能の実際の利用者数を API 経由で把握できるようになる。",
    en: "Following the launch of active and passive Copilot code review user identification, enterprise and organization usage reports in the Copilot usage metrics API now include aggregated active and passive user counts for code review.",
  },
  "Visual Studio Code 1.115: Browser agent tools improvements": {
    ja: "browser tool の呼び出しラベルが分かりやすくなり、対象タブへ直接飛べるリンクも付いた。Run Playwright Code では長時間実行の deferred result も改善され、browser automation の追跡がしやすくなった。",
    en: "Browser tool calls now have clearer labels and direct links to the target tab, while Run Playwright Code has better deferred handling for long-running scripts.",
  },
  "Visual Studio Code 1.115: Bring your own key for Copilot Business and Enterprise":
    {
      ja: "Copilot Business / Enterprise で BYOK が使えるようになり、OpenRouter、Ollama、Google、OpenAI などのモデルを自前 API key で chat に接続できるようになった。組織で使うには GitHub.com 側の Copilot policy で Bring Your Own Language Model Key を有効化する必要がある。",
      en: "BYOK is now available for Copilot Business and Enterprise in VS Code, letting organizations connect chat to models from providers such as OpenRouter, Ollama, Google, and OpenAI using their own API keys. Admins must enable the Bring Your Own Language Model Key policy in Copilot settings on GitHub.com.",
    },
  "Visual Studio Code 1.115: Send input to background terminals": {
    ja: "新しい send_to_terminal tool により、background terminal に移ったプロセスにも agent が追加入力できるようになった。待機中に foreground から外れた SSH や長時間タスクでも対話を続けやすい。",
    en: "The new send_to_terminal tool lets agents keep interacting with background terminals, so SSH sessions and long-running tasks remain operable even after moving out of the foreground.",
  },
  "Visual Studio Code 1.115: Background terminal notifications (Experimental)":
    {
      ja: "experimental な background terminal notifications により、agent が background command の完了や追加入力要求を待ち受けられるようになった。手動ポーリングなしで terminal 状態を追いやすい。",
      en: "Experimental background terminal notifications let agents react when a background command finishes or needs input, instead of polling terminal output manually.",
    },
  "Visual Studio Code 1.115: Upcoming deprecations": {
    ja: "Edit Mode は 1.110 で正式 deprecated になっており、`chat.editMode.hidden` での一時再有効化も 1.125 までで終わる予定になった。旧 edit flow を使っている環境向けの撤去タイムライン整理。",
    en: "Edit Mode has been officially deprecated since 1.110, and the temporary `chat.editMode.hidden` escape hatch will stop working after 1.125, clarifying the removal timeline.",
  },
  "60 million Copilot code reviews and counting": {
    ja: "Copilot code review が初期公開から 1 年で 10 倍成長し、GitHub 上の code review の 5 件に 1 件超を占めるまで広がったという報告。agentic architecture、継続評価、batch autofix などで signal と speed を両立させる設計も解説している。",
    en: "A progress report on Copilot code review, which has grown 10x since launch to account for more than one in five code reviews on GitHub, alongside details on the agentic architecture, evaluation loop, and batch autofix work used to improve signal and speed.",
  },
  "Enable Copilot cloud agent via custom properties": {
    ja: "エンタープライズ管理者が Copilot cloud agent (CCA) を組織単位で選択的に有効化できるようになった。以前は全組織一括の有効化・無効化または組織側委任のみで、特定組織を選んで有効化する手段がなかった。カスタムプロパティを使った絞り込み設定か、新しい REST API エンドポイント（PUT / POST / DELETE）か、AI Controls ページから管理できる。カスタムプロパティによる設定は構成時点で一度だけ評価されるため、プロパティを後から変更しても自動では再評価されない点に注意が必要。",
    en: "Enterprise admins can now selectively enable Copilot cloud agent (CCA) access per organization instead of only enabling or disabling it everywhere. You can target specific organizations individually or by matching organization custom properties, manage the policy through three new REST API endpoints (PUT, POST, DELETE), or use the AI Controls settings page. Note that custom-property evaluation happens once at configuration time and does not reapply automatically if properties are later changed.",
  },
  "Build a personal organization command center with GitHub Copilot CLI": {
    ja: "GitHub のエンジニアが Copilot CLI を使って個人の作業を自動化するコマンドセンターを構築した事例。AI が開発プロセスをどう支援したかが主題で、CLI ベースのツール作りの参考になる。",
    en: "A case study of a GitHub engineer using Copilot CLI to build a personal command center that automates routine tasks, showing how AI supported the development process end to end.",
  },
  "Visual Studio Code 1.116: Debug previous agent sessions": {
    ja: "agent セッションのデバッグログがローカルのディスクに保存されるようになり、セッション終了後でも過去の agent 操作履歴を確認できるようになった。`github.copilot.chat.agentDebugLog.fileLogging.enabled` で有効化し、Agent Debug Log パネルから現在・過去のセッションログを参照できる。",
    en: "Agent session debug logs are now saved to disk and can be reviewed after a session ends through the Agent Debug Log panel. Enable the feature via `github.copilot.chat.agentDebugLog.fileLogging.enabled` to inspect both current and historical agent interactions.",
  },
  "Visual Studio Code 1.116: Configure thinking effort in Copilot CLI": {
    ja: "Copilot CLI でも reasoning model の thinking effort を言語モデルピッカーから設定できるようになった。ローカル agent セッションと同様に、応答品質とレイテンシのバランスをタスク単位で調整できる。reasoning model を選択してから矢印で利用可能な effort レベルを展開して設定する。",
    en: "Copilot CLI sessions can now configure thinking effort for reasoning models through the language model picker, just like local agent sessions. Select a reasoning model, expand the arrow to reveal effort levels, and choose the level that best balances response quality and latency for the task.",
  },
  "Visual Studio Code 1.116: Customizations welcome page": {
    ja: "Chat Customizations ダイアログにウェルカムページが追加された。すべての agent カスタマイズを一覧でき、「Customize Your Agent」入力欄に自然言語で要望を書くと VS Code が agent・スキル・instructions の下書きを生成してくれる。",
    en: "The Chat Customizations dialog now has a welcome page that lists all agent customizations at a glance. A new Customize Your Agent prompt lets VS Code draft agents, skills, and instructions from a natural-language description.",
  },
  "Visual Studio Code 1.116: Tool confirmation carousel (Experimental)": {
    ja: "複数の tool call を確認・承認するための carousel コントロールが追加された（Experimental）。`chat.tools.confirmationCarousel.enabled` で有効化でき、会話をスクロールせずにまとめて tool call を確認・承認できるため、tool の多い agent セッションでの操作効率が上がる。",
    en: "An experimental tool-confirmation carousel (`chat.tools.confirmationCarousel.enabled`) lets you review and approve multiple tool calls in a compact, navigable control without scrolling through the conversation, making high-tool agent sessions easier to supervise.",
  },
  "GitHub Copilot CLI now supports Copilot auto model selection": {
    ja: "Copilot CLI での auto モデル選択が全プランで一般提供になった。auto を選ぶと Copilot がタスクに応じて最も効率的なモデルを自動選択する。個別にモデルを指定しなくても、用途に合った最適化が自動で適用される。",
    en: "Auto model selection is now generally available in GitHub Copilot CLI for all Copilot plans. Choosing auto lets Copilot select the most efficient model per task automatically, with no manual model choice required.",
  },
  "Claude Opus 4.7 is generally available": {
    ja: "Anthropic 最新の Claude Opus 4.7 が GitHub Copilot 上で一般提供になった。内部評価では多ステップタスクのパフォーマンスと agentic 実行の信頼性が向上している。",
    en: "Claude Opus 4.7, Anthropic's latest Opus model, is now generally available on GitHub Copilot. Early testing shows stronger multi-step task performance and more reliable agentic execution.",
  },
  "Manage agent skills with GitHub CLI": {
    ja: "GitHub CLI に `gh skill` コマンドが追加され、agent skill の検索・インストール・管理が CLI から直接できるようになった。GitHub Marketplace 経由の手動追加に加え、ターミナルから一連の skill 管理フローを完結できる。",
    en: "The GitHub CLI now includes a `gh skill` command for discovering, installing, and managing agent skills directly from the terminal, complementing the existing GitHub Marketplace workflow.",
  },
  "Building an emoji list generator with the GitHub Copilot CLI": {
    ja: "Copilot CLI を使って絵文字リストジェネレーターを作成する過程を紹介するブログ記事。Rubber Duck Thursday ストリームの内容をもとにした実例。",
    en: "A walkthrough of building an emoji list generator using GitHub Copilot CLI, based on a Rubber Duck Thursday stream session.",
  },
  "Changes to GitHub Copilot plans for individuals": {
    ja: "個人向け Copilot プランに複数の変更が加わった。Pro / Pro+ / Student への新規サインアップが停止（Copilot Free は引き続き開放）、Pro の利用上限が引き締められ Pro+ は 5 倍超の枠を維持、Pro から Opus モデルが撤去（Opus 4.7 は Pro+ に継続）。4 月分の請求は 4/20〜5/20 の間に GitHub サポートへ申請すれば払い戻し可能。",
    en: "Multiple changes landed for individual Copilot plans: new signups are paused for Pro, Pro+, and Student (Copilot Free stays open); usage limits are tightened for Pro while Pro+ keeps 5x-plus capacity; Opus models are removed from Pro, with Opus 4.7 remaining on Pro+. Subscribers who cancel before May 20 can request a refund for April via GitHub Support.",
  },
  "Pausing new self-serve signups for GitHub Copilot Business": {
    ja: "すべてのユーザーに安定した Copilot 体験を提供するための取り組みの一環として、GitHub Copilot Business の新規セルフサービスサインアップが一時停止された。既存のサブスクリプションは継続し、Enterprise 経由の購入は引き続き対応可能。",
    en: "As part of ongoing efforts to ensure a reliable Copilot experience, new self-serve signups for GitHub Copilot Business are paused. Existing subscriptions continue unaffected, and purchasing through Enterprise channels remains available.",
  },
  "Copilot cloud agent fields added to usage metrics": {
    ja: "Copilot coding agent から Copilot cloud agent へのリネームに伴い、usage metrics API のユーザーレベルレポートに `used_copilot_cloud_agent` フィールドが新たに追加された。既存の関連フィールドと同形式の boolean 値で、cloud agent の利用有無を API 経由で把握できるようになる。",
    en: "Following the rename from Copilot coding agent to Copilot cloud agent, the Copilot usage metrics API now includes a new `used_copilot_cloud_agent` boolean field in user-level reports, mirroring the format of existing related fields.",
  },
  "View and manage agent sessions from issues and projects": {
    ja: "Issues や Projects のページから Copilot cloud agent のセッションを直接確認・操作できるようになった。ページ上部に表示されるセッション pill から進行中の agent 作業の状況を把握し、workflow を離れずに操作を継続できる。",
    en: "Cloud agent sessions can now be viewed and steered directly from issues and projects pages. A session pill appears at the top of the page, giving better visibility into agent activity without leaving your current workflow.",
  },
  "Copilot Chat improvements for pull requests": {
    ja: "GitHub Copilot Chat が PR の diff やコードを扱うときにより豊富なコンテキストと新しい機能を提供するようになった。github.com の Copilot Chat から PR について質問することでこの機能を利用できる。",
    en: "GitHub Copilot Chat now provides richer context and new capabilities when working with diffs and pull requests on github.com, accessible by asking questions about a pull request directly in Chat.",
  },
  "Better debugging with GitHub Copilot on the web": {
    ja: "github.com の Copilot Chat がスタックトレースをより確実に認識し、エラーの根本原因を素早く特定できるようになった。スタックトレースを貼り付けると関連コードや変数のコンテキストを踏まえた回答が得られる。",
    en: "GitHub Copilot Chat on github.com now more reliably recognizes stack traces and provides faster root-cause analysis, offering context-aware answers that reference related code and variables.",
  },
  "Upcoming change to Copilot usage metrics report download URLs": {
    ja: "Copilot usage metrics レポートのダウンロード URL が Azure Front Door ドメインから GitHub 所有のカスタムドメインへ移行される。URL の安定性向上が目的で、既存の automation やスクリプトで旧 URL を使用している場合は移行後の更新が必要になる。",
    en: "Download URLs for Copilot usage metrics reports are migrating from Azure Front Door domains to a stable GitHub-owned custom domain. Any existing automation or scripts that reference the old URLs will need to be updated.",
  },
  "GPT-5.5 is generally available for GitHub Copilot": {
    ja: "OpenAI の最新モデル GPT-5.5 が GitHub Copilot に一般提供として段階的に展開を開始した。複数ステップの agentic コーディングタスクで特に強みを発揮するとされており、実際の問題を解決する性能が向上している。",
    en: "GPT-5.5, OpenAI's latest model, is now rolling out as generally available on GitHub Copilot. Early testing shows its strongest performance on complex, multi-step agentic coding tasks.",
  },
  "Inline agent mode in preview and more in GitHub Copilot for JetBrains IDEs":
    {
      ja: "JetBrains IDE 向け GitHub Copilot がアップデートされた。インライン agent モードがプレビューで追加されたほか、Next Edit Suggestions の強化、グローバル自動承認、ターミナルコマンドとファイル編集に関する柔軟な制御が含まれる。",
      en: "GitHub Copilot for JetBrains IDEs now includes inline agent mode in preview, enhancements to Next Edit Suggestions, global auto approve, and more flexible controls for terminal commands and file edits.",
    },
  "Notice about upcoming new format for GitHub App installation tokens": {
    ja: "2026年4月27日以降、段階的なロールアウトにより GitHub App インストールトークンのフォーマットが更新される。新フォーマットはパフォーマンスを向上させたものに変わり、新規に発行されるトークンから順次適用される。",
    en: "Starting April 27, 2026, a staged rollout will update the format of newly issued GitHub App installation tokens to make them more performant.",
  },
  "Upcoming deprecation of GPT-5.2 and GPT-5.2-Codex": {
    ja: "2026年6月1日に GPT-5.2 と GPT-5.2-Codex が GitHub Copilot の全体験（Chat・インライン編集・ask/agent モード・コード補完）から廃止される。Copilot Code Review での GPT-5.2-Codex は対象外。推奨移行先は GPT-5.2 → GPT-5.5、GPT-5.2-Codex → GPT-5.3-Codex。Enterprise 管理者はモデルポリシーで代替モデルへのアクセスを有効化する必要がある場合がある。",
    en: "GPT-5.2 and GPT-5.2-Codex will be deprecated from all GitHub Copilot experiences on June 1, 2026, except GPT-5.2-Codex in Copilot Code Review. Suggested alternatives are GPT-5.5 for GPT-5.2 and GPT-5.3-Codex for GPT-5.2-Codex. Enterprise admins may need to enable the replacement models via model policies.",
  },
  "Copilot Student GPT-5.3-Codex removal from model picker": {
    ja: "Copilot Student プランで GPT-5.3-Codex がモデルピッカーから削除された。モデルは自動モデル選択経由では引き続き利用できる。手動でモデルを選択していたユーザーは自動選択に委ねる形に移行することになる。",
    en: "GPT-5.3-Codex has been removed from the model picker in the Copilot Student plan. It remains available through auto model selection, which automatically picks the best model for each task.",
  },
  "Copilot cloud agent starts 20% faster with Actions custom images": {
    ja: "GitHub Actions カスタムイメージで最適化されたランナー環境により、Copilot cloud agent の起動が20%以上高速化された。issue を Copilot に割り当ててからタスクが始まるまでの待機時間が短縮される。",
    en: "Copilot cloud agent now starts over 20% faster through optimized runner environments built with GitHub Actions custom images, reducing the wait from issue assignment to task kickoff.",
  },
  "GitHub Copilot code review will start consuming GitHub Actions minutes on June 1, 2026":
    {
      ja: "2026年6月1日から、GitHub Copilot code review が GitHub Actions の利用分数を消費するようになる。PR ごとに自動実行されるコードレビューが Actions のコストに反映されるため、利用量と予算の事前確認が必要。",
      en: "Starting June 1, 2026, GitHub Copilot code review will consume GitHub Actions minutes. Automated code reviews on pull requests will count against Actions usage, so teams should review their budget and limits before the change takes effect.",
    },
  "Visual Studio Code 1.118: Visual Studio Code Agents (Insiders)": {
    ja: "VS Code Insiders 同梱のプレビュー companion app として提供される Visual Studio Code Agents app が進化した。1.115 での初登場後も継続改善されており、1.118 ではタイトルバーから直接起動できるようになった。複数リポジトリにまたがる並列セッションや、マルチステップのコーディングタスクを agent ネイティブな環境で反復できる。専用ドキュメントも公開され、試し始めやすい段階になっている。",
    en: "The VS Code Agents companion app shipped with VS Code Insiders continues to evolve since its 1.115 debut. In 1.118 it becomes discoverable directly from the Insiders title bar, supports parallel sessions across repos, and now has dedicated documentation to help you get started.",
  },
  "Visual Studio Code 1.118: Remote control for Copilot CLI sessions (Experimental)":
    {
      ja: "github.copilot.chat.cli.remote.enabled で有効化できる実験的機能。デスクを離れているときでも GitHub.com やモバイルから進行中の Copilot CLI セッションを監視・操作できる。承認待ちや問い掛けで止まった agent を遠隔から再開できるため、長時間タスクが途中で停止するリスクを下げられる。",
      en: "Enable via github.copilot.chat.cli.remote.enabled to monitor and steer ongoing Copilot CLI sessions from GitHub.com or mobile. Tasks that previously stalled when an agent needed approval while you were away can now be resumed remotely.",
    },
  "Visual Studio Code 1.118: Synced session titles for Copilot CLI": {
    ja: "Copilot SDK のセッションタイトル API を正式な参照源として採用し、どの UI でリネームしてもチャットセッション一覧・エディタタブ・CLI 端末で同じタイトルが表示されるようになった。複数サーフェスを横断するセッション管理で識別が一元化される。",
    en: "VS Code now adopts the Copilot SDK session title APIs as the source of truth, so renaming a session in any surface—sessions list, editor tab, or CLI terminal—updates all of them consistently.",
  },
  "Visual Studio Code 1.118: Copilot added as a Git co-author by default": {
    ja: "chat・agent ワークフローで Copilot がファイルを変更した際、git.addAICoAuthor 設定により Copilot が co-author として commit に自動追記されるようになった。デフォルトで有効で、不要な場合は設定から変更できる。commit 履歴に AI 支援の痕跡を明示的に残す運用に切り替わる。",
    en: "VS Code now enables Git AI co-authoring by default for chat and agent workflows. When Copilot changes files, it is automatically added as a co-author on the resulting commit. Change the behavior with git.addAICoAuthor.",
  },
  "GitHub Copilot in Visual Studio — April update": {
    ja: "2026年4月の Visual Studio 更新は agentic ワークフローを中心に据えた内容。cloud agent セッションを IDE から直接起動できるようになり、カスタム agent にユーザーレベルのサポートが追加され、新しい Debugger agent が動作を検証する仕組みが新設された。",
    en: "The April 2026 Visual Studio update centers on agentic workflows: cloud agent sessions now launch directly from the IDE, custom agents gain user-level support, and a new Debugger agent validates agent behavior.",
  },
  "GitHub Copilot CLI for Beginners: Interactive v. non-interactive mode": {
    ja: "interactive モードと non-interactive モードの違いを解説する入門記事。ターミナルから対話的に使う場面と、スクリプトや CI に組み込む場面でモードを使い分ける基礎を押さえられる。",
    en: "A beginner's guide explaining the difference between Copilot CLI's interactive and non-interactive modes, helping readers choose the right mode for terminal sessions versus scripted or CI workflows.",
  },
  "Secret scanning with GitHub MCP Server is now generally available": {
    ja: "GitHub MCP（Model Context Protocol）Server に組み込まれた secret scanning 機能が一般提供になった。MCP 対応の AI coding agent や IDE（Copilot CLI・VS Code）からコミット前や PR 作成前に secret の漏洩を検出できる。GitHub Secret Protection が有効なリポジトリで利用でき、既存の push protection カスタマイズ設定もそのまま反映される。",
    en: "Secret scanning in the GitHub MCP Server is now generally available. Developers using MCP-compatible AI agents or IDEs such as Copilot CLI and VS Code can scan for exposed secrets before committing or opening a pull request. It requires GitHub Secret Protection to be enabled and honors existing push protection customizations.",
  },
  "Enterprise-managed plugins in GitHub Copilot CLI are now in public preview":
    {
      ja: "Enterprise 管理者が GitHub Copilot CLI 向け plugin を一括設定・配布できる機能が public preview になった。組織の標準 plugin 構成を定義し、利用者の CLI 環境へ共通適用しやすくする更新。",
      en: "Enterprise-managed plugin configuration and distribution for GitHub Copilot CLI is now in public preview, allowing administrators to define and roll out baseline plugin standards across users.",
    },
  "GitHub Copilot in Visual Studio Code, April releases": {
    ja: "VS Code の weekly stable への移行後に出た v1.116〜v1.119 の Copilot 変更をまとめた更新。意味検索の強化など、4月〜5月初旬に入った agent/CLI 体験の差分を一度に確認できる。",
    en: "This roundup covers Copilot changes shipped in VS Code v1.116 through v1.119 after the move to weekly stable releases, including semantic search improvements and related agent/CLI updates from April to early May.",
  },
  "Validating agentic behavior when “correct” isn’t deterministic": {
    ja: "agent の出力が一意に正解と決めにくい課題に対して、GitHub Copilot Applied Science が評価設計をどう進めているかを解説した記事。再現性と実運用評価の両立に向けた考え方を整理できる。",
    en: "An Applied Science post on how to evaluate agent behavior when correctness is non-deterministic, outlining practical approaches to balancing reproducibility with real-world assessment.",
  },
  "Visual Studio Code 1.119: OpenTelemetry tracing for agent sessions": {
    ja: "agent session の OpenTelemetry tracing が追加され、実行中の処理を観測基盤へ取り込みやすくなった。遅延や失敗の原因を運用側で追跡しやすくする変更。",
    en: "OpenTelemetry tracing for agent sessions makes it easier to feed session execution telemetry into observability tooling and investigate latency or failure causes.",
  },
  "Visual Studio Code 1.119: Show model details for Copilot CLI and Claude agent responses":
    {
      ja: "Copilot CLI と Claude agent の応答ごとに利用モデル情報を表示できるようになった。生成結果の差分検証や運用時の説明責任を取りやすくする更新。",
      en: "Model details are now surfaced on Copilot CLI and Claude agent responses, helping teams validate behavior differences and document model-level accountability.",
    },
  "Visual Studio Code 1.119: Sharing browser tabs with agents": {
    ja: "ブラウザータブを agent へ共有してコンテキストとして渡せるようになった。仕様確認や調査ページを会話に直接添付し、往復作業を減らしやすくなる。",
    en: "Browser tabs can now be shared with agents as context, reducing handoff friction when incorporating reference pages into agent conversations.",
  },
  "Visual Studio Code 1.119: Visual Studio Code Agents (Insiders)": {
    ja: "Insiders 向け Visual Studio Code Agents 体験が更新され、複数セッション運用や agent 中心の開発フローを試しやすくなった。先行導入の検証対象として押さえたい変更。",
    en: "The Visual Studio Code Agents experience in Insiders was updated, making it easier to evaluate multi-session and agent-centric workflows ahead of broader rollout.",
  },
  "Upcoming deprecation of Grok Code Fast 1": {
    ja: "2026年5月15日に Grok Code Fast 1 が GitHub Copilot の全体験（Chat・インライン編集・ask/agent モード・コード補完）から廃止される。モデルプロバイダー側の廃止に合わせた前倒し対応で、代替として GPT-5 mini または Claude Haiku 4.5 への移行が推奨される。Enterprise 管理者はモデルポリシーで代替モデルへのアクセスを有効化する必要がある場合がある。",
    en: "Grok Code Fast 1 will be deprecated from all GitHub Copilot experiences on May 15, 2026, in line with the model provider's retirement date. Suggested alternatives are GPT-5 mini and Claude Haiku 4.5. Enterprise admins may need to enable replacement models via model policies.",
  },
  "Copilot code review comment types now in usage metrics API": {
    ja: "Copilot usage metrics API の pull_requests フィールド下に copilot_suggestions_by_comment_type 配列が新設された。コメント種別（security・bug_risk など）ごとに Copilot が提案したコメント数と、開発者が適用したコメント数を把握できる。enterprise・organization 単位で single-day と 28-day rolling の両方に対応している。",
    en: "The Copilot usage metrics API now includes a copilot_suggestions_by_comment_type array under pull_requests, breaking down code review suggestions by category such as security and bug_risk. For each type, you can see total suggestions posted and how many were applied, available at both enterprise and organization levels in single-day and 28-day rolling reports.",
  },
  "More flexible secrets and variables for Copilot cloud agent": {
    ja: "Copilot cloud agent 専用の「Agents」シークレットと変数が追加された。従来はリポジトリの Actions 設定内 copilot 環境に個別設定が必要だったが、organization レベルでの一括設定とアクセス可能なリポジトリの選択が可能になった。MCP サーバー設定や内部 package registry のトークンなど、複数リポジトリで共有する設定を一元管理しやすくなる。",
    en: "Copilot cloud agent now has its own dedicated Agents secrets and variables, separate from the existing Actions, Codespaces, and Dependabot types. You can now configure these at the organization level and share them across any or all repositories, removing the need to duplicate configuration across every repository.",
  },
  "Rubber Duck in GitHub Copilot CLI now supports more models": {
    ja: "Copilot CLI の Rubber Duck が GPT セッションでも利用できるようになった。GPT オーケストレーターセッションでは Claude 系の Rubber Duck エージェントがセカンドオピニオンを提供し、Claude セッションでは GPT-5.5 が Rubber Duck モデルとして利用可能になった。`/experimental on` で有効化する。",
    en: "Rubber Duck in Copilot CLI now pairs GPT orchestrator sessions with a Claude-powered critic agent and upgrades Claude sessions to use GPT-5.5 as the Rubber Duck reviewer. Enable it by running copilot and toggling /experimental on.",
  },
  "Agent pull requests are everywhere. Here's how to review them.": {
    ja: "agent 生成 PR が急増する中、人間レビュアーが何に注目すべきかをまとめた実践ガイド。agent はコードを正しく完成させるが、インシデント履歴やチームの運用コンテキストを知らないため、表面上はきれいでも技術的負債が潜みやすい点を整理している。",
    en: "A practical guide to reviewing agent-generated pull requests covering what to look for, where hidden debt accumulates, and how to apply the contextual judgment that agents lack, as AI-authored PRs account for more than one in five code reviews on GitHub.",
  },
  "Upcoming deprecation of GPT-4.1": {
    ja: "2026年6月1日に GPT-4.1 が GitHub Copilot の全体験（Chat・インライン編集・ask/agent モード・コード補完）から廃止される。代替として GPT-5.5 への移行が推奨される。Enterprise 管理者はモデルポリシーで代替モデルへのアクセスを有効化する必要がある場合がある。",
    en: "GPT-4.1 will be deprecated from all GitHub Copilot experiences on June 1, 2026. The suggested alternative is GPT-5.5. Enterprise admins may need to enable access to the replacement model via their Copilot model policies.",
  },
  "Improving token efficiency in GitHub Agentic Workflows": {
    ja: "PR ごとに自動実行される agentic workflow のトークン使用量削減に向けた GitHub 自身の取り組みを解説した記事。API プロキシ経由の計測基盤の整備から、プロンプト圧縮・キャッシュ活用・ツール呼び出しの最適化まで、実運用で得られた知見が中心。",
    en: "A GitHub engineering post on reducing token consumption in production agentic workflows that run automatically on every pull request, covering instrumentation via an API proxy and the concrete optimizations applied to YAML-specified workflows.",
  },
  "Claude Sonnet 4 deprecated": {
    ja: "Claude Sonnet 4 が 2026年5月6日付けで GitHub Copilot の全体験（Chat・インライン編集・ask/agent モード・コード補完）から廃止された。代替として Claude Sonnet 4.6 への移行が推奨される。Enterprise 管理者はモデルポリシーで代替モデルへのアクセスを確認する必要がある。",
    en: "Claude Sonnet 4 was deprecated from all GitHub Copilot experiences on May 6, 2026. The suggested alternative is Claude Sonnet 4.6. Enterprise admins should verify access to the replacement model in their Copilot model policies.",
  },
  "Copilot code review: Comment experience improvements": {
    ja: "Copilot code review のコメントに High / Medium / Low の重大度ラベルが追加され、同じ指摘を自動グループ化するようになった。新しい PR エクスペリエンスに opt-in しているユーザー向け。大規模 PR でもレビューの優先付けと重複ノイズの抑制がしやすくなる。",
    en: "Copilot code review comments now carry High, Medium, or Low severity labels and similar suggestions are automatically grouped together. Available to users opted into the new pull requests experience, these changes make it easier to prioritize feedback and reduce repetitive noise on larger pull requests.",
  },
  "April reports are now available to prepare for usage-based billing": {
    ja: "4月分の使用レポートがダウンロード可能になった。AI credit 換算での Copilot 利用量を確認でき、6月1日から始まる従量課金移行の前にトップ消費者やモデル別利用傾向を把握できる。0x モデルの4月1日〜24日分は含まれず、4月24〜30日にデータ重複が生じる場合がある点に注意が必要。",
    en: "April usage reports are now available for download, showing how April Copilot activity translates into AI credits before the June 1 billing transition. Use the report to identify top consumers, model usage patterns, and cost ranges, noting that 0x model activity before April 24 is excluded and some duplicate entries for April 24–30 may appear.",
  },
  "Visual Studio Code 1.120: Orchestrate tasks across projects with the Agents window (Preview)":
    {
      ja: "Agents ウィンドウが VS Code Stable でプレビュー提供を開始した。複数プロジェクト・複数 agent を跨いだ作業に特化した専用コンパニオンウィンドウで、agent harness の選択・リモートマシンでの実行・カラーテーマやキーバインドをそのまま持ち込める。Insiders での先行提供を経て Stable に到達した。",
      en: "The Agents window is now available as a preview in VS Code Stable. Purpose-built for multi-project and multi-agent work, it supports agent harness selection, remote machine execution, and carries over your color themes, keybindings, and extensions from the regular editor.",
    },
  "Visual Studio Code 1.120: Discover Copilot CLI plugins automatically": {
    ja: "GitHub Copilot CLI でインストールした agent plugin が VS Code に自動的に検出されるようになった。以前は VS Code 側にも別途インストールするか `chat.plugins.paths` にパスを手動追加する必要があったが、CLI 側の install 一度で両サーフェスをカバーできる。",
    en: "Agent plugins installed via the GitHub Copilot CLI are now automatically discovered in VS Code, so a single CLI install covers both surfaces. Previously, the same plugin had to be installed separately in VS Code or its path added to chat.plugins.paths.",
  },
  "Visual Studio Code 1.120: View BYOK model token usage": {
    ja: "BYOK で接続したモデル（Anthropic、OpenAI など自前 API key 利用）のチャット中に token 使用量を確認できるようになった。以前はチャット終了後に API ダッシュボード側でしか把握できなかった使用量を VS Code 内で直接確認でき、コンテキスト管理とコスト把握がしやすくなる。",
    en: "Token usage for BYOK models (such as those connected via Anthropic or OpenAI API keys) is now visible directly in VS Code chat. This allows context-window management and cost monitoring without leaving the editor.",
  },
  "Visual Studio Code 1.120: Configure thinking effort for BYOK reasoning models":
    {
      ja: "BYOK で接続した reasoning モデルの thinking effort を Chat ビューのモデルピッカーから直接設定できるようになった。すべてのリクエストに選択した effort が適用され、応答品質と速度・コストのトレードオフをモデル選択の場で調整できる。",
      en: "Thinking effort for BYOK reasoning models can now be configured from the model picker in the Chat view. The selected effort level is forwarded on every request, letting you tune the quality-versus-speed-and-cost tradeoff without changing the model.",
    },
  "GitHub Copilot app is now available in technical preview": {
    ja: "GitHub Copilot app の technical preview が公開された。GitHub ネイティブのデスクトップ体験で、手元の作業から agentic development を始め、分離した実行環境で進められる。",
    en: "The GitHub Copilot app entered technical preview as a GitHub-native desktop experience for starting agentic development from current work in an isolated environment.",
  },
  "Copilot cloud agent supports auto model selection": {
    ja: "Copilot cloud agent が Auto モデル選択に対応した。モデルピッカーで Auto を選ぶと、システム状態とモデル性能を踏まえて利用可能な最適モデルが自動選択される。",
    en: "Copilot cloud agent now supports Auto model selection, choosing the best available model based on system health and model capability when Auto is selected.",
  },
  "Team-level Copilot usage metrics now available via API": {
    ja: "Copilot usage metrics API に user-teams レポートが追加された。既存の利用レポートと突合することで、チーム単位の採用状況や利用傾向を把握しやすくなる。",
    en: "The Copilot usage metrics API now includes a user-teams report, enabling team-level adoption and usage analysis when joined with existing usage reports.",
  },
  "Copilot Memory supports user preferences for Pro, Pro+ users": {
    ja: "Copilot Memory が Pro / Pro+ 向け early access でユーザー設定の好みに対応した。会話内で示した文体や進め方の好みを継続反映しやすくなる。",
    en: "Copilot Memory now supports user-level preferences in early access for Pro and Pro+ users, helping preserve preferred style and workflow guidance across conversations.",
  },
  "Building a general-purpose accessibility agent—and what we learned in the process":
    {
      ja: "GitHub が試験運用している汎用アクセシビリティ agent の取り組みと学びをまとめた記事。実運用での改善ループを回すための設計と検証の観点が共有されている。",
      en: "A GitHub blog post describing lessons from piloting a general-purpose accessibility agent, including design and evaluation considerations for iterative real-world improvements.",
    },
  "The Coding Harness Behind GitHub Copilot in VS Code": {
    ja: "VS Code 上の GitHub Copilot を支える coding harness の設計を解説する記事。モデル・ツール・agent・プロバイダーが変化しても品質を保つ実装上の要点を確認できる。",
    en: "A VS Code engineering post about the coding harness behind GitHub Copilot, outlining how quality is maintained as models, tools, agents, and providers evolve.",
  },
  "GPT-5.3-Codex is now the base model for Copilot Business and Enterprise": {
    ja: "Copilot Business / Enterprise の既定モデルが GPT-4.1 から GPT-5.3-Codex に切り替わった。組織でモデルを明示選択していない利用では応答挙動の前提が変わる。",
    en: "GPT-5.3-Codex is now the default model for Copilot Business and Enterprise, replacing GPT-4.1 when organizations do not explicitly select another model.",
  },
  "Start Copilot cloud agent tasks via the REST API": {
    ja: "Copilot Business / Enterprise ユーザーが REST API から Copilot cloud agent のタスクをプログラム的に開始できるようになった。新しい Agent tasks REST API が public preview で提供され、CI/CD パイプラインや社内ツールから cloud agent を呼び出すフローを組み込みやすくなる。",
    en: "Copilot Business and Copilot Enterprise users can now programmatically start Copilot cloud agent tasks via the new Agent tasks REST API, available in public preview. This makes it straightforward to trigger cloud-agent work from CI/CD pipelines and internal tooling without a manual issue assignment step.",
  },
  "Introducing Copilot CLI agent and unified sessions view in GitHub Copilot for JetBrains IDEs":
    {
      ja: "JetBrains IDE 向け GitHub Copilot に Copilot CLI agent と統合セッションビューが追加された。CLI agent を JetBrains の chat から直接使えるようになり、CLI・IDE のセッションを統合ビューで一覧できるため、複数の agent 作業を IDE 内で把握しやすくなる。",
      en: "GitHub Copilot for JetBrains IDEs now includes Copilot CLI agent support and a unified sessions view, enabling CLI agent workflows directly from the IDE and providing a single view of both CLI and IDE sessions.",
    },
  "Grok Code Fast 1 deprecated": {
    ja: "Grok Code Fast 1 が 2026年5月15日に GitHub Copilot の全体験（Chat・インライン編集・ask/agent モード・コード補完）から廃止された。代替として GPT-5 mini または Claude Haiku 4.5 への移行が推奨される。Enterprise 管理者はモデルポリシーで代替モデルへのアクセスを確認する必要がある。",
    en: "Grok Code Fast 1 was deprecated from all GitHub Copilot experiences on May 15, 2026, in line with the model provider's retirement. Suggested alternatives are GPT-5 mini and Claude Haiku 4.5. Enterprise admins should verify access to replacement models in their Copilot model policies.",
  },
  "Copilot Spaces API now generally available": {
    ja: "Copilot Spaces の REST API が一般提供になった。プログラム的に Spaces を作成・管理でき、チームの知識共有や AI へのコンテキスト提供の仕組みを API から自動化しやすくなる。",
    en: "The Copilot Spaces REST API is now generally available, enabling programmatic creation and management of Spaces to automate knowledge sharing and context provisioning for teams.",
  },
  "Ask questions in context with Copilot on web": {
    ja: "GitHub.com の Copilot chat が、開いているページ（PR、issue、コードなど）を自動でコンテキストとして認識するようになった。チャットを開いた時点で現在のページが文脈として読み込まれ、コンテキスト切り替えの手間を減らして素早く質問できる。",
    en: "Copilot chat on github.com now opens pre-loaded with context from the page you are currently viewing—such as a pull request, issue, or code file—so questions land in context without extra setup.",
  },
  "Audit repository Copilot cloud agent configuration via the REST API": {
    ja: "リポジトリの Copilot cloud agent 設定を REST API でプログラム的に取得できるようになった（public preview）。新しい「Get Copilot cloud agent configuration for a repository」エンドポイントにより、複数リポジトリの設定状況を一括監査しやすくなる。",
    en: "A new REST API endpoint in public preview lets you programmatically retrieve a repository's Copilot cloud agent configuration, enabling automated configuration audits across large numbers of repositories.",
  },
  "Remote control for Copilot CLI sessions now generally available on mobile, web, and VS Code":
    {
      ja: "Copilot CLI セッションのリモート操作が GitHub Mobile と github.com で一般提供になった。ターミナルで始めた作業を、場所を問わずモバイルや web からモニタリング・操作できる。VS Code からの操作も可能になり、長時間タスクを離れたままでも止めずに進めやすくなった。",
      en: "Remote control for Copilot CLI sessions is now generally available on GitHub Mobile, github.com, and VS Code, letting you monitor and steer terminal-started work from anywhere without staying at your desk.",
    },
  "One-click fixes for failing Actions with Copilot cloud agent": {
    ja: "GitHub Actions ジョブが失敗したとき、Copilot Business / Enterprise ユーザーが「Fix with Copilot」ボタン一回で cloud agent に修正を依頼できるようになった。ジョブ失敗から修正 PR 作成までを、ターミナルや issue への手動切り替えなしに完結できる。",
    en: "Copilot Business and Enterprise subscribers can now ask Copilot cloud agent to fix a failing GitHub Actions job with a single click on the Fix with Copilot button, completing the path from failure to fix pull request without leaving the Actions UI.",
  },
  "Copilot cloud agent: Fast, cost-efficient models for simple tasks": {
    ja: "Copilot cloud agent にタスクを委任するとき、利用するモデルをユーザーが選択できるようになった。新たに高速・低コストモデルがサポートモデルに加わり、シンプルなタスクにコスト効率の良いモデルを選ぶことができる。",
    en: "When delegating tasks to Copilot cloud agent, you can now choose which model it uses. New fast, cost-efficient models have been added to the supported list, so simpler tasks no longer require the most capable or expensive model.",
  },
  "Gemini 3.5 Flash is generally available for GitHub Copilot": {
    ja: "Google の最新 Flash ティアモデル Gemini 3.5 Flash が GitHub Copilot で一般提供になった。Flash ティアの速度とコストで Pro 品質に近いコーディング性能を発揮するとされており、Copilot のモデル選択肢が広がる。",
    en: "Gemini 3.5 Flash, Google's latest Flash-tier model, is now generally available on GitHub Copilot, delivering near-Pro coding quality at Flash-tier speed and cost.",
  },
  "Easily apply Copilot code review feedback with Copilot cloud agent": {
    ja: "Copilot code review の「Implement suggestion」ボタンが「Fix with Copilot」へ改名され、提案の適用方法をより細かく制御できる UI ダイアログが追加された。cloud agent を使ってコードレビューのフィードバックをより簡単に適用できるようになった。",
    en: "The Implement suggestion button in Copilot code review is now Fix with Copilot and opens a UI dialog with more control over how suggestions are applied using the cloud agent.",
  },
  "Auto model selection now routes based on your task in VS Code": {
    ja: "VS Code の GitHub Copilot 自動モデル選択が、タスクの種類と負荷状況に基づいて最適モデルへルーティングするようになった。モデルを手動で選ばなくても、作業内容に応じた最適なモデルが自動で使われる。",
    en: "GitHub Copilot auto model selection in VS Code now routes to the best model based on task type and system utilization, removing the need to manually switch models for different workloads.",
  },
  "Semantic issue search in Copilot Chat": {
    ja: "GitHub Copilot Chat on web で自然言語を使って issue の検索・グループ化・分析ができるようになった。意味的な検索により、キーワード一致に依存せず関連 issue を素早く見つけられる。",
    en: "Natural language semantic issue search is now available in GitHub Copilot Chat on the web, making it easy to find, group, and analyze related issues without relying on exact keyword matches.",
  },
  "Visual Studio Code 1.121: Agents Window (Preview)": {
    ja: "Agents ウィンドウの継続改善が入った。複数プロジェクト・複数 agent 向けの companion ウィンドウとして安定性・操作性の向上が続いている。",
    en: "The Agents window for multi-project and multi-agent workflows received continued stability and usability improvements.",
  },
  "Visual Studio Code 1.121: Remote agents (Preview)": {
    ja: "Agents ウィンドウがリモートマシン上での agent セッション実行に実験的に対応した。ローカルの VS Code からリモートホストの agent を操作できるようになる。",
    en: "The Agents window now has experimental support for running agent sessions on a remote machine, letting you operate remote agents directly from your local VS Code.",
  },
  "Visual Studio Code 1.121: Agents observability with OpenTelemetry and Grafana":
    {
      ja: "Azure Managed Grafana との連携により、agent セッションの OpenTelemetry トレースを可視化するプリビルドダッシュボードが追加された。agent 実行の observability を monitoring インフラへ統合しやすくなる。",
      en: "In collaboration with Azure Managed Grafana, a prebuilt dashboard for visualizing agent session OpenTelemetry traces is now available, making it easier to integrate agent observability into existing monitoring infrastructure.",
    },
  "Visual Studio Code 1.121: Claude agent Auto permission mode (Preview)": {
    ja: "Claude agent に Auto 権限モードがプレビューで追加された。Auto モードでは tool 使用の承認を自動化でき、介入なしで長時間の agent タスクを進めやすくなる。",
    en: "Claude agent now has an Auto permission mode in preview. With Auto enabled, the agent can use tools without per-action approval, making it practical to run longer tasks without interruption.",
  },
  "Visual Studio Code 1.122: Agents Window (Preview)": {
    ja: "Agents ウィンドウで session list の hover details が追加され、harness、project、worktree、変更ファイルを一目で確認できるようになった。Insiders では local VS Code harness の custom agent picker も継続改善されている。",
    en: "The Agents window now shows richer session hover details, including harness, project, worktree, and changed files. Insiders also continues to improve the local VS Code harness and custom agent picker.",
  },
  "Visual Studio Code 1.122: Richer OpenTelemetry signals for agents": {
    ja: "local agent session が `github.copilot.*` の OpenTelemetry 属性 namespace を出すようになり、repository context、agent type、tool parameters、hook outcomes まで trace に載せられるようになった。Copilot CLI と近い形式で agent usage を監視しやすくなる。",
    en: "Local agent sessions now emit a `github.copilot.*` OpenTelemetry attribute namespace with repository context, agent type, structured tool parameters, and hook outcomes, aligning more closely with Copilot CLI telemetry conventions.",
  },
  "Visual Studio Code 1.122: Sandboxing": {
    ja: "Bypass Approvals や Autopilot mode の command 実行で、sandbox 失敗時に自動で sandbox 外へ再試行する挙動が変わった。組織管理の sandbox 設定を前提に、agent 実行の失敗時 recovery と安全境界を見直す必要がある。",
    en: "Command execution in Bypass Approvals or Autopilot mode changed how it handles failures after an initial sandbox attempt. Teams should revisit recovery expectations and safety boundaries around organization-managed sandbox settings.",
  },
  "Visual Studio Code 1.122: Use BYOK without a GitHub sign in": {
    ja: "VS Code の BYOK が GitHub sign-in なしで使えるようになり、GitHub へ接続できない air-gapped / restricted environment でも chat、tools、MCP servers、Ollama などの local model を組み合わせやすくなった。",
    en: "BYOK in VS Code can now be used without GitHub sign-in, making it easier to combine chat, tools, MCP servers, and local models such as Ollama in air-gapped or restricted environments.",
  },
  "Claude Opus 4.8 is generally available for GitHub Copilot": {
    ja: "Anthropic の Opus 4.8 が GitHub Copilot で一般提供になった。コード理解と生成の改善が案内されており、より高い推論力を使うタスクでモデル選択の候補に入れやすくなる。",
    en: "Anthropic's Opus 4.8 is now generally available in GitHub Copilot, with GitHub highlighting improvements in code understanding and generation for tasks that benefit from a stronger reasoning model.",
  },
  "Copilot usage metrics API adds cohorts for AI adoption": {
    ja: "Copilot usage metrics API が engaged user を AI adoption cohort に分類できるようになった。単なる active user 数だけでなく、どの使われ方が広がっているかを enterprise / organization の定着分析で追いやすくなる。",
    en: "The Copilot usage metrics API now classifies engaged users into AI adoption cohorts, helping enterprise and organization reports tell not just who is active, but how Copilot usage is spreading.",
  },
  "Target Copilot models to organizations with model rules": {
    ja: "enterprise model rules で、特定の Copilot model を利用できる organization を対象指定できるようになった。組織ごとの rollout、モデル統制、コスト管理を同じ enterprise 配下で分けやすくなる。",
    en: "Enterprise model rules can now target specific organizations, letting admins roll out Copilot models, governance, and cost controls differently across organizations under the same enterprise.",
  },
  "Copilot usage metrics reports now use GitHub-owned download URLs": {
    ja: "Copilot usage metrics レポートのダウンロード URL が Azure Front Door ドメインから GitHub 所有のカスタムドメインへの移行が完了した。URL の安定性向上を目的とした変更で、既存の automation やスクリプトで旧 URL を参照している場合は新 URL への切り替えが必要になる。",
    en: "Download URLs for Copilot usage metrics reports have completed migration from Azure Front Door domains to a stable, GitHub-owned custom domain. Any existing automation or scripts referencing the old URLs must be updated to avoid breakage.",
  },
  "Updates to available models in Copilot on web": {
    ja: "Web 上の Copilot Chat で利用できるモデル選択肢が更新された。より一貫した高品質な応答を提供するためにモデルの選択肢を絞り込んだ変更で、従来手動でモデルを選んでいた場合は選択肢が変わる可能性がある。",
    en: "The available model selection for Copilot Chat on the web has been updated to focus on delivering more consistent, high-quality responses. The choice of models has been narrowed, so manual model selections may no longer reflect the same options.",
  },
  "GitHub Copilot for Eclipse is open source": {
    ja: "GitHub Copilot for Eclipse のコードが MIT ライセンスで公開され、オープンソースとして GitHub 上で参照できるようになった。Eclipse 向け拡張の実装を確認しながら導入や拡張方針を判断しやすくなる。",
    en: "GitHub Copilot for Eclipse is now open source under the MIT license, with source code published on GitHub for direct inspection. Teams can review implementation details before deciding rollout or customization plans.",
  },
};

const exactImportanceMappings = {
  "Visual Studio Code 1.114: Preview videos in the image carousel": {
    ja: "画像だけでなく動画添付の確認まで chat 内で閉じられるので、レビューや調査の往復を減らしやすい更新です。",
    en: "This keeps more attachment review inside chat by covering videos as well as images, reducing context switching during investigation and review.",
  },
  "Visual Studio Code 1.114: Copy final response in chat": {
    ja: "tool call や思考過程を除いた最終回答だけを共有しやすくなり、社内展開や記録への転記が楽になります。",
    en: "This makes it easier to share or archive only the final answer, without exposing tool calls or intermediate reasoning.",
  },
  "Visual Studio Code 1.114: Workspace search simplification": {
    ja: "semantic search の挙動と index 管理が単純化されるので、agent 検索の再現性と説明しやすさに直接効きます。",
    en: "This directly improves the consistency and explainability of agent workspace search by simplifying semantic indexing behavior.",
  },
  "Visual Studio Code 1.114: Troubleshoot previous chat sessions (Preview)": {
    ja: "再現が難しい chat 問題でも過去 session を後追いで調べられるため、運用時の切り分けがかなりしやすくなります。",
    en: "This makes post-incident debugging much easier because previous chat sessions can be inspected without reproducing the issue.",
  },
  "GitHub Copilot CLI combines model families for a second opinion": {
    ja: "複雑な実装や計画の初期判断で別モデルの視点を差し込めるため、手戻りの大きい見落としを減らしやすい更新です。",
    en: "This can reduce expensive downstream rework by bringing a second model's perspective into planning and complex implementation checkpoints.",
  },
  "GitHub recognized as a Leader in the Gartner® Magic Quadrant™ for Enterprise AI Coding Agents for the third year in a row": {
    ja: "GitHub Copilot の市場評価だけでなく、複数モデル対応や issue から review・Actions までをまたぐ agentic workflow がエンタープライズ訴求の軸になっていることを確認できる更新です。",
    en: "This matters because it shows GitHub is framing multi-model support and agentic workflows spanning issues, review, and Actions as core enterprise differentiators, not just coding assistance.",
  },
  "Copilot CLI now supports BYOK and local models": {
    ja: "モデル選択を GitHub 提供ルーティングから切り離せるので、コスト、統制、データ所在の要件がある組織に直結します。",
    en: "This matters directly to organizations with cost, governance, or data residency requirements because model routing no longer has to stay GitHub-managed.",
  },
  "Bring your own language model key in VS Code now available": {
    ja: "GitHub 提供モデルだけに縛られず、組織のコスト方針やデータ統制要件に合わせたモデルプロバイダーを選べるようになるため、Enterprise 導入判断に直結します。",
    en: "This directly affects Enterprise adoption decisions because teams are no longer limited to GitHub-hosted models and can choose providers that match their cost or governance constraints.",
  },
  "C++ code intelligence for GitHub Copilot CLI in public preview": {
    ja: "CLI 中心のフローで C++ 作業の補完・解析精度が上がるため、IDE に切り替えずに terminal から C++ プロジェクトを扱いやすくなります。",
    en: "This improves C++ development in CLI-centric workflows by bringing the same IntelliSense quality available in VS Code and Visual Studio directly to the terminal.",
  },
  "Dependabot alerts are now assignable to AI agents for remediation": {
    ja: "単なる依存更新では済まない脆弱性修正を agent に任せられるため、セキュリティ対応の滞留を減らしやすくなります。",
    en: "This helps reduce security backlog by letting agents handle remediation work that requires actual code changes, not just dependency bumps.",
  },
  "Ask Copilot in security assessments now available": {
    ja: "セキュリティ評価画面からそのまま Copilot で状況理解と対処案の確認へ進めるので、調査と修正判断の往復を減らしやすい更新です。",
    en: "This reduces context switching by letting security teams move directly from assessment results into Copilot-guided investigation and next-step planning.",
  },
  "Visual Studio Code 1.122": {
    ja: "agent 運用、BYOK、browser testing の複数面に効く release なので、開発環境と統制要件の両方で確認したい更新です。",
    en: "This release matters across agent operations, BYOK, and browser testing, so it should be checked against both developer workflows and governance requirements.",
  },
  "Visual Studio Code 1.117": {
    ja: "BYOK、chat 応答描画、Agent Sessions、background terminal 通知がまとまっており、agent を日常運用へ寄せる上で確認したい release です。",
    en: "This release is worth checking for day-to-day agent operations because it combines BYOK, chat rendering, Agent Sessions, and background terminal notifications.",
  },
  "Visual Studio Code 1.122: Agents Window (Preview)": {
    ja: "複数 session の状態確認が速くなり、agent 作業の review や引き継ぎで迷子になりにくくなります。",
    en: "This makes multi-session agent work easier to review and hand off because the session context is visible before opening it.",
  },
  "Visual Studio Code 1.122: Richer OpenTelemetry signals for agents": {
    ja: "agent 実行を既存の telemetry 基盤へ載せやすくなり、tool 実行や hook 結果まで含めた運用監視に近づきます。",
    en: "This moves agent execution closer to normal operational monitoring by exposing tool activity and hook outcomes in telemetry.",
  },
  "Visual Studio Code 1.122: Sandboxing": {
    ja: "sandbox 失敗時の再試行前提が変わるため、Autopilot や Bypass Approvals を使う組織は安全境界と失敗復旧の期待値を見直す必要があります。",
    en: "This matters for organizations using Autopilot or Bypass Approvals because sandbox failure and retry expectations may change.",
  },
  "Visual Studio Code 1.122: Use BYOK without a GitHub sign in": {
    ja: "GitHub sign-in できない制約環境でも BYOK / local model を使いやすくなり、閉域や検証環境での Copilot 導入判断に直結します。",
    en: "This directly affects Copilot adoption in restricted environments because BYOK and local models no longer depend on GitHub sign-in.",
  },
  "Claude Opus 4.8 is generally available for GitHub Copilot": {
    ja: "GA になったことで preview 前提の注意を外しやすくなり、高難度の設計・実装タスクで使うモデル候補として検討しやすくなります。",
    en: "General availability makes Opus 4.8 easier to consider for higher-difficulty design and implementation tasks without treating it as a preview-only option.",
  },
  "Copilot usage metrics API adds cohorts for AI adoption": {
    ja: "active user 数だけでは見えない採用段階を cohort として追えるため、展開施策や enablement の打ち手を絞り込みやすくなります。",
    en: "This helps teams tune rollout and enablement work because adoption cohorts reveal more than active-user counts alone.",
  },
  "Target Copilot models to organizations with model rules": {
    ja: "enterprise 配下の組織ごとにモデル展開を分けられるため、先行導入、制限付き展開、コスト統制を同じ policy 運用で扱いやすくなります。",
    en: "This makes staged rollout, restricted access, and cost governance easier to manage through model rules across organizations.",
  },
  "Copilot usage metrics now identify active and passive Copilot code review users":
    {
      ja: "本当に能動利用されている code review かを分けて見られるので、ライセンス評価や定着施策の精度が上がります。",
      en: "This improves adoption analysis by distinguishing truly intentional code-review usage from reviews that were only added automatically.",
    },
  "Organization runner controls for Copilot cloud agent": {
    ja: "runner を組織既定にできるので、cloud agent の実行環境を性能・ネットワーク・統制の観点でそろえやすくなります。",
    en: "This matters because organizations can standardize cloud-agent execution environments for performance, network access, and governance.",
  },
  "Organization firewall settings for Copilot cloud agent": {
    ja: "agent の外部通信制御を組織単位で統一できるため、prompt injection やデータ流出対策を repo ごとにばらつかせずに済みます。",
    en: "This is important because outbound agent access can now be governed consistently at the organization level instead of varying repo by repo.",
  },
  "Copilot cloud agent signs its commits": {
    ja: "signed commit 必須の branch protection があっても cloud agent を止めずに使えるようになるため、導入できる repo が増えます。",
    en: "This expands where cloud agent can be used by making it compatible with repositories that require signed commits.",
  },
  "Copilot SDK in public preview": {
    ja: "自前アプリや workflow に agent 実行基盤を埋め込める入口なので、Copilot を製品機能として組み込みたいチームに影響が大きい更新です。",
    en: "This is a high-impact entry point for teams that want to embed Copilot-style agent capabilities into their own products and workflows.",
  },
  "GPT-5.1 Codex, GPT-5.1-Codex-Max, and GPT-5.1-Codex-Mini deprecated": {
    ja: "model policy や既定選択を見直す必要があるので、既存運用へ直接影響する廃止告知です。",
    en: "This matters because existing defaults, model policies, and migration plans may need to change immediately for teams still relying on the GPT-5.1 Codex family.",
  },
  "GitHub Copilot CLI、メインのAIモデルとは異なるAIモデルをセカンドオピニオンに使う「Rubber Duck」モード":
    {
      ja: "CLI での複雑作業に別モデル視点を差し込めることを示していて、実運用での agent 品質向上余地を判断する材料になります。",
      en: "This is a useful signal for teams evaluating whether a second-model review loop can improve agent quality in CLI-heavy workflows.",
    },
  "Copilot usage metrics now includes per-user GitHub Copilot CLI activity in organization reports":
    {
      ja: "CLI 利用の実態をユーザー単位で追えるので、定着状況、教育対象、コスト配分の見直しに使いやすい更新です。",
      en: "This gives organizations a clearer basis for rollout planning, enablement, and cost attribution by exposing who is actually using Copilot CLI and how heavily.",
    },
  "GitHub Copilot app is now available in technical preview": {
    ja: "GitHub ネイティブなデスクトップ体験を早期検証できるため、導入前に既存開発フローとの適合を見極めやすくなります。",
    en: "This enables early evaluation of a GitHub-native desktop workflow before broader rollout decisions are made.",
  },
  "Copilot cloud agent supports auto model selection": {
    ja: "モデル選択を Auto に委ねる運用が可能になり、可用性と品質のバランスを取りつつモデル運用負荷を下げやすくなる更新です。",
    en: "This reduces model-management overhead by allowing Auto routing while balancing availability and output quality.",
  },
  "Introducing Copilot CLI agent and unified sessions view in GitHub Copilot for JetBrains IDEs":
    {
      ja: "JetBrains でも Copilot CLI agent と統合セッション管理が使えるようになり、IDE 間で agent 運用をそろえやすくなります。",
      en: "This brings Copilot CLI agent workflows and unified session management into JetBrains IDEs, improving cross-IDE operational consistency.",
    },
  "Team-level Copilot usage metrics now available via API": {
    ja: "チーム単位で Copilot 利用状況を分析できるため、配布方針や有効化施策を組織運用に合わせて見直しやすくなります。",
    en: "This improves organizational governance by enabling team-level Copilot adoption and usage analysis through the API.",
  },
  "Copilot Memory supports user preferences for Pro, Pro+ users": {
    ja: "ユーザーごとの好みが継続反映されるため、応答品質の安定化とプロンプト運用の見直しに直接影響します。",
    en: "This affects prompt operations directly because user preferences can persist and shape response consistency over time.",
  },
  "Building a general-purpose accessibility agent—and what we learned in the process":
    {
      ja: "アクセシビリティ改善を継続運用するための agent 設計知見であり、社内の評価基準や改善ループ設計の参考になります。",
      en: "This offers practical lessons for building ongoing accessibility-improvement loops with agents, useful for internal evaluation and iteration practices.",
    },
  "The Coding Harness Behind GitHub Copilot in VS Code": {
    ja: "モデルやツールが更新されても開発体験を維持する実装方針を示しており、長期運用時の品質管理に関わる内容です。",
    en: "This matters for long-term operations because it explains how VS Code preserves coding quality as model and tool ecosystems change.",
  },
  "GPT-5.3-Codex is now the base model for Copilot Business and Enterprise": {
    ja: "組織既定モデルの切り替えは日常の生成結果に直結するため、評価基準と社内ガイドの前提見直しが必要です。",
    en: "A default model switch impacts daily outputs immediately, so evaluation baselines and internal guidance may need to be updated.",
  },
  "GitHub Copilot in Visual Studio — March update": {
    ja: "Visual Studio 側でも custom agents や診断支援が広がっていて、IDE ごとの agent 体験差を埋める流れとして重要です。",
    en: "This matters because it broadens serious agent and diagnostic workflows in Visual Studio, reducing the capability gap across GitHub Copilot surfaces.",
  },
  "Copilot organization custom instructions are generally available": {
    ja: "組織全体で Copilot の前提知識や振る舞いをそろえられるため、repo ごとのばらつきやレビュー負荷を減らしやすくなります。",
    en: "This is important because organizations can now enforce shared Copilot behavior and context at scale instead of relying on repository-by-repository conventions.",
  },
  "Research, plan, and code with Copilot cloud agent": {
    ja: "実装前の plan 確認や branch 上での試行がやりやすくなり、cloud agent をいきなり PR 前提で使わなくて済むようになります。",
    en: "This matters because cloud-agent work no longer has to begin and end as a pull request, making planning and branch-level iteration much more practical.",
  },
  "Visual Studio Code 1.114": {
    ja: "chat の実運用で効く改善がまとまっていて、共有、検索、障害切り分けの負荷を下げる release として意味があります。",
    en: "This release matters because it improves day-to-day chat operations across sharing, search, and troubleshooting rather than adding a single isolated feature.",
  },
  "Visual Studio Code 1.113": {
    ja: "customization と subagent 周りの操作性が前に進んでいて、agent を継続利用するチームほど影響が大きい release です。",
    en: "This is important for teams using agents continuously because it improves customization, model control, and subagent workflows rather than just one-off prompts.",
  },
  "Visual Studio Code 1.112": {
    ja: "permission、troubleshoot、browser debugging など agent 運用の土台を固める変更が多く、実導入の安定性に効きます。",
    en: "This matters because it strengthens the operational foundation for agents with better permissions, troubleshooting, and browser-debugging support.",
  },
  "Visual Studio Code 1.111": {
    ja: "Autopilot preview や permission picker など、agent を任せる前提の UI と制御がそろい始めた節目の release です。",
    en: "This is a meaningful milestone because it starts to put the UI and control model in place for workflows where agents are trusted with more autonomy.",
  },
  "February 2026 (version 1.110)": {
    ja: "plugin、session memory、browser tools など agent 拡張の基盤が広がる release なので、中長期の活用余地に効きます。",
    en: "This matters because it expands the platform surface for agent workflows through plugins, session memory, and browser tooling rather than a narrow feature tweak.",
  },
  "December 2025 (version 1.108)": {
    ja: "session picker や terminal 承認など運用まわりの改善が多く、日常的な agent 利用の扱いやすさに効く release です。",
    en: "This matters because it improves the day-to-day ergonomics of agent use through session handling, terminal approvals, and broader editor polish rather than a single headline feature.",
  },
  "November 2025 (version 1.107)": {
    ja: "session 統合や org 共有 agent など、VS Code を multi-agent の作業面として使う方向性を強めた release です。",
    en: "This matters because it pushed VS Code further toward a practical multi-agent workspace with shared sessions, worktree isolation, and org-level agent reuse.",
  },
  "January 2026 (version 1.109)": {
    ja: "multi-agent development を前に進める土台が多く入っていて、その後の VS Code agent 体験の方向性を決める release です。",
    en: "This is foundational because it established much of the session, memory, and orchestration model that later multi-agent VS Code work builds on.",
  },
  "Run multiple agents at once with /fleet in Copilot CLI": {
    ja: "CLI でも並列分解前提の作業が現実的になるので、複数ファイルや複数領域にまたがるタスクの進め方を変えうる更新です。",
    en: "This can materially change how larger CLI tasks are executed by making parallel decomposition practical across multiple files and workstreams.",
  },
  "Agent-driven development in Copilot Applied Science": {
    ja: "agent-first な repository 運用をどう成立させるかの実例なので、導入時の process 設計や guardrail の考え方に直接効きます。",
    en: "This is valuable because it provides a concrete operating model for agent-first repositories, including process design and guardrails rather than just prompting tips.",
  },
  "Building AI-powered GitHub issue triage with the Copilot SDK": {
    ja: "Copilot SDK を自前サービスへ組み込むときの実装像が具体的で、agent 機能を製品化したいチームの参考になります。",
    en: "This matters because it shows what a production-minded Copilot SDK integration looks like when agent functionality is embedded into a real product flow.",
  },
  "How Squad runs coordinated AI agents inside your repository": {
    ja: "複数 agent の協調を repo 内でどう回すかの具体像があり、orchestration 設計や共有メモリの置き方を考える材料になります。",
    en: "This is useful because it gives a concrete repository-native model for multi-agent orchestration, including how coordination and shared memory can work in practice.",
  },
  "How VS Code Builds with AI": {
    ja: "VS Code チーム自身の運用事例なので、どの作業に AI を当てているかを見る材料として価値があります。",
    en: "This matters because it shows how the VS Code team itself applies AI in practice, which is more actionable than a generic product announcement.",
  },
  "Continuous AI for accessibility: How GitHub transforms feedback into inclusion":
    {
      ja: "アクセシビリティ対応を一回限りでなく継続改善へ組み込む観点があり、AI 活用の運用設計を見る材料になります。",
      en: "This is important because it frames accessibility work as a continuous AI-assisted improvement loop rather than a one-time remediation effort.",
    },
  "The era of “AI as text” is over. Execution is the new interface.": {
    ja: "AI を実行主体として扱う設計思想を整理していて、SDK や tool integration をどう位置づけるかの理解に効きます。",
    en: "This matters because it gives a sharper conceptual model for treating AI as an execution layer, which influences how teams evaluate SDKs and tool integrations.",
  },
  "60 million Copilot code reviews and counting": {
    ja: "code review の利用規模がどこまで来ているかの指標で、レビュー自動化を導入判断する際の材料になります。",
    en: "This is useful as an adoption signal for teams deciding how seriously to treat AI-assisted code review in their own engineering process.",
  },
  "Join or host a GitHub Copilot Dev Days event near you": {
    ja: "単なる告知ではなく、学習機会や社内展開の場を増やせるので、enablement の観点で意味があります。",
    en: "This matters from an enablement perspective because it points to concrete ways teams can accelerate learning and internal rollout around Copilot.",
  },
  "From idea to pull request: A practical guide to building with GitHub Copilot CLI":
    {
      ja: "CLI、IDE、GitHub をまたぐ実践フローが整理されていて、導入時の標準手順を考える材料になります。",
      en: "This is useful because it outlines a practical end-to-end operating model that spans CLI exploration, IDE judgment, and GitHub reviewable output.",
    },
  "What's new with GitHub Copilot coding agent": {
    ja: "coding agent の更新点を横断して把握できるので、背景作業の自動化をどこまで任せられるかを見極める助けになります。",
    en: "This matters because it helps teams evaluate how much more background work can be delegated safely to the coding agent across the latest updates.",
  },
  "Dungeons & Desktops: Building a procedurally generated roguelike with GitHub Copilot CLI":
    {
      ja: "Copilot CLI を使った試作フローの実例として、terminal 中心の開発でどこまで短時間に形にできるかを判断する材料になります。",
      en: "This matters as a concrete example of how far terminal-first prototyping can be pushed with Copilot CLI in a real build.",
    },
  "Fix merge conflicts in three clicks with Copilot cloud agent": {
    ja: "競合解消のためにローカルへ戻って手で直す回数を減らせるので、pull request 上で止まりやすい統合作業をそのまま前に進めやすくなります。",
    en: "This matters because it reduces how often developers have to drop out of a pull request into local manual conflict resolution, keeping integration work moving inside the review flow.",
  },
  "Visual Studio Code 1.115: Bring your own key for Copilot Business and Enterprise":
    {
      ja: "GitHub 提供モデルだけに縛られず、自社のコスト方針やデータ統制に合わせてモデル接続先を選べるようになるので、Enterprise 導入判断に直結します。利用前に policy 有効化の運用整理は必要です。",
      en: "This matters because Business and Enterprise teams can choose model providers that better match their cost, governance, or data-control requirements instead of relying only on GitHub-hosted defaults. Admin policy rollout still needs to be planned.",
    },
  "Model selection for Claude and Codex agents on github.com": {
    ja: "github.com 上で Claude / Codex agent ごとにモデルを選べるようになるため、タスク内容に応じた品質とコストの調整がしやすくなります。Business / Enterprise では管理ポリシーと repo 設定の両方を確認する必要があります。",
    en: "This matters because model choice can now be tuned per task on github.com when using Claude or Codex agents, improving control over quality and cost. Business and Enterprise teams also need both admin policy and repository settings aligned.",
  },
  "Copilot data residency in US + EU and FedRAMP compliance now available": {
    ja: "データ所在やコンプライアンス要件で Copilot 導入を止めていた組織でも、US / EU と FedRAMP 前提で本番評価を進めやすくなる更新です。利用時は対象モデル制約と 10% のコスト増分も見ておく必要があります。",
    en: "This is important for organizations blocked by data-sovereignty or compliance requirements because Copilot can now be evaluated under US or EU residency and FedRAMP constraints. The tradeoff is a restricted model set and a 10% higher model multiplier for those requests.",
  },
  "Remote control CLI sessions on web and mobile in public preview": {
    ja: "長時間の CLI 作業をデスクトップ前に張り付かず見守って差し込めるので、agent 的な terminal 運用を継続しやすくなります。",
    en: "This matters because long-running CLI work can now be supervised and nudged away from the desktop, making terminal-centric agent workflows easier to sustain.",
  },
  "Enforcing new limits and retiring Opus 4.6 Fast from Copilot Pro+": {
    ja: "Copilot Pro+ の高負荷な使い方やモデル選択の前提が変わるため、日常的に重い利用をしているユーザーや社内案内に直接影響します。",
    en: "This matters because it changes the assumptions around heavy Copilot Pro+ usage and model availability, which directly affects power users and team guidance.",
  },
  "Building Long-Distance Next Edit Suggestions": {
    ja: "より長い編集候補を出すための技術背景が分かるので、Copilot 編集体験の限界や今後の伸び代を理解しやすくなります。",
    en: "This is useful because it explains the technical work behind more ambitious edit suggestions, helping teams understand where Copilot editing is heading.",
  },
  "Your Home for Multi-Agent Development": {
    ja: "VS Code が multi-agent のハブを狙っていることを示していて、今後どこへ寄せていくべきかの判断材料になります。",
    en: "This matters because it signals VS Code's strategic direction as a hub for multi-agent work, which affects longer-term tooling decisions.",
  },
  "Making agents practical for real-world development": {
    ja: "単なる機能追加ではなく、agent を日常運用に乗せるための課題整理なので、導入側の視点と噛み合います。",
    en: "This is useful because it focuses on the practical constraints of making agents work in daily development, not just showcasing raw capabilities.",
  },
  "Giving Agents a Visual Voice: MCP Apps Support in VS Code": {
    ja: "agent が UI を返せる方向へ広がるので、テキスト中心だった応答設計を見直すきっかけになります。",
    en: "This matters because it expands agent outputs beyond plain text, which can change how teams think about interactive workflows in VS Code.",
  },
  "Building docfind: Fast Client-Side Search with Rust and WebAssembly": {
    ja: "大規模ドキュメントでも静的配布のまま検索性を上げる実装例として、docs 基盤の改善に応用しやすい話です。",
    en: "This is useful as an implementation reference for teams improving search in large static documentation sites without adding server-side infrastructure.",
  },
  "Introducing the VS Code Insiders Podcast": {
    ja: "公式の継続情報源が増えるので、release note 以外の背景情報を追いやすくなります。",
    en: "This matters as a new ongoing signal source for teams that want more continuous context than release notes alone provide.",
  },
  "GPT-5.4 mini is now available in Copilot Student auto model selection": {
    ja: "Student プランでも auto selection の選択肢が広がるので、教育・学習用途で触れられるモデル体験が増えます。",
    en: "This matters because it broadens the auto-model experience available to Student users, which affects what learners can access by default.",
  },
  "マイクロソフト、Claude CodeやGitHub Copilotに「このアプリをデプロイせよ」と指示すればAIが最適なインフラ構成やサービスでデプロイしてくれる「Azure Skills Plugin」公開":
    {
      ja: "AI agent にクラウド構成判断まで任せる方向を示していて、開発支援から運用自動化へ広がる流れの確認材料になります。",
      en: "This is a useful signal for teams tracking the shift from coding assistance toward agent-driven infrastructure planning and deployment.",
    },
  "GitHub Mobile: Research and code with Copilot cloud agent anywhere": {
    ja: "cloud agent をデスクトップや pull request 画面に縛らず使えるので、移動中や外出先でも作業継続しやすくなります。",
    en: "This matters because cloud-agent workflows are no longer tied as tightly to desktop or pull-request contexts, making mobile continuity much more practical.",
  },
  "Visual Studio Code 1.115": {
    ja: "browser と terminal の agent tool が長時間タスク前提で実用寄りになり、Agents app preview も含めて agent-native 開発を日常運用へ近づける release です。",
    en: "This matters because browser and terminal agent tools become much more practical for long-running work, while the Agents app preview pushes VS Code further toward day-to-day agent-native development.",
  },
  "Visual Studio Code 1.120": {
    ja: "Agents ウィンドウの Stable 提供開始、BYOK モデルの token 可視化と thinking effort 設定、CLI plugin 自動検出など、agent 開発の実用性と可視性を高める変更が揃っているため、VS Code agent を日常利用するチームは設定確認とワークフロー見直しの対象になります。",
    en: "This release matters because it makes the Agents window available in Stable, improves visibility and control for BYOK model usage, and removes friction from plugin setup, all of which affect daily agent development workflows in VS Code.",
  },
  "Copilot-reviewed pull request merge metrics now in the usage metrics API": {
    ja: "Copilot が authoring だけでなく review から merge までにどう効いているかを測れるので、導入効果の可視化と自動レビュー定着の判断に直接使えます。",
    en: "This matters because teams can now measure Copilot's effect beyond authoring and see whether automated reviews are influencing merge outcomes and adoption in practice.",
  },
  "GitHub Copilot in Visual Studio Code, March Releases": {
    ja: "月次ではなく週次リリースへ移った後の変化をまとめて追えるので、VS Code Copilot の運用差分を短時間で把握しやすい更新です。",
    en: "This matters because it gives teams a consolidated view of the first wave of weekly VS Code Copilot changes, making rollout impact easier to assess.",
  },
  "VS Code Updates changed": {
    ja: "固定ハブページの変化から新しい release note 導線や主要見出しを早く拾えるので、監視入口として意味があります。",
    en: "This matters because changes on the landing page can surface new release-note entry points and major themes before you inspect every page in detail.",
  },
  "Visual Studio Code 1.115: Browser agent tools improvements": {
    ja: "agent がブラウザー操作をした後の追跡と再介入がしやすくなるので、Playwright 系の検証フローを安定させやすい更新です。",
    en: "This matters because browser-agent workflows become easier to inspect and resume, which reduces friction in Playwright-heavy validation flows.",
  },
  "Visual Studio Code 1.115: Send input to background terminals": {
    ja: "長時間実行や timeout 後でも terminal セッションを捨てずに済むため、agent の terminal 作業がかなり実用的になります。",
    en: "This matters because agents no longer lose interactivity when a terminal session moves to the background, making long-running terminal workflows much more practical.",
  },
  "Visual Studio Code 1.115: Background terminal notifications (Experimental)":
    {
      ja: "background terminal を細かく見張り続ける必要が減るので、並列作業時の見落としと polling コストを下げられます。",
      en: "This matters because it reduces polling overhead and missed prompts while agents juggle multiple background tasks.",
    },
  "Visual Studio Code 1.115: Upcoming deprecations": {
    ja: "旧 Edit Mode に依存する運用は移行期限が明確になったので、settings や利用手順の見直しを前倒ししやすくなります。",
    en: "This matters because teams still relying on Edit Mode now have a clearer migration deadline for settings and workflow changes.",
  },
  "VS Code Release Notes 1.109 changed": {
    ja: "過去 release note の記述修正でも、参照中の docs や比較メモの前提が変わることがあるため、アーカイブ監視として押さえておく価値があります。",
    en: "This matters because even edits to archived release notes can change the guidance or references that downstream notes and comparisons rely on.",
  },
  "60 million Copilot code reviews and counting": {
    ja: "単なる件数報告ではなく、高信号レビューをどう評価し、agentic architecture で改善しているかまで分かるので、AI code review を運用へ載せるときの判断材料になります。",
    en: "This matters because it goes beyond a usage milestone and shows how GitHub evaluates review quality and improves it through an agentic architecture, which is useful for teams operationalizing AI code review.",
  },
  "Enable Copilot cloud agent via custom properties": {
    ja: "CCA を段階的に展開したい enterprise では、特定組織だけでパイロット導入を始め、効果を確認しながら順次拡大できるようになります。全組織一括展開はリスクが高い場合や、コスト・統制の観点で展開範囲を絞りたい場合に直接効く更新です。",
    en: "This matters because enterprises can now pilot CCA with select organizations and expand access progressively instead of enabling it everywhere at once, which helps manage risk, cost, and governance as adoption grows.",
  },
  "Visual Studio Code 1.116": {
    ja: "GitHub Copilot の組み込み対応、agent debug log の永続化、CLI での thinking effort 設定など、agent を日常運用で使い続けやすくする変更が揃った release です。",
    en: "This matters because it brings a set of changes that make day-to-day agent use more sustainable, including built-in Copilot, persistent session debug logs, and thinking-effort controls in the CLI.",
  },
  "Visual Studio Code 1.117": {
    ja: "BYOK により Business / Enterprise チームがモデル接続先を自社要件に合わせて選べるようになり、incremental rendering・セッションソート・terminal 通知で日常の agent 操作感も直接改善される release です。",
    en: "This matters because BYOK lets Business and Enterprise teams choose model providers that fit their governance and cost requirements, while incremental rendering, session sorting, and terminal notifications improve the day-to-day feel of agent work.",
  },
  "Visual Studio Code 1.116: Debug previous agent sessions": {
    ja: "セッション終了後でも過去の agent 操作を後から追跡できるため、カスタマイズの品質確認や問題の再現なしでの診断がしやすくなります。",
    en: "This matters because it allows post-session debugging without having to reproduce problems, making it easier to diagnose customization issues and agent behavior after the fact.",
  },
  "Visual Studio Code 1.116: Configure thinking effort in Copilot CLI": {
    ja: "CLI でも reasoning model の思考量をタスクに応じて調整できるため、品質とレイテンシのトレードオフを局面ごとにコントロールしやすくなります。",
    en: "This matters because thinking-effort control in the CLI lets you tune the quality-latency tradeoff per task rather than accepting a single fixed behavior for all CLI sessions.",
  },
  "Visual Studio Code 1.116: Customizations welcome page": {
    ja: "カスタマイズの全体把握と下書き生成をひとつの画面で進められるため、agent instructions や skills の整備を始めやすくなります。初期設定の手間を下げることで、カスタマイズ機能の定着を後押しします。",
    en: "This matters because it reduces the barrier to adopting agent customizations by letting teams see what they have and draft new customizations from natural language in one place.",
  },
  "Visual Studio Code 1.116: Tool confirmation carousel (Experimental)": {
    ja: "tool call が多いセッションで承認作業の往復を減らせるため、agent の自動実行範囲を広げながらも監視コストを下げやすくなります。",
    en: "This matters because it reduces the overhead of supervising tool-heavy agent sessions, making it more practical to expand agent autonomy while keeping human oversight in place.",
  },
  "Visual Studio Code 1.117: Incremental rendering of chat responses (Experimental)":
    {
      ja: "応答の体感速度が上がるため、長い回答を頻繁に扱う agent セッションでの使用感に直接効きます。",
      en: "This directly improves the feel of chat-heavy agent sessions by reducing the perceived wait time for longer responses.",
    },
  "Visual Studio Code 1.117: Sort agent sessions by recent activity": {
    ja: "セッションが増えた環境で目的のものへ戻りやすくなり、複数コンテキストを切り替える運用の摩擦を下げます。",
    en: "This reduces friction when managing multiple sessions by making it easy to return to the most recently active context.",
  },
  "Visual Studio Code 1.117: System notifications for background terminal commands":
    {
      ja: "terminal に切り替えなくてもバックグラウンド処理の状況を把握できるため、agent に任せながら別作業を進めやすくなります。",
      en: "This matters because background work can be monitored from the chat view without context-switching to the terminal, keeping agent-supervised workflows more fluid.",
    },
  "Visual Studio Code 1.117: Visual Studio Code Agents (Insiders)": {
    ja: "並列セッションやインライン diff など agent ネイティブな体験の方向性を早めに確認でき、Insiders を使うチームの検証候補になります。",
    en: "This is worth evaluating early if your team uses Insiders, because it shows the direction of agent-native VS Code workflows including parallel sessions and inline diff review.",
  },
  "Build a personal organization command center with GitHub Copilot CLI": {
    ja: "Copilot CLI で実用的な生産性ツールを段階的に構築できることを示す事例で、自分のチームや業務に合わせた CLI ベースのツール作りを検討する材料になります。",
    en: "This is a useful reference for teams evaluating whether Copilot CLI can power productivity tooling built around their specific workflows and organization structure.",
  },
  "GitHub Copilot CLI now supports Copilot auto model selection": {
    ja: "全プランで使えるようになったため、モデルを手動で選ばなくても Copilot が自動でタスクに合ったモデルを選ぶ運用が選択肢に入る。モデル選択を個別管理していたチームは設定方針を見直す材料になります。",
    en: "This is now available across all Copilot plans and removes the need to manually pick a model for CLI tasks. Teams currently managing model selection by hand now have auto as a viable low-maintenance default.",
  },
  "Claude Opus 4.7 is generally available": {
    ja: "Claude Opus 4.7 が利用可能になるため、多ステップタスクや長時間の agentic 実行で使えるモデルの選択肢が広がります。Opus 系を業務で使っているチームは切り替えを検討する材料になります。",
    en: "This expands model options for multi-step tasks and long agentic sessions. Teams already using Opus-family models in their workflows now have a direct upgrade path to evaluate.",
  },
  "Manage agent skills with GitHub CLI": {
    ja: "agent skill の追加・管理を GUI を介さず CLI から完結できるようになるため、CI/CD スクリプトや開発環境セットアップへの組み込みがしやすくなります。",
    en: "This makes agent skill management scriptable and CLI-native, which simplifies onboarding flows and CI/CD integration where GUI-based setup is impractical.",
  },
  "Building an emoji list generator with the GitHub Copilot CLI": {
    ja: "小さなユーティリティを Copilot CLI で段階的に組み立てる実例として、CLI 活用の具体的な出発点になります。",
    en: "This provides a concrete, low-stakes starting point for teams exploring what incremental CLI-based development with Copilot looks like in practice.",
  },
  "Changes to GitHub Copilot plans for individuals": {
    ja: "個人 Copilot プランを利用しているユーザーや社内で案内しているチームは、新規登録停止・利用上限の変更・Opus モデル撤去の 3 点を確認する必要があります。キャンセル時の払い戻し期限（5/20 まで）もあわせて周知が必要です。",
    en: "Any user or team managing individual Copilot subscriptions needs to account for the signup pause, tighter Pro limits, and Opus model removal. The April refund window (available through May 20 via GitHub Support) is also time-sensitive.",
  },
  "GitHub Copilot for Jira: Our latest enhancements": {
    ja: "Jira と GitHub を併用するチームにとって、Copilot cloud agent 連携の設定自由度が上がることは既存ワークフローへの組み込みコストを下げる。具体的な変更内容を原文で確認し、自チームの Jira 運用に適用できるか判断することを推奨。",
    en: "This matters for teams using both Jira and GitHub because increased customizability in the Copilot cloud agent integration reduces the friction of fitting it into existing Jira workflows.",
  },
  "Copilot code review user counts now aggregate in usage metrics API": {
    ja: "Enterprise・組織の管理者が Copilot code review の active・passive ユーザー数を usage metrics API で集計できるようになり、コードレビュー機能の実際の採用状況を定量的に把握しやすくなる。",
    en: "This matters because enterprise and organization admins can now track aggregated active and passive Copilot code review user counts via the API, making it easier to quantify real adoption of the code review feature.",
  },
  "Pausing new self-serve signups for GitHub Copilot Business": {
    ja: "Copilot Business の新規セルフサービス登録ルートが変わるため、組織で Business プランの導入を検討または進めている場合は代替の購入経路を確認する必要があります。",
    en: "This matters because the self-serve signup path for Copilot Business is now paused, so organizations planning to adopt Business plan seats need to check alternative purchasing routes.",
  },
  "Copilot cloud agent fields added to usage metrics": {
    ja: "enterprise / organization 管理者が cloud agent の利用状況をユーザーレベルで API から確認できるようになるため、導入状況の把握や usage monitoring スクリプトへの組み込みがしやすくなります。",
    en: "This matters because enterprise and organization admins can now track per-user cloud agent adoption via the API, making it easier to build usage monitoring pipelines without workarounds.",
  },
  "View and manage agent sessions from issues and projects": {
    ja: "issue や project のビューのまま cloud agent の状況確認と操作ができるため、agent 作業中の context switch が減り、agent 管理の手間を軽減できます。",
    en: "This reduces context switching by letting teams monitor and steer cloud agent sessions without leaving the issues or projects view they are already working in.",
  },
  "Copilot Chat improvements for pull requests": {
    ja: "PR の diff やコードを Copilot Chat で直接問い合わせられるため、レビュー作業や変更内容の理解を効率化しやすくなります。",
    en: "This improves PR review efficiency by letting you ask Copilot about diffs and code changes directly in Chat without leaving the pull request.",
  },
  "Better debugging with GitHub Copilot on the web": {
    ja: "web 上でのデバッグ作業でスタックトレースから根本原因の特定までが速くなるため、エラー調査の効率が直接向上します。",
    en: "This directly speeds up error investigation on the web by improving how reliably Copilot recognizes stack traces and links them to relevant code context.",
  },
  "Upcoming change to Copilot usage metrics report download URLs": {
    ja: "usage metrics レポートをダウンロードする automation やスクリプトを持つ場合は、URL 変更後に動作しなくなる可能性があるため、移行時期を事前に確認して対応する必要があります。",
    en: "This matters for any team with automation or scripts that download Copilot usage metrics reports, as the old URLs will stop working after migration and will need to be updated in advance.",
  },
  "GPT-5.5 is generally available for GitHub Copilot": {
    ja: "GPT-5.5 の GA により、多ステップの agentic タスクに特化した性能を持つモデルが本番運用の選択肢に加わった。Copilot で複雑なコーディングタスクを扱うチームは使用モデルの見直しを検討する材料になります。",
    en: "This matters because GPT-5.5 is now available for production use on GitHub Copilot and offers improved performance on complex, multi-step agentic coding tasks, expanding the practical model options for teams.",
  },
  "Inline agent mode in preview and more in GitHub Copilot for JetBrains IDEs":
    {
      ja: "JetBrains IDE を使うチームは、インライン agent mode を early preview として試して運用適合を判断するタイミングに入りました。Next Edit Suggestions の強化や自動承認の拡充も日常の編集フローを改善します。",
      en: "This matters for JetBrains IDE users because inline agent mode is now in early preview and ready for validation, while improvements to Next Edit Suggestions and auto-approve reduce friction in everyday editing.",
    },
  "Notice about upcoming new format for GitHub App installation tokens": {
    ja: "GitHub App のトークンをパターンマッチや正規表現で検証しているスクリプトや CI/CD は、4月27日以降の新フォーマットで動作しなくなる可能性があります。使用中の検証コードを事前に確認することを推奨します。",
    en: "This matters for any integration that validates GitHub App installation tokens by format, such as regex checks in CI/CD pipelines, because the new token format may not match existing patterns after April 27.",
  },
  "Upcoming deprecation of GPT-5.2 and GPT-5.2-Codex": {
    ja: "6月1日までに GPT-5.2 または GPT-5.2-Codex を直接指定しているワークフローや統合は、代替モデルへの切り替えが必要です。Enterprise 管理者はモデルポリシーで代替モデルを有効化し、ユーザーが移行できる環境を整えておく必要があります。",
    en: "Any workflow or integration explicitly targeting GPT-5.2 or GPT-5.2-Codex must be updated before June 1, 2026. Enterprise admins should verify that the suggested replacement models are enabled in model policies so users can migrate without disruption.",
  },
  "Copilot Student GPT-5.3-Codex removal from model picker": {
    ja: "Copilot Student プランを利用している学生ユーザーは、手動でモデルを選択できなくなるため設定の確認が必要です。自動モデル選択に移行すれば機能自体は引き続き使えるため、影響は限定的ですが Student プランを展開している組織は対応を案内しておくと安心です。",
    en: "This matters for students relying on the Copilot Student plan because GPT-5.3-Codex will no longer appear in the model picker, requiring a shift to auto model selection. The impact is limited since auto selection continues to include the model, but teams managing Student plan rollouts should inform users of the change.",
  },
  "Copilot cloud agent starts 20% faster with Actions custom images": {
    ja: "issue を割り当ててからタスクが開始されるまでの待機時間が20%以上短縮されるため、agent を頻繁に使うチームはフィードバックループが速くなる恩恵を受けやすくなります。",
    en: "This directly reduces the feedback loop for teams that rely on Copilot cloud agent regularly, since tasks now start over 20% faster after issue assignment, making the agent workflow more responsive.",
  },
  "GitHub Copilot code review will start consuming GitHub Actions minutes on June 1, 2026":
    {
      ja: "6月1日以降、PR ごとに自動実行される Copilot code review が Actions 分数を消費するため、現在の Actions 利用量と予算を事前に確認し、必要に応じて上限設定や使い方の見直しが必要です。",
      en: "This matters because Copilot code review running on every pull request will start consuming Actions minutes from June 1, 2026. Teams should check current Actions usage and budgets now to avoid unexpected overages after the change takes effect.",
    },
  "Visual Studio Code 1.119": {
    ja: "Changes ビューの Git 統合と CLI モデルバッジで agent 運用の可視性が上がり、新 sandbox モードでオンライン通信が必要なタスクへの対応も広がる release です。",
    en: "This release improves agent visibility with Git-backed Changes tracking and CLI model badges, while the new sandbox mode expands support for tasks that need external network access.",
  },
  "Visual Studio Code 1.118": {
    ja: "agent 体験が幅広く前進した release。CLI の遠隔操作・co-author 自動追記・セッションタイトル一元化など、日常の agent 運用の実用性に直接効く変更が揃っています。",
    en: "This release advances agent workflows broadly with remote CLI control, automatic co-authoring, and consistent session titles, all of which reduce daily friction rather than adding isolated features.",
  },
  "Visual Studio Code 1.118: Visual Studio Code Agents (Insiders)": {
    ja: "agent ネイティブな並列作業環境が Insiders でさらに磨かれており、タイトルバーからの直接起動で試し始めやすくなった今が、将来の stable 体験を先行確認するタイミングです。",
    en: "This is worth validating now because the Agents companion app is becoming more discoverable and polished in Insiders, showing the direction of agent-native VS Code before these workflows reach Stable.",
  },
  "Visual Studio Code 1.118: Remote control for Copilot CLI sessions (Experimental)":
    {
      ja: "長時間の CLI タスクで承認待ちが発生しても、デスクを離れたまま GitHub.com やモバイルから再開できるため、agent を任せながら離席できる運用に近づきます。実験的機能なので early feedback を出す機会として見ておくとよいでしょう。",
      en: "This matters because CLI sessions that stall on approvals can now be resumed remotely, making it practical to let agents run longer tasks without staying at your machine. Worth trying early to shape this experimental feature.",
    },
  "Visual Studio Code 1.118: Synced session titles for Copilot CLI": {
    ja: "複数サーフェスを横断してセッションを管理する際のリネーム漏れや識別ずれが解消されるため、CLI と VS Code UI を行き来する運用でのセッション管理が整理されます。",
    en: "This removes the session-naming inconsistency that occurred when renaming across surfaces, making it easier to manage sessions that span CLI and VS Code UI workflows.",
  },
  "Visual Studio Code 1.118: Copilot added as a Git co-author by default": {
    ja: "AI 支援によるコード変更が commit 履歴に明示されるため、運用ポリシーや監査要件への影響を確認しておく価値があります。デフォルト有効なので、不要な組織や個人は git.addAICoAuthor 設定を確認してください。",
    en: "This matters because AI-assisted changes are now recorded in commit history by default, which may affect auditing or attribution policies. Organizations or individuals who do not want co-author attribution should review git.addAICoAuthor.",
  },
  "GitHub Copilot in Visual Studio — April update": {
    ja: "Visual Studio で Copilot を使う開発者は、IDE から cloud agent セッションを直接起動できるようになった点と、新しい Debugger agent による動作検証機能の追加を確認しておきたい。",
    en: "This matters because Visual Studio developers can now launch cloud agent sessions directly from the IDE and validate agent behavior with the new Debugger agent, reducing the need to switch contexts.",
  },
  "GitHub Copilot CLI for Beginners: Interactive v. non-interactive mode": {
    ja: "interactive / non-interactive の使い分けを理解しておくと、CI や自動化スクリプト内で CLI をより的確に組み込めるようになる。",
    en: "Understanding the interactive and non-interactive mode distinction makes it easier to integrate Copilot CLI correctly into CI pipelines and automation scripts.",
  },
  "Secret scanning with GitHub MCP Server is now generally available": {
    ja: "AI coding agent を使った開発フローでシークレット漏洩をコミット前に検出できるようになります。Copilot CLI や VS Code で MCP Server を利用している環境では、既存の push protection 設定が引き継がれる点も含め、有効化状況と運用ポリシーを確認しておくとよいでしょう。",
    en: "This matters because secret scanning is now part of the AI coding agent workflow, letting teams catch exposed credentials before they are committed. Organizations already using push protection will see their existing customizations carry over automatically.",
  },
  "Enterprise-managed plugins in GitHub Copilot CLI are now in public preview":
    {
      ja: "Copilot CLI の plugin 構成を Enterprise 管理者が標準化できるため、利用者ごとの設定差を減らしつつ、組織ポリシーに沿った CLI 運用へそろえやすくなります。",
      en: "This is operationally important because enterprise admins can standardize Copilot CLI plugin setups and reduce per-user configuration drift.",
    },
  "GitHub Copilot in Visual Studio Code, April releases": {
    ja: "weekly stable で積み上がった Copilot 変更をまとめて確認できるため、導入判断や運用ルールの更新を月次単位で見直しやすくなります。",
    en: "This matters because teams can evaluate accumulated weekly Copilot changes in one pass and update rollout policies on a monthly cadence.",
  },
  "Validating agentic behavior when “correct” isn’t deterministic": {
    ja: "正解が一意でない agent タスクの評価方法を具体化しており、検証基準や運用品質指標を整備する際の実務的な参考になります。",
    en: "This offers practical guidance for defining quality signals when agent tasks do not have a single deterministic correct answer.",
  },
  "Visual Studio Code 1.119: OpenTelemetry tracing for agent sessions": {
    ja: "agent session の動きを observability 基盤へ流せるため、遅延や失敗の切り分けを運用側で定量的に進めやすくなります。",
    en: "This matters because teams can instrument agent-session behavior in observability pipelines and diagnose latency or failures with better evidence.",
  },
  "Visual Studio Code 1.119: Show model details for Copilot CLI and Claude agent responses":
    {
      ja: "応答ごとのモデル情報が可視化されるため、出力差分の検証やモデル選定ルールの説明責任を取りやすくなります。",
      en: "This is important because model metadata on each response improves traceability for behavior comparisons and model-governance decisions.",
    },
  "Visual Studio Code 1.119: Sharing browser tabs with agents": {
    ja: "参照中の Web ページを agent へ直接渡せるため、調査コンテキストの受け渡しミスを減らし、調査〜実装の往復を短縮しやすくなります。",
    en: "This matters because directly sharing browser-tab context with agents reduces handoff errors and shortens the loop between research and implementation.",
  },
  "Upcoming deprecation of Grok Code Fast 1": {
    ja: "5月15日の廃止まで時間がないため、Grok Code Fast 1 を直接指定しているワークフローや統合は早急に代替モデルへの切り替えが必要です。Enterprise 管理者はモデルポリシーで代替モデルを有効化し、ユーザーが移行できる環境を整えておく必要があります。",
    en: "This requires immediate attention because the deprecation date is May 15, 2026. Any workflow or integration explicitly targeting Grok Code Fast 1 must migrate to GPT-5 mini or Claude Haiku 4.5 before that date. Enterprise admins should verify replacement models are enabled in their model policies.",
  },
  "Copilot code review comment types now in usage metrics API": {
    ja: "コードレビュー提案を種別ごとに把握できるようになるため、Copilot コードレビューがどのカテゴリで最も機能しているかを定量的に評価し、運用ルールや展開判断の根拠にしやすくなります。",
    en: "This matters because teams can now measure not just how much Copilot code review is used, but which categories of feedback it provides most often and which suggestions developers actually adopt, enabling more evidence-based code review policy decisions.",
  },
  "More flexible secrets and variables for Copilot cloud agent": {
    ja: "organization レベルでシークレットと変数を一元管理できるようになるため、複数リポジトリに Copilot cloud agent を展開する際の設定コストが大きく下がります。MCP サーバー設定や内部トークンを全リポジトリに一括配布しやすくなる更新です。",
    en: "This matters because shared configuration such as internal package registry tokens or MCP server settings can now be managed once at the organization level instead of duplicated across every repository, significantly reducing the overhead of deploying Copilot cloud agent at scale.",
  },
  "Rubber Duck in GitHub Copilot CLI now supports more models": {
    ja: "GPT セッションでも Claude セッションでも Rubber Duck が使えるようになるため、使用するモデルファミリーに関わらず cross-family のセカンドオピニオンを試せるようになります。Copilot CLI を日常利用しているチームは `/experimental on` を試す価値があります。",
    en: "This expands Rubber Duck coverage to all session types, so teams using GPT or Claude orchestrators can both benefit from cross-family second-opinion review without switching models first. Worth enabling /experimental on if you use Copilot CLI regularly.",
  },
  "Agent pull requests are everywhere. Here's how to review them.": {
    ja: "agent PR のレビューが業務の一部になりつつある中、コードが表面上きれいでも技術的負債が潜みやすいという特性と、人間が補うべき判断の種類を整理しており、チームのレビュー基準や訓練の参考になります。",
    en: "As agent-authored PRs become routine, this is a useful reference for defining what reviewers should specifically look for and where human judgment remains irreplaceable, which can inform team review guidelines and training.",
  },
  "Upcoming deprecation of GPT-4.1": {
    ja: "6月1日までに GPT-4.1 を直接指定しているワークフローや統合は代替モデルへの切り替えが必要です。Enterprise 管理者はモデルポリシーで GPT-5.5 を有効化し、ユーザーが移行できる環境を整えておく必要があります。",
    en: "Any workflow or integration explicitly targeting GPT-4.1 must be updated before June 1, 2026. Enterprise admins should verify that GPT-5.5 is enabled in their model policies so users can migrate without disruption.",
  },
  "Improving token efficiency in GitHub Agentic Workflows": {
    ja: "CI で自動実行される agentic workflow のコストが見えにくくなりやすい問題を、計測方法と最適化戦略で整理しており、agentic workflow を本番運用しているチームがコスト管理を進める参考になります。",
    en: "This matters because it shows how to instrument and optimize token costs for production agentic workflows running automatically in CI, giving teams a practical model for reducing API spend without sacrificing workflow quality.",
  },
  "Claude Sonnet 4 deprecated": {
    ja: "既に廃止済みのため、Claude Sonnet 4 を直接指定しているワークフローや統合は Claude Sonnet 4.6 への切り替えが必要です。Enterprise 管理者はモデルポリシーで代替モデルへのアクセスを確認してください。",
    en: "This is already in effect, so any workflow or integration explicitly targeting Claude Sonnet 4 must be updated to Claude Sonnet 4.6. Enterprise admins should confirm the replacement model is enabled in their model policies.",
  },
  "Copilot code review: Comment experience improvements": {
    ja: "重大度ラベルとグループ化で Copilot コメントの優先付けがしやすくなり、大規模 PR でのレビュー効率が向上します。新しい PR エクスペリエンスへの opt-in が前提なので、設定を確認しておくとよいでしょう。",
    en: "This matters because severity labels and grouped suggestions let reviewers prioritize Copilot feedback more efficiently, especially on large pull requests. Requires opting into the new pull requests experience.",
  },
  "April reports are now available to prepare for usage-based billing": {
    ja: "6月1日の従量課金移行前にコスト規模を把握できる唯一の公式データです。管理者はレポートを使って予算計画を立て、トップ消費者とモデル別利用傾向を事前に確認しておくことが推奨されます。",
    en: "This is the most direct tool available before the June 1 billing transition to estimate actual costs and identify heavy users. Download the report now to plan budgets and understand your AI credit consumption patterns in advance.",
  },
  "Start Copilot cloud agent tasks via the REST API": {
    ja: "REST API 経由で cloud agent の起動を自動化できるため、CI/CD や社内ツールから直接タスクを渡す運用がしやすくなります。public preview での早期評価を進めておくと、本格採用への準備が整えやすくなります。",
    en: "This matters because it enables programmatic cloud-agent task creation from CI/CD pipelines and internal tooling, which is a prerequisite for scaling agent-driven automation beyond manual issue-based workflows.",
  },
  "Visual Studio Code 1.120: Orchestrate tasks across projects with the Agents window (Preview)":
    {
      ja: "Stable でプレビュー提供が始まったため Insiders なしで Agents ウィンドウを試せるようになった。複数プロジェクトを並行して進めるチームは早期評価を始めるタイミングです。",
      en: "The Agents window is now available without Insiders, so teams managing work across multiple projects can begin evaluating it in Stable before it reaches general availability.",
    },
  "Visual Studio Code 1.120: Discover Copilot CLI plugins automatically": {
    ja: "CLI と VS Code で agent plugin を別々に管理する手間がなくなるため、両サーフェスで plugin を活用しているチームの設定コストを直接下げられます。",
    en: "This eliminates duplicate plugin setup for teams using agent plugins across both Copilot CLI and VS Code, reducing configuration overhead without changing the plugin itself.",
  },
  "Visual Studio Code 1.120: View BYOK model token usage": {
    ja: "BYOK モデルの token 消費を chat 中にリアルタイムで確認できるため、コンテキスト超過やコスト増加に気づく前に対処しやすくなります。BYOK を本番利用しているチームには直接効く更新です。",
    en: "This matters for teams using BYOK models in production because token usage is now visible in chat, letting you catch context-window saturation or unexpected cost growth early enough to act.",
  },
  "Visual Studio Code 1.120: Configure thinking effort for BYOK reasoning models":
    {
      ja: "BYOK reasoning モデルの思考量をタスクに応じて調整できるため、高品質が必要な場面とコスト・応答速度を優先する場面を同一モデルで使い分けやすくなります。",
      en: "This matters because it lets teams tune thinking effort per session for BYOK reasoning models, making it practical to balance response quality against speed and cost without switching models.",
    },
  "One-click fixes for failing Actions with Copilot cloud agent": {
    ja: "Actions の失敗から修正 PR の作成まで、ターミナルや issue 画面に切り替えずワンクリックで cloud agent に任せられるようになります。CI 修正の対応速度を上げたいチームに直接効く更新です。",
    en: "This directly speeds up CI remediation by letting Copilot cloud agent handle the full path from failure detection to fix pull request in one click, without leaving the Actions UI.",
  },
  "Copilot cloud agent: Fast, cost-efficient models for simple tasks": {
    ja: "シンプルなタスクに低コストモデルを選ぶことで、cloud agent の利用コストをタスクの複雑度に合わせて最適化できます。費用対効果を高めながら agent 活用の幅を広げやすくなります。",
    en: "This makes it practical to optimize cloud agent costs by matching model capability to task complexity, expanding agent use cases without defaulting to expensive models.",
  },
  "Ask questions in context with Copilot on web": {
    ja: "PR レビューや issue 調査の際に、現在のページがコンテキストとして自動読み込みされるため、切り替え作業なく即座に Copilot に質問できます。github.com 上の作業フローへの組み込みがしやすくなります。",
    en: "This reduces friction in PR review and issue investigation workflows on github.com by automatically loading the current page as Copilot context, so questions land without extra setup.",
  },
  "Audit repository Copilot cloud agent configuration via the REST API": {
    ja: "多数のリポジトリで CCA 設定の一貫性を確認したい場合や、設定変更を CI/CD で管理したい場合に API を使えるようになります。public preview なので早期に試して自チームの監査フローに合うか確認しやすいタイミングです。",
    en: "This is directly useful for teams managing Copilot cloud agent across many repositories, as configuration audits can now be automated via the API. Early testing during public preview helps determine whether this fits compliance and governance workflows.",
  },
  "Remote control for Copilot CLI sessions now generally available on mobile, web, and VS Code":
    {
      ja: "GA になったことで本番運用の選択肢として評価しやすくなりました。長時間の CLI タスクで承認待ちが生じても、離席したままモバイルや web から再開できるため、agent を使い続けやすくなります。",
      en: "GA status makes this a viable production option. Long CLI tasks that previously stalled waiting for approval can now be resumed remotely, removing a key barrier to sustained agent-driven terminal workflows.",
    },
  "Copilot Spaces API now generally available": {
    ja: "GA により Copilot Spaces の知識共有・コンテキスト提供を API で自動化できる段階に入りました。チームの情報管理やオンボーディングを Spaces ベースで設計したい場合は本格導入を検討できます。",
    en: "GA makes it practical to automate Spaces-based knowledge sharing and context provisioning with the API. Teams building information management or onboarding workflows around Spaces can now plan a production integration.",
  },
  "Introducing Copilot CLI agent and unified sessions view in GitHub Copilot for JetBrains IDEs":
    {
      ja: "JetBrains でも Copilot CLI agent と統合セッション管理が使えるようになり、IDE 間で agent 運用をそろえやすくなります。VS Code 中心の agent 運用と JetBrains ユーザーの環境を統一する足がかりになります。",
      en: "This brings Copilot CLI agent workflows and unified session management into JetBrains IDEs, improving cross-IDE operational consistency and reducing the gap between VS Code and JetBrains agent experiences.",
    },
  "Grok Code Fast 1 deprecated": {
    ja: "既に廃止済みのため、Grok Code Fast 1 を直接指定しているワークフローや統合は GPT-5 mini または Claude Haiku 4.5 への切り替えが必要です。Enterprise 管理者はモデルポリシーで代替モデルへのアクセスを確認してください。",
    en: "This is already in effect, so any workflow or integration explicitly targeting Grok Code Fast 1 must migrate to GPT-5 mini or Claude Haiku 4.5. Enterprise admins should confirm replacement models are enabled in their Copilot model policies.",
  },
  "Take your local GitHub sessions anywhere": {
    ja: "Copilot CLI セッションのリモート操作 GA に合わせた解説記事として、ターミナルで始めた作業をモバイルや web から継続する運用シナリオを把握できます。GA になったことで本番運用の検討材料として活用しやすくなります。",
    en: "This blog post accompanies the remote control GA and helps teams understand practical scenarios for continuing terminal-started work from mobile or web, which is now a production-ready capability.",
  },
  "Copilot usage metrics reports now use GitHub-owned download URLs": {
    ja: "usage metrics レポートをダウンロードする automation やスクリプトを持つ場合は、移行完了により旧 URL が動作しなくなっている可能性があるため、早急に新 URL への切り替えが必要です。",
    en: "This requires immediate attention for any team with automation or scripts that download Copilot usage metrics reports, as the old Azure Front Door URLs will no longer work now that the migration is complete.",
  },
  "Updates to available models in Copilot on web": {
    ja: "Web 上の Copilot Chat で特定モデルを手動指定して利用していた場合、選択肢の変更により以前と同じモデルが選べなくなる可能性があります。利用中のモデル設定を確認し、必要に応じて代替モデルへ移行してください。",
    en: "This matters for teams that rely on specific model selection in Copilot Chat on the web, because the narrowed model list may no longer include previously available choices. Review your model usage and update any documentation or guidance that references specific web models.",
  },
  "GitHub Copilot for Eclipse is open source": {
    ja: "オープンソース化で実装や変更履歴を直接確認できるため、Eclipse を使うチームが導入前検証や拡張可否の判断を進めやすくなります。",
    en: "Open sourcing enables direct inspection of implementation and change history, making it easier for Eclipse teams to validate adoption and extension feasibility.",
  },
  "Gemini 3.5 Flash is generally available for GitHub Copilot": {
    ja: "GA により本番運用の選択肢になった。Pro 品質に近い性能を Flash コストで使えるため、コストと品質のバランスを求めるチームはモデル選択の見直し材料になります。",
    en: "GA makes Gemini 3.5 Flash a viable production option, offering near-Pro coding performance at Flash-tier cost for teams seeking a better cost-quality balance.",
  },
  "Easily apply Copilot code review feedback with Copilot cloud agent": {
    ja: "code review のフィードバック適用フローが改善されたため、Copilot code review を日常的に使っているチームはフィードバック消化の効率を上げやすくなります。",
    en: "This improves the code review feedback loop directly for teams processing Copilot review suggestions daily, by adding finer control over how suggestions are applied.",
  },
  "Auto model selection now routes based on your task in VS Code": {
    ja: "モデルを明示的に選ばなくてもタスク内容に最適なモデルが使われるようになるため、Copilot を幅広い作業に使うチームは応答品質の底上げが期待できます。",
    en: "This benefits teams using Copilot across diverse task types because model routing now accounts for task type rather than just system load, improving output quality without extra model management.",
  },
  "Semantic issue search in Copilot Chat": {
    ja: "issue の調査や整理に自然言語検索が使えるようになるため、大量の issue を抱えるリポジトリで関連 issue の発見やトリアージがしやすくなります。",
    en: "This speeds up issue triage and investigation by surfacing related issues through natural language queries, which is especially useful in repositories where exact keyword search often misses context.",
  },
  "Visual Studio Code 1.121": {
    ja: "agent セッションのリモート実行と observability の強化が入り、分散型・長時間 agent ワークフローの運用基盤が整ってきた release です。Claude agent の Auto 権限モードも Business / Enterprise チームの評価候補になります。",
    en: "This matters because remote agent execution and observability tooling advance the foundation for distributed and long-running agent workflows, while the Claude agent Auto permission mode is worth evaluating for Business and Enterprise teams.",
  },
  "Visual Studio Code 1.121: Agents observability with OpenTelemetry and Grafana":
    {
      ja: "agent 実行の observability を既存の monitoring インフラへ統合しやすくなるため、長時間タスクや分散型 agent の監視体制を整えたいチームに直接効く更新です。",
      en: "This is directly useful for teams building observability for long-running or distributed agent workflows, as the prebuilt Grafana dashboard reduces the time needed to instrument agent session tracing.",
    },
};

function toDateOnly(value) {
  const date = safeDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&#8217;|&#39;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&#8230;/g, "...")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function trimText(value, maxLength = 220) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function containsJapanese(text) {
  return /[ぁ-んァ-ヶ一-龠々]/.test(String(text ?? ""));
}

function englishTitleFallback(event) {
  const title = normalizeWhitespace(decodeHtmlEntities(event.title));
  const text = `${title} ${cleanupSummary(event.summary)}`;

  if (/Azure Skills Plugin/i.test(text)) {
    return "Microsoft's Azure Skills Plugin for Claude Code and GitHub Copilot";
  }

  if (
    /rubber duck/i.test(text) ||
    (/copilot cli/i.test(text) && /セカンドオピニオン/.test(text))
  ) {
    return "GitHub Copilot CLI uses a second-opinion model in Rubber Duck mode";
  }

  if (/copilot cli/i.test(text)) {
    return "Japanese-language coverage of a GitHub Copilot CLI update";
  }

  if (/github copilot/i.test(text)) {
    return "Japanese-language coverage of a GitHub Copilot update";
  }

  if (/visual studio code|vs code/i.test(text)) {
    return "Japanese-language coverage of a Visual Studio Code update";
  }

  return "Japanese-language coverage of a tracked update";
}

function cleanupSummary(summary) {
  return normalizeWhitespace(
    decodeHtmlEntities(String(summary ?? ""))
      .replace(/The post .*? appeared first on The GitHub Blog\.?/gi, "")
      .replace(/Read the full article/gi, "")
      .replace(/Learn what's new in /gi, "")
      .replace(/Learn what is new in /gi, "")
      .replace(/What\'s new in /gi, "")
      .replace(/\s+/g, " "),
  );
}

function summaryLead(summary, maxLength = 220) {
  const cleaned = cleanupSummary(summary);
  if (!cleaned) {
    return "";
  }

  const sentenceMatch = cleaned.match(/^(.+?[。.!?])(\s|$)/);
  const lead = sentenceMatch ? sentenceMatch[1] : cleaned;
  return trimText(lead, maxLength);
}

function joinedHeadings(event, limit = 3) {
  return normalizeArray([
    ...(event.diffSummary?.headings ?? []),
    ...(event.headings ?? []),
  ])
    .filter(Boolean)
    .slice(0, limit);
}

function releaseVersionFromTitle(title) {
  const directMatch = title.match(/^Visual Studio Code ([0-9.]+)$/i);
  if (directMatch) {
    return directMatch[1];
  }

  const monthMatch = title.match(/version ([0-9.]+)/i);
  return monthMatch?.[1] ?? null;
}

function versionIndexAdditionFromEvent(event) {
  return normalizeArray(event.diffSummary?.additions ?? [])
    .map((value) => normalizeWhitespace(value))
    .find((value) => /^[0-9]+\.[0-9]+$/.test(value));
}

function trimmedEnglishSummary(summary) {
  return trimText(cleanupSummary(summary), 320);
}

function replaceMonth(text) {
  let nextText = text;
  for (const [english, japanese] of Object.entries(monthMap)) {
    nextText = nextText.replace(new RegExp(english, "g"), japanese);
  }

  return nextText;
}

function patternTitle(title) {
  const normalized = normalizeWhitespace(title);

  const releaseMatch = normalized.match(/^Visual Studio Code ([0-9.]+)$/i);
  if (releaseMatch) {
    return `Visual Studio Code ${releaseMatch[1]} リリース`;
  }

  const monthlyMatch = normalized.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4}) \(version ([0-9.]+)\)$/i,
  );
  if (monthlyMatch) {
    return `Visual Studio Code ${monthlyMatch[2]}年${monthMap[monthlyMatch[1]]}版 (${monthlyMatch[3]})`;
  }

  const exactMappings = new Map([
    [
      "GitHub Copilot for Eclipse is open source",
      "GitHub Copilot for Eclipse がオープンソース化された",
    ],
    ["Copilot SDK in public preview", "Copilot SDK が public preview になった"],
    [
      "Copilot usage metrics now includes per-user GitHub Copilot CLI activity in organization reports",
      "organization report でユーザー別 Copilot CLI 利用状況を確認できるようになった",
    ],
    [
      "Copilot cloud agent signs its commits",
      "Copilot cloud agent が commit 署名に対応した",
    ],
    [
      "Organization runner controls for Copilot cloud agent",
      "Copilot cloud agent の organization runner 制御",
    ],
    [
      "Organization firewall settings for Copilot cloud agent",
      "Copilot cloud agent の organization firewall 設定",
    ],
    [
      "Copilot organization custom instructions are generally available",
      "organization custom instructions が一般提供になった",
    ],
    [
      "Research, plan, and code with Copilot cloud agent",
      "Copilot cloud agent で調査・計画・実装がしやすくなった",
    ],
    [
      "GitHub Actions: Early April 2026 updates",
      "GitHub Actions 2026年4月前半の更新",
    ],
    [
      "GitHub Copilot in Visual Studio — March update",
      "GitHub Copilot in Visual Studio 2026年3月更新",
    ],
    [
      "GitHub Copilot in Visual Studio Code, April releases",
      "GitHub Copilot in Visual Studio Code 4月リリースまとめ",
    ],
    [
      "Enterprise-managed plugins in GitHub Copilot CLI are now in public preview",
      "GitHub Copilot CLI の enterprise 管理プラグインが public preview になった",
    ],
    ["How VS Code Builds with AI", "VS Code チームの AI 活用事例"],
    [
      "Making agents practical for real-world development",
      "VS Code の agent 活用を現実運用に寄せる改善",
    ],
    [
      "Your Home for Multi-Agent Development",
      "VS Code のマルチエージェント体験の整理",
    ],
    [
      "Building Long-Distance Next Edit Suggestions",
      "長距離 Next Edit Suggestions の改善",
    ],
    [
      "Giving Agents a Visual Voice: MCP Apps Support in VS Code",
      "VS Code の MCP Apps 対応",
    ],
    [
      "Building docfind: Fast Client-Side Search with Rust and WebAssembly",
      "Rust と WebAssembly で作る docfind の解説",
    ],
    [
      "Introducing the VS Code Insiders Podcast",
      "VS Code Insiders Podcast の紹介",
    ],
    [
      "Run multiple agents at once with /fleet in Copilot CLI",
      "Copilot CLI の /fleet で複数 agent を並列実行できる",
    ],
    [
      "Agent-driven development in Copilot Applied Science",
      "Copilot Applied Science チームの agent 駆動開発",
    ],
    [
      "Building AI-powered GitHub issue triage with the Copilot SDK",
      "Copilot SDK で GitHub issue トリアージを自動化する実例",
    ],
    [
      "How Squad runs coordinated AI agents inside your repository",
      "Squad によるリポジトリ内マルチ agent 運用",
    ],
    [
      "The era of “AI as text” is over. Execution is the new interface.",
      "AI をテキストで使う時代から実行を組み込む時代へ",
    ],
    [
      "Continuous AI for accessibility: How GitHub transforms feedback into inclusion",
      "GitHub のアクセシビリティ改善を支える継続的 AI 活用",
    ],
    [
      "Join or host a GitHub Copilot Dev Days event near you",
      "GitHub Copilot Dev Days の参加・開催案内",
    ],
    [
      "From idea to pull request: A practical guide to building with GitHub Copilot CLI",
      "GitHub Copilot CLI でアイデアから pull request まで進める実践ガイド",
    ],
    [
      "What's new with GitHub Copilot coding agent",
      "GitHub Copilot coding agent の新機能まとめ",
    ],
    [
      "Dungeons & Desktops: Building a procedurally generated roguelike with GitHub Copilot CLI",
      "GitHub Copilot CLI で手続き生成ローグライク拡張を作る実践例",
    ],
    [
      "Fix merge conflicts in three clicks with Copilot cloud agent",
      "Copilot cloud agent でマージ競合を 3 クリックで解消できるようになった",
    ],
    [
      "Visual Studio Code 1.115: Bring your own key for Copilot Business and Enterprise",
      "Copilot Business / Enterprise で BYOK が利用可能になった",
    ],
    [
      "Model selection for Claude and Codex agents on github.com",
      "github.com 上の Claude / Codex agent でモデル選択が可能になった",
    ],
    [
      "Copilot data residency in US + EU and FedRAMP compliance now available",
      "Copilot の US / EU データレジデンシーと FedRAMP 対応が利用可能になった",
    ],
    [
      "Remote control CLI sessions on web and mobile in public preview",
      "Web とモバイルから Copilot CLI セッションを遠隔操作できる機能が public preview になった",
    ],
    [
      "Enforcing new limits and retiring Opus 4.6 Fast from Copilot Pro+",
      "Copilot Pro+ に新しい利用制限を導入し、Opus 4.6 Fast を廃止",
    ],
    [
      "Copilot usage metrics now identify active and passive Copilot code review users",
      "usage metrics で Copilot code review のアクティブ・パッシブ利用者を識別できるようになった",
    ],
    [
      "Copilot CLI now supports BYOK and local models",
      "Copilot CLI で BYOK とローカルモデルが利用可能になった",
    ],
    [
      "Dependabot alerts are now assignable to AI agents for remediation",
      "Dependabot アラートを AI エージェントに割り当てて修正できるようになった",
    ],
    [
      "Ask Copilot in security assessments now available",
      "セキュリティ評価で Ask Copilot を直接開けるようになった",
    ],
    [
      "Enable Copilot cloud agent via custom properties",
      "カスタムプロパティで Copilot cloud agent を組織単位で有効化できるようになった",
    ],
    [
      "Build a personal organization command center with GitHub Copilot CLI",
      "Copilot CLI で個人用組織コマンドセンターを構築した事例",
    ],
    [
      "GitHub Copilot CLI now supports Copilot auto model selection",
      "Copilot CLI の auto モデル選択が全プランで GA になった",
    ],
    [
      "Manage agent skills with GitHub CLI",
      "GitHub CLI で agent skill を管理できるようになった",
    ],
    [
      "Building an emoji list generator with the GitHub Copilot CLI",
      "Copilot CLI で絵文字リストジェネレーターを作る事例",
    ],
    [
      "Changes to GitHub Copilot plans for individuals",
      "個人向け GitHub Copilot プランの変更",
    ],
    [
      "Bring your own language model key in VS Code now available",
      "VS Code で BYOK（言語モデルキー持ち込み）が利用可能になった",
    ],
    [
      "C++ code intelligence for GitHub Copilot CLI in public preview",
      "GitHub Copilot CLI の C++ コードインテリジェンスが public preview になった",
    ],
    [
      "GitHub Copilot for Jira: Our latest enhancements",
      "Copilot for Jira の最新機能強化",
    ],
    [
      "Copilot code review user counts now aggregate in usage metrics API",
      "usage metrics API で Copilot コードレビューのユーザー数を集計できるようになった",
    ],
    [
      "Pausing new self-serve signups for GitHub Copilot Business",
      "GitHub Copilot Business の新規セルフサービスサインアップを一時停止",
    ],
    [
      "Copilot cloud agent fields added to usage metrics",
      "usage metrics API に Copilot cloud agent フィールドが追加された",
    ],
    [
      "View and manage agent sessions from issues and projects",
      "issue や project から cloud agent セッションを確認・操作できるようになった",
    ],
    [
      "Copilot Chat improvements for pull requests",
      "プルリクエストに関する Copilot Chat の機能強化",
    ],
    [
      "Better debugging with GitHub Copilot on the web",
      "web 上の GitHub Copilot でデバッグがしやすくなった",
    ],
    [
      "Upcoming change to Copilot usage metrics report download URLs",
      "Copilot usage metrics レポートのダウンロード URL が変更される予定",
    ],
    [
      "Secret scanning with GitHub MCP Server is now generally available",
      "GitHub MCP Server の secret scanning が一般提供になった",
    ],
    [
      "Upcoming deprecation of Grok Code Fast 1",
      "Grok Code Fast 1 の廃止予告（2026年5月15日）",
    ],
    [
      "Copilot code review comment types now in usage metrics API",
      "Copilot コードレビューのコメント種別が usage metrics API で確認できるようになった",
    ],
    [
      "More flexible secrets and variables for Copilot cloud agent",
      "Copilot cloud agent のシークレットと変数が組織・リポジトリ単位で柔軟に設定できるようになった",
    ],
    [
      "Rubber Duck in GitHub Copilot CLI now supports more models",
      "Copilot CLI の Rubber Duck がより多くのモデルに対応した",
    ],
    [
      "Agent pull requests are everywhere. Here's how to review them.",
      "agent 生成 PR のレビュー実践ガイド",
    ],
    ["Upcoming deprecation of GPT-4.1", "GPT-4.1 の廃止予告（2026年6月1日）"],
    [
      "Improving token efficiency in GitHub Agentic Workflows",
      "GitHub Agentic Workflows のトークン効率改善の取り組み",
    ],
    ["Claude Sonnet 4 deprecated", "Claude Sonnet 4 が廃止された"],
    [
      "Copilot code review: Comment experience improvements",
      "Copilot code review のコメント体験が改善された",
    ],
    [
      "April reports are now available to prepare for usage-based billing",
      "4月分レポートが公開 — 従量課金移行の準備に",
    ],
    [
      "Start Copilot cloud agent tasks via the REST API",
      "Copilot cloud agent のタスクを REST API から開始できるようになった",
    ],
  ]);

  if (exactMappings.has(normalized)) {
    return exactMappings.get(normalized);
  }

  if (
    /ask copilot/i.test(normalized) &&
    /security assessments?|risk assessment/i.test(normalized)
  ) {
    return "セキュリティ評価で Ask Copilot を直接開けるようになった";
  }

  if (/pausing new github copilot pro trials/i.test(normalized)) {
    return "GitHub Copilot Pro の新規 trial を一時停止";
  }

  if (
    /copilot usage metrics now aggregate copilot cloud agent active user counts/i.test(
      normalized,
    )
  ) {
    return "usage metrics で Copilot cloud agent のアクティブ利用者数を集計できるようになった";
  }

  if (
    /copilot cli activity now included in usage metrics totals and feature breakdowns/i.test(
      normalized,
    )
  ) {
    return "usage metrics の合計値と機能別内訳に Copilot CLI 活動が含まれるようになった";
  }

  if (/github copilot cli for beginners/i.test(normalized)) {
    return "GitHub Copilot CLI 入門";
  }

  if (
    /copilot cloud agent.?s validation tools are now 20% faster/i.test(
      normalized,
    )
  ) {
    return "Copilot cloud agent の validation tools が 20% 高速化";
  }

  if (/deprecated/i.test(normalized)) {
    return replaceMonth(
      normalized
        .replace(/ are now /i, " が ")
        .replace(/ deprecated/i, " が廃止予定になった")
        .replace(/^(.+?) deprecated$/i, "$1 が廃止予定になった"),
    );
  }

  if (/generally available/i.test(normalized)) {
    return replaceMonth(
      normalized
        .replace(/ are generally available/i, " が一般提供になった")
        .replace(/ is generally available/i, " が一般提供になった"),
    );
  }

  if (/in public preview/i.test(normalized)) {
    return replaceMonth(
      normalized.replace(/ in public preview/i, " が public preview になった"),
    );
  }

  if (/now available/i.test(normalized)) {
    return replaceMonth(
      normalized
        .replace(/ is now available/i, " が利用可能になった")
        .replace(/ are now available/i, " が利用可能になった"),
    );
  }

  return replaceMonth(normalized);
}

function summaryFromPatterns(event, locale = "ja") {
  const title = normalizeWhitespace(decodeHtmlEntities(event.title));
  const text = `${title} ${event.summary}`.toLowerCase();
  const version = releaseVersionFromTitle(title);
  const addedVersion = versionIndexAdditionFromEvent(event);
  const cleanedSummary = cleanupSummary(event.summary);
  const summaryLeadText = summaryLead(
    event.summary,
    locale === "ja" ? 220 : 260,
  );
  const summaryLeadJa =
    summaryLeadText && containsJapanese(summaryLeadText) ? summaryLeadText : "";

  if (version && vscodeReleaseSummaries[version]) {
    return vscodeReleaseSummaries[version][locale];
  }

  if (title === "VS Code Updates changed" && addedVersion) {
    if (vscodeReleaseSummaries[addedVersion]?.[locale]) {
      return locale === "ja"
        ? `VS Code の版一覧ページに ${addedVersion} が追加され、release notes への導線が公開された。${vscodeReleaseSummaries[addedVersion][locale]}`
        : `The VS Code Updates landing page now lists ${addedVersion}, exposing the release notes entry point. ${vscodeReleaseSummaries[addedVersion][locale]}`;
    }

    return locale === "ja"
      ? `VS Code の版一覧ページに ${addedVersion} が追加され、release notes への導線が公開された。`
      : `The VS Code Updates landing page now lists ${addedVersion}, exposing the release notes entry point.`;
  }

  if (title === "VS Code Release Notes 1.109 changed" && addedVersion) {
    return locale === "ja"
      ? `VS Code Release Notes 1.109 ページのナビゲーションに ${addedVersion} が追加され、サイト共通の版一覧更新が過去ページにも反映された。${addedVersion} の公開導線が揃ったことを確認できるが、1.109 ページ自体の本文変更はない。`
      : `The version navigation on the VS Code Release Notes 1.109 page now includes ${addedVersion}, showing that the site-wide index update has propagated to archived pages. It confirms the ${addedVersion} release entry point is live, but the body of the 1.109 notes has not changed.`;
  }

  if (exactSummaryMappings[title]?.[locale]) {
    return exactSummaryMappings[title][locale];
  }

  if (
    /ask copilot/i.test(text) &&
    /security assessments?|risk assessment/i.test(text)
  ) {
    return locale === "ja"
      ? "組織管理者やセキュリティ管理者が、シークレット リスク評価や Code Security リスク評価の結果から Copilot を直接開き、状況に応じた説明や次の対応案を確認できるようになった。セキュリティ評価から対処判断までをその場で進めやすくする更新。"
      : "Organization admins and security managers can now open Copilot directly from secret risk assessment or Code Security risk assessment results to get contextual explanations and guided next steps.";
  }

  if (/pausing new github copilot pro trials/i.test(title)) {
    return locale === "ja"
      ? "GitHub Copilot Pro の新規 free trial を一時停止した。trial system の悪用増加に対応するためで、既存 trial は継続し、Copilot Free と有料 Copilot Pro も引き続き利用できる。保護策を整えた後に再開予定。"
      : "GitHub has temporarily paused new Copilot Pro free trials because of rising abuse, while existing trials, Copilot Free, and paid Copilot Pro subscriptions continue unchanged until stronger safeguards are in place.";
  }

  if (/aggregate copilot cloud agent active user counts/i.test(title)) {
    return locale === "ja"
      ? "Copilot usage metrics API の enterprise / organization レポートに、Copilot cloud agent の daily / weekly / monthly active user count が追加された。1日と28日レポートの両方で、cloud agent の利用人数を集約値として追える。"
      : "Enterprise and organization Copilot usage metrics reports now include aggregated daily, weekly, and monthly active-user counts for Copilot cloud agent across both 1-day and 28-day report windows.";
  }

  if (
    /copilot cli activity now included in usage metrics totals and feature breakdowns/i.test(
      title,
    )
  ) {
    return locale === "ja"
      ? "Copilot usage metrics API の top-level totals と feature 別 breakdown に Copilot CLI activity が統合された。これまで別集計だった CLI 利用が、single-day / 28-day の enterprise・organization・per-user レポートで他 surface と同列に見えるようになる。"
      : "Copilot CLI activity is now folded into the usage metrics API's top-level totals and feature breakdowns, so single-day and 28-day reports no longer require separate stitching to compare CLI usage with other Copilot surfaces.";
  }

  if (
    /github copilot cli for beginners: getting started with github copilot cli/i.test(
      title,
    )
  ) {
    return locale === "ja"
      ? "GitHub Copilot CLI の入門記事。npm などでのインストール、GitHub account での login、folder permission の付与、最初の prompt 実行、/delegate による cloud agent 連携までを step-by-step で案内している。"
      : "A step-by-step beginner guide to GitHub Copilot CLI that covers installation, login, folder permissions, first prompts, and delegating work to Copilot cloud agent from the terminal.";
  }

  if (
    /copilot cloud agent.?s validation tools are now 20% faster/i.test(title)
  ) {
    return locale === "ja"
      ? "Copilot cloud agent が自動実行する validation tools が直列から並列実行に変わり、CodeQL、Advisory Database、secret scanning、Copilot code review を維持したまま validation time が 20% 短縮された。"
      : "Copilot cloud agent now runs its validation tools in parallel instead of sequentially, cutting validation time by 20% while keeping CodeQL, advisory, secret-scanning, and Copilot code review checks in place.";
  }

  if (containsJapanese(title) || containsJapanese(event.summary)) {
    if (locale === "en") {
      if (/Azure Skills Plugin/i.test(title)) {
        return "Japanese coverage of Microsoft's Azure Skills Plugin, which lets Claude Code and GitHub Copilot choose infrastructure and deploy applications more autonomously.";
      }

      if (
        /rubber duck/i.test(text) ||
        (/copilot cli/i.test(text) && /セカンドオピニオン/.test(text))
      ) {
        return "Japanese-language coverage of GitHub Copilot CLI's experimental Rubber Duck mode, which lets you ask a different model for a second opinion during CLI-based workflows.";
      }

      if (/copilot cli/i.test(text)) {
        return "Japanese-language coverage of a GitHub Copilot CLI update. Check the original article for the source-specific details and examples.";
      }

      if (/github copilot/i.test(text)) {
        return "Japanese-language coverage of a GitHub Copilot update. Check the original article for the full context and source-specific details.";
      }

      if (/visual studio code|vs code/i.test(text)) {
        return "Japanese-language coverage of a Visual Studio Code update. Check the original article for the full context and source-specific details.";
      }

      return "Japanese-language coverage of a tracked update. Check the original article for the full context and source-specific details.";
    }

    return trimText(cleanupSummary(event.summary), 280);
  }

  if (event.kind === "html_snapshot_change") {
    const headings = joinedHeadings(event);
    if (locale === "ja") {
      return headings.length > 0
        ? `監視対象ページで差分を検知し、${headings.join("、")} などの見出しが追加または更新された。固定ページ側の公開導線や注目トピックの変化をまとめて追える。`
        : "監視対象ページで差分を検知した。固定ページ側の公開導線や注目トピックの変化をまとめて追える。";
    }

    return headings.length > 0
      ? `A monitored page changed and now highlights headings such as ${headings.join(", ")}, making it easier to spot shifts in the published entry points and featured topics.`
      : "A monitored page changed, signaling an update in the published entry points or featured topics for this source.";
  }

  if (event.kind === "vscode_release_note_section") {
    const sectionTitle = event.sectionTitle ?? title;
    if (locale === "ja") {
      return summaryLeadJa
        ? `${sectionTitle} に関する release note 更新。${summaryLeadJa}`
        : `${sectionTitle} に関する release note 更新。開発フローや agent 体験に関わる変更点を個別セクションとして拾っている。`;
    }

    return summaryLeadText
      ? `A release-note update for ${sectionTitle}. ${summaryLeadText}`
      : `A release-note update for ${sectionTitle}, captured as an individual section change rather than the full release.`;
  }

  if (/copilot sdk in public preview/i.test(title)) {
    return locale === "ja"
      ? "GitHub Copilot SDK が public preview になった。Node.js、Python、Go、.NET、Java で使え、custom tools、streaming、approval handler、BYOK まで含む agent 実行基盤を自前アプリへ埋め込める。"
      : "The GitHub Copilot SDK is now in public preview across Node.js, Python, Go, .NET, and Java, giving you agent runtime features such as custom tools, streaming, approval handlers, and BYOK in your own apps.";
  }

  if (/runner controls/i.test(title)) {
    return locale === "ja"
      ? "Copilot cloud agent が使う runner を organization 単位で既定化し、repo 側の上書き可否も制御できるようになった。large runner や self-hosted runner を全体方針として揃えやすい。"
      : "Organizations can now define default runners for Copilot cloud agent and decide whether repositories may override them, making it easier to standardize on large or self-hosted runners.";
  }

  if (/firewall settings/i.test(title)) {
    return locale === "ja"
      ? "Copilot cloud agent の firewall を organization 単位で管理できるようになった。recommended allowlist、独自 allowlist、repo 管理者の追加可否まで横断制御できる。"
      : "Organization admins can now manage the Copilot cloud agent firewall centrally, including recommended allowlists, custom allowlists, and whether repository admins may add their own rules.";
  }

  if (/signs its commits/i.test(title)) {
    return locale === "ja"
      ? "Copilot cloud agent が作る commit が Verified 付きになり、Require signed commits を有効にした repo でも agent を止めずに使いやすくなった。"
      : "Copilot cloud agent now signs all of its commits, so repositories that require signed commits can use the agent without being blocked by branch protection.";
  }

  if (/deprecated/i.test(title)) {
    return locale === "ja"
      ? "GPT-5.1 Codex 系モデルの廃止予定が告知された。GPT-5.3-Codex への移行と、Enterprise の model policy 見直しが必要になる。"
      : "The GPT-5.1 Codex model family is deprecated, so existing workflows should move to GPT-5.3-Codex and enterprise admins may need to update model policies.";
  }

  if (/gpt-5\.4 mini/i.test(title) && /student/i.test(title)) {
    return locale === "ja"
      ? "GPT-5.4 mini が Copilot Student の auto model selection で利用可能になった。Student プランの自動モデル選択の選択肢が広がった。"
      : "GPT-5.4 mini is now included in the auto model selection pool for Copilot Student, expanding the model options available under that plan.";
  }

  if (/usage metrics/i.test(title) && /organization reports/i.test(title)) {
    return locale === "ja"
      ? "organization report でユーザー別 Copilot CLI 利用状況を見られるようになった。1日 / 28日単位の activity、session 数、request 数、token 使用量、CLI version の把握に使える。"
      : "Organization reports now include per-user Copilot CLI activity, including 1-day and 28-day usage, session and request counts, token consumption, and the last seen CLI version per user.";
  }

  if (/custom instructions/i.test(title) && /available/i.test(title)) {
    return locale === "ja"
      ? "organization custom instructions が GA になった。Copilot の前提知識や振る舞いを組織全体で揃えやすくなる。"
      : "Organization custom instructions are now generally available, making it easier to define shared Copilot behavior across a whole organization.";
  }

  if (/research, plan, and code/i.test(title)) {
    return locale === "ja"
      ? "Copilot cloud agent が research、plan、code の流れを扱いやすくなった。branch 単位の作業や、実装前の段取り整理を前提にした使い方へ寄っている。"
      : "Copilot cloud agent now better supports a research-plan-code workflow, with improvements aimed at branch-based work and planning before implementation.";
  }

  if (/visual studio/i.test(title) && /march update/i.test(title)) {
    return locale === "ja"
      ? "Visual Studio 側では custom agents、agent skills、find_symbol、Profiler Agent 連携、Watch suggestion、NuGet 脆弱性修正提案まで入り、Copilot extensibility が一段広がった。"
      : "The Visual Studio March update expands Copilot extensibility with custom agents, agent skills, find_symbol, profiler-assisted diagnostics, smarter Watch suggestions, and vulnerability fixes for NuGet packages.";
  }

  if (/github actions/i.test(title) && /updates/i.test(title)) {
    return locale === "ja"
      ? "GitHub Actions の定期アップデート。runner、セキュリティ、運用面の変更点をまとめて押さえるための更新。"
      : "A regular GitHub Actions update covering runner, security, and operational changes worth tracking.";
  }

  if (
    /^visual studio code [0-9.]+$/i.test(title) ||
    /version [0-9.]+/i.test(title)
  ) {
    return locale === "ja"
      ? "Visual Studio Code のリリース。Copilot、agent、エディタ、ワークベンチ周辺の変更点をまとめて確認できる。"
      : "A Visual Studio Code release covering changes across Copilot, agents, the editor, and the workbench.";
  }

  if (/vs code/i.test(text) && /ai/i.test(text)) {
    return locale === "ja"
      ? "VS Code チームによる AI 活用や実装改善の解説記事。運用の考え方や設計の背景を押さえる材料になる。"
      : "A behind-the-scenes VS Code article about AI usage and implementation decisions.";
  }

  if (/fleet/i.test(text) && /copilot cli/i.test(text)) {
    return locale === "ja"
      ? "Copilot CLI の /fleet で複数の subagent を並列実行できるようになった。大きめの作業を並列分解して進める運用に効く。"
      : "Copilot CLI can now run multiple subagents in parallel through /fleet, which is useful for breaking larger tasks into coordinated workstreams.";
  }

  if (
    /byok/i.test(title) ||
    (/copilot cli/i.test(title) && /local model/i.test(title))
  ) {
    return locale === "ja"
      ? "GitHub Copilot CLI で、GitHub が提供するモデルルーティングを使わずに、自前のモデルプロバイダーまたは完全ローカルのモデルを接続できるようになった。用途に応じてモデルを選べる幅が広がった。"
      : "GitHub Copilot CLI can now connect to your own model provider or run fully local models instead of GitHub-hosted routing, giving you more control over which models power your CLI workflows.";
  }

  if (/dependabot/i.test(title) && /ai agents/i.test(title)) {
    return locale === "ja"
      ? "依存パッケージの脆弱性対応が単純なバージョン更新では完結しない場合に、Dependabot アラートを Copilot や Claude、Codex などの AI コーディングエージェントに割り当てて修正を依頼できるようになった。コード変更を伴う脆弱性修正の自動化につながる。"
      : "Dependabot alerts can now be assigned to AI coding agents such as Copilot, Claude, and Codex for remediation that requires code changes beyond a simple version bump.";
  }

  if (/issue triage/i.test(text) && /copilot sdk/i.test(text)) {
    return locale === "ja"
      ? "Copilot SDK を使って GitHub issue の要約やトリアージを組み込む実装例。自前アプリへの agent 機能統合を考えるときの参考になる。"
      : "An implementation example showing how the Copilot SDK can power GitHub issue triage and summarization in your own application.";
  }

  if (/applied science/i.test(text) && /agent/i.test(text)) {
    return locale === "ja"
      ? "Copilot を前提にした agent 駆動開発の実践例。計画、テスト、文書化を含めてリポジトリを agent 向けに整える考え方が参考になる。"
      : "A practical look at agent-driven development, including how to shape planning, testing, and documentation around agent workflows.";
  }

  if (/squad/i.test(text) && /agents/i.test(text)) {
    return locale === "ja"
      ? "リポジトリ内で複数 agent を協調動作させる実践例。チーム運用や orchestration の設計を見る材料になる。"
      : "A practical example of coordinating multiple agents inside a repository, useful for thinking about team-level orchestration design.";
  }

  if (
    /execution is the new interface/i.test(text) ||
    /copilot sdk/i.test(text)
  ) {
    return locale === "ja"
      ? "Copilot SDK を使って agent 的な実行基盤を自前アプリへ組み込む考え方の整理。SDK をどう位置づけるかの理解に役立つ。"
      : "A conceptual piece on using the Copilot SDK as an execution interface for agentic applications rather than building orchestration from scratch.";
  }

  if (/copilot cli/i.test(text)) {
    if (/agent/i.test(text)) {
      return locale === "ja"
        ? "Copilot CLI の agent 機能に関する更新。タスク自動化や agent ワークフローを CLI から扱う運用では確認しておきたい。"
        : "An update about Copilot CLI agent capabilities, useful for those building agentic workflows from the terminal.";
    }
    if (/mcp/i.test(text)) {
      return locale === "ja"
        ? "Copilot CLI への MCP 対応に関する更新。外部ツール・サービスの CLI 統合で接続パターンが変わる可能性がある。"
        : "An update covering MCP integration for Copilot CLI, which may affect how external tools and services connect to CLI workflows.";
    }
    if (/session/i.test(text)) {
      return locale === "ja"
        ? "Copilot CLI のセッション管理に関する更新。長時間の対話や複数の context を扱う運用では確認しておきたい。"
        : "An update about session management in Copilot CLI, worth reviewing if you work with long-running or context-heavy interactions.";
    }
    if (/model/i.test(text)) {
      return locale === "ja"
        ? "Copilot CLI でのモデル選択や切り替えに関する更新。用途に応じたモデルの使い分けが変わる可能性がある。"
        : "An update about model selection or switching in Copilot CLI, which may change how you choose models for different tasks.";
    }
    if (/install|setup|upgrade/i.test(text)) {
      return locale === "ja"
        ? "Copilot CLI のインストール・セットアップに関する更新。初期導入やアップグレードパスに確認を。"
        : "An update about installing or setting up Copilot CLI, worth checking if you are onboarding or upgrading.";
    }
    if (/command/i.test(text)) {
      return locale === "ja"
        ? "Copilot CLI のコマンドや使用法に関する更新。ターミナルでの日々の使い方に関連する変更を含む可能性あり。"
        : "An update about Copilot CLI commands and usage patterns, worth reviewing for day-to-day terminal workflows.";
    }
    return locale === "ja"
      ? "GitHub Copilot CLI の更新。CLI を実用している層はターミナル操作や自動化フローへの確認を。"
      : "An update about GitHub Copilot CLI capabilities and workflows for terminal-heavy usage.";
  }

  if (/usage metrics/i.test(text) && /active and passive/i.test(text)) {
    return locale === "ja"
      ? "Copilot usage metrics で、コードレビュー(CCR)を明示的に依頼したユーザー(アクティブ)と自動追加されたユーザー(パッシブ)を区別して把握できるようになった。Enterprise・組織管理者が CCR の実際の採用状況を測りやすくなる。"
      : "Copilot usage metrics can now distinguish active CCR users (who explicitly requested a review) from passive ones (where the review was added automatically), giving enterprise and organization admins better insight into actual code review adoption.";
  }

  if (/code review/i.test(text)) {
    return locale === "ja"
      ? "GitHub Copilot code review 関連の更新。レビュー自動化や品質改善への影響を確認しておきたい。"
      : "An update related to GitHub Copilot code review and its impact on review automation and quality workflows.";
  }

  if (/visual studio/i.test(text) && /copilot/i.test(text)) {
    return locale === "ja"
      ? "Visual Studio 側の GitHub Copilot 更新。IDE 連携や agent 拡張の強化点を押さえたい。"
      : "A GitHub Copilot update for Visual Studio that is worth checking for IDE integration and agent-extensibility changes.";
  }

  if (/github copilot/i.test(text)) {
    return locale === "ja"
      ? summaryLeadJa
        ? `GitHub Copilot 関連の更新。${summaryLeadJa}`
        : "GitHub Copilot 関連の更新。運用や導入判断に関わる変更点を原文で確認しておきたい。"
      : "A GitHub Copilot update that should be reviewed for its impact on usage and operations.";
  }

  if (/visual studio code|vs code/i.test(text)) {
    return locale === "ja"
      ? summaryLeadJa
        ? `Visual Studio Code 関連の更新。${summaryLeadJa}`
        : "Visual Studio Code 関連の更新。日々の開発フローや agent 利用に効く変更点を確認しておきたい。"
      : "A Visual Studio Code update worth checking for its effect on day-to-day development workflows.";
  }

  return locale === "ja"
    ? summaryLeadJa
      ? `英語ソースの更新。${summaryLeadJa}`
      : "英語ソースの更新。公開内容の変化や運用への影響を原文で確認しておきたい。"
    : trimmedEnglishSummary(
        cleanedSummary || "English-language update from a tracked source.",
      );
}

export function localizedTitle(event, locale = "ja") {
  const title = normalizeWhitespace(decodeHtmlEntities(event.title));
  if (locale === "en") {
    if (containsJapanese(title)) {
      return englishTitleFallback(event);
    }

    return title;
  }

  if (containsJapanese(title)) {
    return title;
  }

  if (event.kind === "vscode_release_note_section") {
    return title;
  }

  return patternTitle(title);
}

export function localizedSummary(event, locale = "ja") {
  const summary = cleanupSummary(event.summary);
  const title = normalizeWhitespace(decodeHtmlEntities(event.title));

  if (exactSummaryMappings[title]?.[locale]) {
    return trimText(
      exactSummaryMappings[title][locale],
      locale === "en" ? 420 : 360,
    );
  }

  if (locale === "en" && !containsJapanese(summary)) {
    return trimText(summaryFromPatterns({ ...event, summary }, "en"), 320);
  }

  if (containsJapanese(summary)) {
    return locale === "en"
      ? trimText(summaryFromPatterns({ ...event, summary }, "en"), 320)
      : trimText(summary, 360);
  }

  return trimText(
    summaryFromPatterns({ ...event, summary }, locale),
    locale === "en" ? 420 : 360,
  );
}

function digestTopicLabel(topic, locale = "ja") {
  const labels = {
    ja: {
      "GitHub Copilot": "GitHub Copilot",
      "VS Code": "VS Code",
      "GitHub Platform": "GitHub Platform",
      周辺ニュース: "周辺ニュース",
    },
    en: {
      "GitHub Copilot": "GitHub Copilot",
      "VS Code": "VS Code",
      "GitHub Platform": "GitHub Platform",
      周辺ニュース: "Ecosystem",
    },
  };

  return labels[locale]?.[topic] ?? topic;
}

function digestSourceGroupLabel(group, locale = "ja") {
  const labels = {
    ja: {
      github: "GitHub 公式",
      vscode: "VS Code 公式",
      platform: "GitHub Platform",
      other: "その他",
    },
    en: {
      github: "GitHub official",
      vscode: "VS Code official",
      platform: "GitHub Platform",
      other: "Other",
    },
  };

  return labels[locale]?.[group] ?? group;
}

function stripGenericJapaneseSummary(summary) {
  return normalizeWhitespace(
    String(summary ?? "")
      .replace(/^英語ソースの更新。/, "")
      .replace(/^Visual Studio Code 関連の更新。/, "")
      .replace(/^GitHub Copilot 関連の更新。/, "")
      .replace(/^VS Code チームによる AI 活用や実装改善の解説記事。/, "")
      .replace(
        /^詳細は原文を確認しつつ、日々の開発フローに効くかを見ておきたい。/,
        "",
      )
      .replace(/^IDE 連携や agent 拡張の強化点を押さえたい。/, "")
      .replace(/^ターミナル中心の運用を強化したいときの参考になる。/, ""),
  );
}

export function localizedDigestMention(event, locale = "ja", maxLength = 72) {
  const title = localizedTitle(event, locale);
  if (locale !== "ja") {
    return trimText(title, maxLength);
  }

  if (containsJapanese(title) && !/[A-Za-z]{4,}/.test(title)) {
    return trimText(title, maxLength);
  }

  const summaryLeadText = summaryLead(
    stripGenericJapaneseSummary(localizedSummary(event, locale)),
    maxLength + 24,
  );
  if (containsJapanese(summaryLeadText)) {
    return trimText(summaryLeadText, maxLength);
  }

  const topic = digestTopicLabel(classifyEvent(event), locale);
  const featureTag = buildHighlightTags(event, locale).find(
    (tag) =>
      tag !== localizedImportanceLabel(event, locale) &&
      tag !== digestTopicLabel(classifyEvent(event), locale),
  );
  const fallback = featureTag
    ? `${topic}の${featureTag}関連更新`
    : `${topic}の主要更新`;
  return trimText(fallback, maxLength);
}

export function summarizeEventSet(events, locale = "ja", options = {}) {
  const items = (events ?? []).filter(Boolean);
  if (items.length === 0) {
    return locale === "ja"
      ? "公開済み更新はありませんでした。"
      : "No published updates were found.";
  }

  const topicResolver = options.topicResolver ?? classifyEvent;
  const maxTopics = options.maxTopics ?? 3;
  const maxHighlights = options.maxHighlights ?? (locale === "ja" ? 4 : 3);
  const maxLength = options.maxLength ?? (locale === "ja" ? 180 : 240);
  const ordered = items
    .slice()
    .sort(
      (left, right) =>
        safeDate(right.publishedAt) - safeDate(left.publishedAt) ||
        rankEvent(right) - rankEvent(left),
    );

  const topicCounts = new Map();
  for (const event of ordered) {
    const topic = topicResolver(event);
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
  }

  const topicParts = [...topicCounts.entries()]
    .sort(
      (left, right) =>
        right[1] - left[1] || String(left[0]).localeCompare(String(right[0])),
    )
    .slice(0, maxTopics)
    .map(([topic, count]) =>
      locale === "ja"
        ? `${digestTopicLabel(topic, locale)} ${count}件`
        : `${digestTopicLabel(topic, locale)} (${count})`,
    );

  const sourceCounts = new Map();
  for (const event of ordered) {
    const group = sourceGroup(event);
    sourceCounts.set(group, (sourceCounts.get(group) ?? 0) + 1);
  }

  const sourceParts = [...sourceCounts.entries()]
    .sort(
      (left, right) =>
        right[1] - left[1] || String(left[0]).localeCompare(String(right[0])),
    )
    .slice(0, maxTopics)
    .map(([group, count]) =>
      locale === "ja"
        ? `${digestSourceGroupLabel(group, locale)} ${count}件`
        : `${digestSourceGroupLabel(group, locale)} (${count})`,
    );

  const importanceCounts = new Map();
  for (const event of ordered) {
    const label = localizedImportanceLabel(event, locale);
    importanceCounts.set(label, (importanceCounts.get(label) ?? 0) + 1);
  }

  const importanceParts = [...importanceCounts.entries()]
    .sort(
      (left, right) =>
        right[1] - left[1] || String(left[0]).localeCompare(String(right[0])),
    )
    .slice(0, 3)
    .map(([label, count]) =>
      locale === "ja" ? `${label} ${count}件` : `${label} (${count})`,
    );

  const highlightTitles = [
    ...new Set(
      ordered
        .slice(0, maxHighlights)
        .map((event) =>
          localizedDigestMention(event, locale, locale === "ja" ? 78 : 72),
        ),
    ),
  ];

  const message =
    locale === "ja"
      ? [
          `${items.length}件の更新を反映。`,
          topicParts.length > 0 ? `内訳は${topicParts.join("、")}。` : "",
          sourceParts.length > 0
            ? `ソース群では${sourceParts.join("、")}。`
            : "",
          importanceParts.length > 0
            ? `更新種別では${importanceParts.join("、")}。`
            : "",
          highlightTitles.length > 0
            ? `主な話題は、${highlightTitles.join("、")}。`
            : "",
        ]
          .filter(Boolean)
          .join("")
      : [
          `Reflects ${items.length} published updates.`,
          topicParts.length > 0 ? `Main areas: ${topicParts.join(", ")}.` : "",
          sourceParts.length > 0 ? `Sources: ${sourceParts.join(", ")}.` : "",
          importanceParts.length > 0
            ? `Update types: ${importanceParts.join(", ")}.`
            : "",
          highlightTitles.length > 0
            ? `Key items: ${highlightTitles.join(", ")}.`
            : "",
        ]
          .filter(Boolean)
          .join(" ");

  return trimText(message, maxLength);
}

export function originalTitle(event) {
  const localized = localizedTitle(event);
  const title = normalizeWhitespace(decodeHtmlEntities(event.title));
  return localized === title ? null : title;
}

export function localizedImportanceLabel(event, locale = "ja") {
  const label = importanceLabel(event);
  const map =
    locale === "ja"
      ? {
          GA: "GA",
          Retired: "廃止・移行",
          Preview: "プレビュー",
          Release: "リリース",
          Improvement: "機能更新",
          Snapshot: "差分",
          Update: "更新",
        }
      : {
          GA: "GA",
          Retired: "Retired",
          Preview: "Preview",
          Release: "Release",
          Improvement: "Feature Update",
          Snapshot: "Snapshot",
          Update: "Update",
        };

  return map[label] ?? label;
}

function topicBadgeLabel(event, locale = "ja") {
  const topic = classifyEvent(event);
  const topicLabels = {
    ja: {
      "GitHub Copilot": "GitHub Copilot",
      "VS Code": "VS Code",
      "GitHub Platform": "GitHub Platform",
      周辺ニュース: "周辺ニュース",
    },
    en: {
      "GitHub Copilot": "GitHub Copilot",
      "VS Code": "VS Code",
      "GitHub Platform": "GitHub Platform",
      周辺ニュース: "Ecosystem",
    },
  };

  return topicLabels[locale]?.[topic] ?? topic;
}

export function buildHighlightTags(event, locale = "ja") {
  const tags = [
    localizedImportanceLabel(event, locale),
    topicBadgeLabel(event, locale),
  ];
  const text = eventText(event);

  const featureTag = detectFeatureTag(text, locale);
  if (featureTag) {
    tags.push(featureTag);
  }

  return [...new Set(tags)].slice(0, 3);
}

function detectFeatureTag(text, locale) {
  const rules = [
    [/\bsdk\b/, "SDK", "SDK"],
    [/\bcli\b/, "CLI", "CLI"],
    [/\bmcp\b|model context protocol/, "MCP", "MCP"],
    [
      /\bagent\b.*skill|skill.*agent|\bskill\.md\b/,
      locale === "ja" ? "スキル" : "Skills",
      locale === "ja" ? "スキル" : "Skills",
    ],
    [
      /\bagent\b.*(?:hook|plugin|subagent|delegate|handoff)|(?:hook|plugin|subagent|delegate|handoff).*\bagent\b/,
      locale === "ja" ? "エージェント" : "Agents",
      locale === "ja" ? "エージェント" : "Agents",
    ],
    [/\bnes\b|next edit suggest|inline suggest|ghost text/, "NES", "NES"],
    [
      /\bmodel\b|codex|gpt-?[45]|claude|gemini|thinking.*token|reasoning/,
      locale === "ja" ? "モデル" : "Models",
      locale === "ja" ? "モデル" : "Models",
    ],
    [
      /firewall|signed commits|vulnerability|security|sandbox|trust|auto.?approv/,
      locale === "ja" ? "セキュリティ" : "Security",
      locale === "ja" ? "セキュリティ" : "Security",
    ],
    [
      /open.?source|oss\b/,
      locale === "ja" ? "オープンソース" : "Open Source",
      locale === "ja" ? "オープンソース" : "Open Source",
    ],
    [
      /release note|version 1\.\d{3}|monthly release|vs code \d+\.\d+/,
      locale === "ja" ? "リリース" : "Release",
      locale === "ja" ? "リリース" : "Release",
    ],
    [
      /terminal|shell integration/,
      locale === "ja" ? "ターミナル" : "Terminal",
      locale === "ja" ? "ターミナル" : "Terminal",
    ],
    [
      /\bchat\b.*(?:view|session|picker|inline)|inline chat/,
      locale === "ja" ? "チャット" : "Chat",
      locale === "ja" ? "チャット" : "Chat",
    ],
    [
      /\bextension\b.*author|extension api|proposed api/,
      locale === "ja" ? "拡張 API" : "Extension API",
      locale === "ja" ? "拡張 API" : "Extension API",
    ],
    [/notebook|jupyter/, "Notebook", "Notebook"],
    [
      /debug|breakpoint/,
      locale === "ja" ? "デバッグ" : "Debug",
      locale === "ja" ? "デバッグ" : "Debug",
    ],
    [
      /source control|git blame|worktree/,
      locale === "ja" ? "ソース管理" : "Source Control",
      locale === "ja" ? "ソース管理" : "Source Control",
    ],
    [
      /accessibility|screen reader|aria/,
      locale === "ja" ? "アクセシビリティ" : "A11y",
      locale === "ja" ? "アクセシビリティ" : "A11y",
    ],
    [
      /enterprise|policy|organization/,
      locale === "ja" ? "エンタープライズ" : "Enterprise",
      locale === "ja" ? "エンタープライズ" : "Enterprise",
    ],
  ];

  for (const [pattern, ja, en] of rules) {
    if (pattern.test(text)) {
      return locale === "ja" ? ja : en;
    }
  }

  return null;
}

function normalizeArray(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}

function sourceGroupFromSourceId(sourceId) {
  if (!sourceId) {
    return "other";
  }

  if (
    sourceId === "github-changelog-copilot" ||
    sourceId === "github-copilot-blog"
  ) {
    return "github";
  }

  if (
    sourceId === "vscode-feed" ||
    sourceId === "vscode-updates" ||
    sourceId === "copilot-whats-new" ||
    sourceId.startsWith("vscode-release-notes-")
  ) {
    return "vscode";
  }

  if (sourceId === "github-changelog") {
    return "platform";
  }

  return "other";
}

export function eventKey(event) {
  if (event.kind === "vscode_release_note_section") {
    const sectionTitle =
      event.sectionTitle ??
      String(event.title ?? "").replace(/^Visual Studio Code [0-9.]+:\s*/, "");
    return `${event.url || event.sourceId}:${event.sectionHeading || ""}:${sectionTitle}`;
  }

  return event.url || event.title || event.eventId;
}

function eventText(event) {
  return normalizeWhitespace(
    decodeHtmlEntities(
      [
        event.title,
        event.summary,
        event.sourceName,
        ...(event.sourceNames ?? []),
        ...(event.categories ?? []),
      ].join(" "),
    ),
  ).toLowerCase();
}

export function isOfficialSource(event) {
  return (
    officialSourceIds.has(event.sourceId) ||
    String(event.sourceId ?? "").startsWith("vscode-release-notes-")
  );
}

export function isRelevantEvent(event) {
  const text = eventText(event);
  const categories = (event.categories ?? []).map((category) =>
    String(category),
  );

  if (categories.includes("編集後記")) {
    return false;
  }

  if (isOfficialSource(event)) {
    if (event.sourceId === "github-changelog") {
      return /copilot|cloud agent|coding agent|vs code|visual studio code/.test(
        text,
      );
    }

    return true;
  }

  return (
    /copilot|cloud agent|coding agent|copilot cli|copilot sdk/.test(text) ||
    (/vs code|visual studio code/.test(text) && /agent/.test(text))
  );
}

export function applyEditorialPolicy(events) {
  const filtered = (events ?? []).filter((event) => isRelevantEvent(event));
  const officialEvents = [];
  const surroundingEvents = [];

  for (const event of filtered) {
    if (isOfficialSource(event)) {
      officialEvents.push(event);
      continue;
    }

    surroundingEvents.push(event);
  }

  surroundingEvents.sort(
    (left, right) =>
      rankEvent(right) - rankEvent(left) ||
      safeDate(right.publishedAt) - safeDate(left.publishedAt),
  );

  return [...officialEvents, ...surroundingEvents.slice(0, 3)];
}

export function buildEditorialNote(date, events) {
  return null;
}

export function rankEvent(event) {
  const categories = (event.categories ?? []).map((category) =>
    String(category).toLowerCase(),
  );
  let score = Number(event.score ?? 0);

  if (categories.includes("retired")) {
    score += 3;
  }

  if (categories.includes("release")) {
    score += 2;
  }

  if (event.kind === "html_snapshot_change") {
    score += 1;
  }

  return score;
}

export function dedupeEvents(events) {
  const map = new Map();

  for (const event of events ?? []) {
    const key = eventKey(event);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        ...event,
        sourceIds: normalizeArray([event.sourceId]),
        sourceNames: normalizeArray([event.sourceName]),
        categories: normalizeArray(event.categories),
      });
      continue;
    }

    map.set(key, {
      ...existing,
      summary:
        String(event.summary ?? "").length >
        String(existing.summary ?? "").length
          ? event.summary
          : existing.summary,
      score: Math.max(Number(existing.score ?? 0), Number(event.score ?? 0)),
      categories: normalizeArray([
        ...(existing.categories ?? []),
        ...(event.categories ?? []),
      ]),
      detectedAt:
        safeDate(event.detectedAt) < safeDate(existing.detectedAt)
          ? event.detectedAt
          : existing.detectedAt,
      sourceNames: normalizeArray([
        ...(existing.sourceNames ?? []),
        event.sourceName,
      ]),
      sourceIds: normalizeArray([
        ...(existing.sourceIds ?? []),
        ...(existing.sourceId ? [existing.sourceId] : []),
        event.sourceId,
      ]),
      publishedAt:
        safeDate(event.publishedAt) > safeDate(existing.publishedAt)
          ? event.publishedAt
          : existing.publishedAt,
    });
  }

  return [...map.values()];
}

export function classifyEvent(event) {
  const text = [
    event.title,
    event.summary,
    ...(event.sourceNames ?? [event.sourceName]),
  ]
    .join(" ")
    .toLowerCase();

  if (
    text.includes("copilot") ||
    text.includes("cloud agent") ||
    text.includes("coding agent")
  ) {
    return "GitHub Copilot";
  }

  if (
    text.includes("vs code") ||
    text.includes("visual studio code") ||
    event.sourceId?.startsWith("vscode")
  ) {
    return "VS Code";
  }

  if (
    text.includes("github actions") ||
    (text.includes("github changelog") && !text.includes("copilot"))
  ) {
    return "GitHub Platform";
  }

  return "周辺ニュース";
}

export function sourceGroup(event) {
  const sourceIds = normalizeArray([
    ...(event.sourceIds ?? []),
    ...(event.sourceId ? [event.sourceId] : []),
  ]);

  if (sourceIds.length === 0) {
    return "other";
  }

  return sourceIds.reduce((selectedGroup, sourceId) => {
    const nextGroup = sourceGroupFromSourceId(sourceId);
    return sourceGroupPriority[nextGroup] > sourceGroupPriority[selectedGroup]
      ? nextGroup
      : selectedGroup;
  }, "other");
}

export function importanceLabel(event) {
  const text = `${event.title} ${event.summary}`.toLowerCase();
  const categories = (event.categories ?? []).map((category) =>
    String(category).toLowerCase(),
  );

  if (text.includes("generally available") || /\bga\b/.test(text)) {
    return "GA";
  }

  if (categories.includes("retired")) {
    return "Retired";
  }

  if (text.includes("public preview") || text.includes("preview")) {
    return "Preview";
  }

  if (categories.includes("release")) {
    return "Release";
  }

  if (categories.includes("improvement")) {
    return "Improvement";
  }

  if (event.kind === "html_snapshot_change") {
    return "Snapshot";
  }

  return "Update";
}

export function importanceReason(event, locale = "ja") {
  const title = normalizeWhitespace(decodeHtmlEntities(event.title));
  const text = `${title} ${event.summary}`.toLowerCase();

  if (exactImportanceMappings[title]?.[locale]) {
    return exactImportanceMappings[title][locale];
  }

  if (
    /ask copilot/i.test(text) &&
    /security assessments?|risk assessment/i.test(text)
  ) {
    return locale === "ja"
      ? "セキュリティ評価画面からそのまま Copilot で状況理解と対処案の確認へ進めるので、調査と修正判断の往復を減らしやすい更新です。"
      : "This reduces context switching by letting security teams move directly from assessment results into Copilot-guided investigation and next-step planning.";
  }

  if (/pausing new github copilot pro trials/i.test(title)) {
    return locale === "ja"
      ? "新規 trial 導線が止まるので、評価導入や onboarding 手順、社内案内を trial 前提で組んでいたチームには直接影響します。"
      : "This matters because any onboarding or evaluation flow that depended on starting new Copilot Pro trials now needs an immediate alternative.";
  }

  if (/aggregate copilot cloud agent active user counts/i.test(title)) {
    return locale === "ja"
      ? "cloud agent の利用人数を日次・週次・月次でまとめて追えるので、導入状況の可視化や rollout 効果の測定を user-level 集計なしで進めやすくなります。"
      : "This matters because teams can now track cloud-agent adoption across daily, weekly, and monthly windows without building their own user-level aggregation pipeline.";
  }

  if (
    /copilot cli activity now included in usage metrics totals and feature breakdowns/i.test(
      title,
    )
  ) {
    return locale === "ja"
      ? "CLI 利用が合計値へ入ることで dashboard や閾値の前提が変わるため、IDE-only と見なしていた usage metrics の読み方を見直す必要があります。"
      : "This matters because dashboards that treated top-level usage metrics as IDE-only will now shift, so reporting baselines and thresholds may need to be updated.";
  }

  if (
    /github copilot cli for beginners: getting started with github copilot cli/i.test(
      title,
    )
  ) {
    return locale === "ja"
      ? "CLI 導入を始めるメンバー向けの共通 onboarding 素材として使いやすく、terminal 中心の Copilot 運用を広げる入口になります。"
      : "This matters as a practical onboarding asset for teams introducing Copilot CLI and expanding Copilot use into terminal-centered workflows.";
  }

  if (
    /copilot cloud agent.?s validation tools are now 20% faster/i.test(title)
  ) {
    return locale === "ja"
      ? "agent が review を返すまでの待ち時間を減らしつつ validation の幅は保てるので、cloud agent の実運用で感じる遅さを直接下げる更新です。"
      : "This matters because it reduces one of the most visible sources of cloud-agent latency without narrowing the validation checks that protect quality and security.";
  }

  const label = importanceLabel(event);

  if (label === "Retired") {
    return locale === "ja"
      ? "既存の設定や利用モデルの見直しが必要になりやすい更新です。"
      : "This update is likely to require changes to existing model choices or workflows.";
  }

  if (label === "GA") {
    return locale === "ja"
      ? "試用段階を越えて、本番運用の候補として見やすくなった更新です。"
      : "This feature has moved beyond preview and is now easier to treat as production-ready.";
  }

  if (label === "Release") {
    return locale === "ja"
      ? "新機能が実際の利用候補に入ったことを示す更新です。"
      : "This indicates newly shipped capabilities that may be ready for immediate evaluation.";
  }

  if (label === "Preview") {
    return locale === "ja"
      ? "早めに検証して運用適合を判断しやすい更新です。"
      : "This is worth validating early so you can decide whether it fits your workflow.";
  }

  if (label === "Improvement") {
    return locale === "ja"
      ? "既存ワークフローの制約や手間を減らす方向の更新です。"
      : "This tends to reduce friction or constraints in an existing workflow.";
  }

  if (label === "Snapshot") {
    return locale === "ja"
      ? "固定ページの追記や差し替えを拾うための更新です。"
      : "This reflects a detected change on a tracked static page.";
  }

  return locale === "ja"
    ? "継続ウォッチ対象として押さえておきたい更新です。"
    : "This is a useful update to keep on your watch list.";
}

export function buildDailyDigest(eventLog) {
  const reportDate = safeDate(eventLog.date ?? Date.now());
  reportDate.setHours(23, 59, 59, 999);
  const allEvents = applyEditorialPolicy(eventLog.events ?? []);
  const futureEvents = allEvents.filter(
    (event) =>
      event.isFutureDated ||
      safeDate(event.publishedAt ?? event.detectedAt) > reportDate,
  );
  const rawEvents = allEvents.filter(
    (event) =>
      !event.isFutureDated &&
      safeDate(event.publishedAt ?? event.detectedAt) <= reportDate,
  );
  const editorialNote = null;
  const latestRunIds = new Set(eventLog.latestRun?.newEventIds ?? []);
  const uniqueEvents = dedupeEvents(rawEvents).sort(
    (left, right) =>
      safeDate(right.publishedAt) - safeDate(left.publishedAt) ||
      rankEvent(right) - rankEvent(left),
  );
  const freshUniqueEvents = dedupeEvents(
    rawEvents.filter((event) => latestRunIds.has(event.eventId)),
  ).sort(
    (left, right) =>
      rankEvent(right) - rankEvent(left) ||
      safeDate(right.publishedAt) - safeDate(left.publishedAt),
  );
  const futureUniqueEvents = dedupeEvents(futureEvents).sort(
    (left, right) =>
      safeDate(left.publishedAt) - safeDate(right.publishedAt) ||
      rankEvent(right) - rankEvent(left),
  );

  const sourceBreakdown = new Map();
  for (const event of rawEvents) {
    const sourceName = event.sourceName ?? "Unknown";
    if (!sourceBreakdown.has(sourceName)) {
      sourceBreakdown.set(sourceName, new Set());
    }

    sourceBreakdown.get(sourceName).add(eventKey(event));
  }

  const topicOrder = [
    "GitHub Copilot",
    "VS Code",
    "GitHub Platform",
    "周辺ニュース",
  ];
  const topicMap = new Map(topicOrder.map((topic) => [topic, []]));
  for (const event of uniqueEvents) {
    topicMap.get(classifyEvent(event)).push(event);
  }

  return {
    date: eventLog.date,
    generatedAt: eventLog.generatedAt,
    latestRun: eventLog.latestRun ?? {
      newEventsCount: 0,
      newEventIds: [],
      errorCount: 0,
    },
    errorCount: (eventLog.errors ?? []).length,
    editorialNote,
    rawEventCount: rawEvents.length,
    uniqueEventCount: uniqueEvents.length,
    freshUniqueCount: freshUniqueEvents.length,
    futureUniqueCount: futureUniqueEvents.length,
    highlights: (freshUniqueEvents.length > 0
      ? freshUniqueEvents
      : uniqueEvents
    ).slice(0, 5),
    futureEvents: futureUniqueEvents.slice(0, 5),
    uniqueEvents,
    sourceBreakdown: [...sourceBreakdown.entries()]
      .map(([name, keys]) => ({ name, count: keys.size }))
      .sort(
        (left, right) =>
          right.count - left.count || left.name.localeCompare(right.name, "ja"),
      ),
    topics: topicOrder.map((topic) => ({
      name: topic,
      count: topicMap.get(topic).length,
      events: topicMap.get(topic),
    })),
  };
}
