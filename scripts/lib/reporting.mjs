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
  "Dependabot alerts are now assignable to AI agents for remediation": {
    ja: "単なる依存更新では済まない脆弱性修正を agent に任せられるため、セキュリティ対応の滞留を減らしやすくなります。",
    en: "This helps reduce security backlog by letting agents handle remediation work that requires actual code changes, not just dependency bumps.",
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
  ]);

  if (exactMappings.has(normalized)) {
    return exactMappings.get(normalized);
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

  if (version && vscodeReleaseSummaries[version]) {
    return vscodeReleaseSummaries[version][locale];
  }

  if (exactSummaryMappings[title]?.[locale]) {
    return exactSummaryMappings[title][locale];
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
      ? "GitHub Copilot 関連の更新。詳細は原文を確認しつつ、運用への影響があるかを見ておきたい。"
      : "A GitHub Copilot update that should be reviewed for its impact on usage and operations.";
  }

  if (/visual studio code|vs code/i.test(text)) {
    return locale === "ja"
      ? "Visual Studio Code 関連の更新。詳細は原文を確認しつつ、日々の開発フローに効くかを見ておきたい。"
      : "A Visual Studio Code update worth checking for its effect on day-to-day development workflows.";
  }

  return locale === "ja"
    ? "英語ソースの更新。詳細は原文リンクを確認しつつ、運用への影響があるかを見ておきたい。"
    : trimmedEnglishSummary(
        event.summary || "English-language update from a tracked source.",
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
      locale === "en" ? 320 : 280,
    );
  }

  if (locale === "en" && !containsJapanese(summary)) {
    return trimText(summaryFromPatterns({ ...event, summary }, "en"), 320);
  }

  if (containsJapanese(summary)) {
    return locale === "en"
      ? trimText(summaryFromPatterns({ ...event, summary }, "en"), 320)
      : trimText(summary, 280);
  }

  return trimText(
    summaryFromPatterns({ ...event, summary }, locale),
    locale === "en" ? 320 : 280,
  );
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
  if (!date || (events ?? []).length === 0) {
    return null;
  }

  const day = safeDate(date);
  day.setHours(0, 0, 0, 0);

  const oldestPublishedAt = (events ?? []).reduce((oldest, event) => {
    const publishedAt = safeDate(event.publishedAt ?? event.detectedAt ?? date);
    if (!oldest || publishedAt < oldest) {
      return publishedAt;
    }

    return oldest;
  }, null);

  if (!oldestPublishedAt) {
    return null;
  }

  oldestPublishedAt.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (day.getTime() - oldestPublishedAt.getTime()) / 86400000,
  );
  if (diffDays < 7) {
    return null;
  }

  return `注記: この記録には当日公開分だけでなく、初回取り込みや未取得分の回収が含まれる可能性があります。最も古い公開日は ${toDateOnly(oldestPublishedAt)} です。`;
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

  if (exactImportanceMappings[title]?.[locale]) {
    return exactImportanceMappings[title][locale];
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
  const editorialNote =
    eventLog.editorialNote ?? buildEditorialNote(eventLog.date, rawEvents);
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
