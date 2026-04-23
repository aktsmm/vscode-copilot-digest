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
  "Fix merge conflicts in three clicks with Copilot cloud agent": {
    ja: "github.com の pull request 上で、新しい Fix with Copilot ボタンからマージ競合を 3 クリックで解消できるようになった。コメント送信後は Copilot cloud agent が競合解消、build と test の確認、push までをクラウド実行環境で処理する。",
    en: "Pull requests on github.com can now resolve merge conflicts in three clicks through a new Fix with Copilot button, with Copilot cloud agent handling conflict resolution, build and test validation, and the push from its cloud environment.",
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
  "VS Code Updates changed": {
    ja: "VS Code Updates のハブページが更新され、1.117 リリースと BYOK、chat response incremental rendering、Agent Sessions ソートなどの新しい見出しが追加された。公開導線の更新を追うための差分。",
    en: "The VS Code Updates landing page changed to point at the 1.117 release with new sections such as BYOK support, incremental chat rendering, and agent session sorting.",
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
  "VS Code Release Notes 1.109 changed": {
    ja: "VS Code Release Notes 1.109 の固定ページ差分を検知した。過去 release note の追記や修正を追うための更新で、新機能追加そのものではない。",
    en: "A snapshot change was detected on the VS Code Release Notes 1.109 page, indicating edits to the published documentation rather than a newly shipped feature.",
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
