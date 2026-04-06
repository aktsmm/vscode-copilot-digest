export function safeDate(value) {
  const date = new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

const officialSourceIds = new Set([
  'github-changelog',
  'github-changelog-copilot',
  'github-copilot-blog',
  'vscode-feed',
  'vscode-updates',
  'vscode-release-notes-1-109',
  'copilot-whats-new',
]);

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

function toDateOnly(value) {
  return safeDate(value).toISOString().slice(0, 10);
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value) {
  return String(value ?? '')
    .replace(/&#8217;|&#39;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, '-')
    .replace(/&#8230;/g, '...')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
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

function summaryFromPatterns(event) {
  const title = normalizeWhitespace(event.title);
  const text = `${title} ${event.summary}`.toLowerCase();

  if (containsJapanese(title) || containsJapanese(event.summary)) {
    return trimText(cleanupSummary(event.summary));
  }

  if (/copilot sdk in public preview/i.test(title)) {
    return "GitHub Copilot SDK が public preview になった。自前のアプリやワークフローに Copilot のエージェント機能を組み込むための土台が整った。";
  }

  if (/runner controls/i.test(title)) {
    return "Copilot cloud agent が使う runner を organization 単位で既定化したり、リポジトリ側の上書きを制限したりできるようになった。";
  }

  if (/firewall settings/i.test(title)) {
    return "Copilot cloud agent の firewall 設定を organization 単位で管理できるようになり、許可リストや既定値を横断的に揃えやすくなった。";
  }

  if (/signs its commits/i.test(title)) {
    return "Copilot cloud agent が作る commit が署名付きになり、署名必須のルールを入れたリポジトリでも使いやすくなった。";
  }

  if (/deprecated/i.test(title)) {
    return "既存モデルの廃止予定が告知された。利用中のモデル設定やワークフローを見直し、代替モデルへ移る準備が必要。";
  }

  if (/custom instructions/i.test(title) && /available/i.test(title)) {
    return "organization custom instructions が一般提供になった。組織全体で Copilot の既定挙動を揃えやすくなる。";
  }

  if (/research, plan, and code/i.test(title)) {
    return "Copilot cloud agent が branch ベースの作業、実装前の plan、深い調査フローを扱いやすくする更新。";
  }

  if (/visual studio/i.test(title) && /march update/i.test(title)) {
    return "Visual Studio 側の Copilot 更新。custom agents、skills、find_symbol など、agent 拡張まわりが強化された。";
  }

  if (/github actions/i.test(title) && /updates/i.test(title)) {
    return "GitHub Actions の定期アップデート。runner やセキュリティ、運用まわりの変更をまとめて押さえるための更新。";
  }

  if (
    /^visual studio code [0-9.]+$/i.test(title) ||
    /version [0-9.]+/i.test(title)
  ) {
    return "Visual Studio Code の月次リリース。Copilot、agent、エディタ、ワークベンチ周辺の変更点をまとめて確認できる。";
  }

  if (/vs code/i.test(text) && /ai/i.test(text)) {
    return "VS Code チームによる AI 活用や実装改善の解説記事。運用の考え方や設計の背景を押さえる材料になる。";
  }

  if (/copilot cli/i.test(text)) {
    return "GitHub Copilot CLI の使い方や新機能に関する更新。ターミナル中心の運用を強化したいときの参考になる。";
  }

  if (/fleet/i.test(text) && /copilot cli/i.test(text)) {
    return "Copilot CLI の /fleet で複数の subagent を並列実行できるようになった。大きめの作業を並列分解して進める運用に効く。";
  }

  if (/issue triage/i.test(text) && /copilot sdk/i.test(text)) {
    return "Copilot SDK を使って GitHub issue の要約やトリアージを組み込む実装例。自前アプリへの agent 機能統合を考えるときの参考になる。";
  }

  if (/applied science/i.test(text) && /agent/i.test(text)) {
    return "Copilot を前提にした agent 駆動開発の実践例。計画、テスト、文書化を含めてリポジトリを agent 向けに整える考え方が参考になる。";
  }

  if (/squad/i.test(text) && /agents/i.test(text)) {
    return "リポジトリ内で複数 agent を協調動作させる実践例。チーム運用や orchestration の設計を見る材料になる。";
  }

  if (/execution is the new interface/i.test(text) || /copilot sdk/i.test(text)) {
    return "Copilot SDK を使って agent 的な実行基盤を自前アプリへ組み込む考え方の整理。SDK をどう位置づけるかの理解に役立つ。";
  }

  if (/code review/i.test(text)) {
    return "GitHub Copilot code review 関連の更新。レビュー自動化や品質改善への影響を確認しておきたい。";
  }

  if (/visual studio/i.test(text) && /copilot/i.test(text)) {
    return "Visual Studio 側の GitHub Copilot 更新。IDE 連携や agent 拡張の強化点を押さえたい。";
  }

  if (/github copilot/i.test(text)) {
    return "GitHub Copilot 関連の更新。詳細は原文を確認しつつ、運用への影響があるかを見ておきたい。";
  }

  if (/visual studio code|vs code/i.test(text)) {
    return "Visual Studio Code 関連の更新。詳細は原文を確認しつつ、日々の開発フローに効くかを見ておきたい。";
  }

  return "英語ソースの更新。詳細は原文リンクを確認しつつ、運用への影響があるかを見ておきたい。";
}

export function localizedTitle(event) {
  const title = normalizeWhitespace(decodeHtmlEntities(event.title));
  if (containsJapanese(title)) {
    return title;
  }

  return patternTitle(title);
}

export function localizedSummary(event) {
  const summary = cleanupSummary(event.summary);
  if (containsJapanese(summary)) {
    return trimText(summary, 280);
  }

  return summaryFromPatterns({ ...event, summary });
}

export function originalTitle(event) {
  const localized = localizedTitle(event);
  const title = normalizeWhitespace(decodeHtmlEntities(event.title));
  return localized === title ? null : title;
}

export function localizedImportanceLabel(event) {
  const label = importanceLabel(event);
  const map = {
    Retired: "廃止・移行",
    Preview: "プレビュー",
    Release: "リリース",
    Improvement: "改善",
    Snapshot: "差分",
    Update: "更新",
  };

  return map[label] ?? label;
}

function normalizeArray(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}

function eventKey(event) {
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
      ].join(' '),
    ),
  ).toLowerCase();
}

export function isOfficialSource(event) {
  return officialSourceIds.has(event.sourceId);
}

export function isRelevantEvent(event) {
  const text = eventText(event);
  const categories = (event.categories ?? []).map((category) => String(category));

  if (categories.includes('編集後記')) {
    return false;
  }

  if (isOfficialSource(event)) {
    if (event.sourceId === 'github-changelog') {
      return /copilot|cloud agent|coding agent|vs code|visual studio code/.test(text);
    }

    return true;
  }

  return /copilot|cloud agent|coding agent|copilot cli|copilot sdk/.test(text) || ((/vs code|visual studio code/.test(text)) && /agent/.test(text));
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
  const diffDays = Math.floor((day.getTime() - oldestPublishedAt.getTime()) / 86400000);
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
      sourceNames: normalizeArray([
        ...(existing.sourceNames ?? []),
        event.sourceName,
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

export function importanceLabel(event) {
  const text = `${event.title} ${event.summary}`.toLowerCase();
  const categories = (event.categories ?? []).map((category) =>
    String(category).toLowerCase(),
  );

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

export function importanceReason(event) {
  const label = importanceLabel(event);

  if (label === "Retired") {
    return "既存の設定や利用モデルの見直しが必要になりやすい更新です。";
  }

  if (label === "Release") {
    return "新機能が実際の利用候補に入ったことを示す更新です。";
  }

  if (label === "Preview") {
    return "早めに検証して運用適合を判断しやすい更新です。";
  }

  if (label === "Improvement") {
    return "既存ワークフローの制約や手間を減らす方向の更新です。";
  }

  if (label === "Snapshot") {
    return "固定ページの追記や差し替えを拾うための更新です。";
  }

  return "継続ウォッチ対象として押さえておきたい更新です。";
}

export function buildDailyDigest(eventLog) {
  const reportDate = safeDate(eventLog.date ?? Date.now());
  reportDate.setHours(23, 59, 59, 999);
  const rawEvents = applyEditorialPolicy(
    (eventLog.events ?? []).filter(
      (event) => safeDate(event.publishedAt ?? event.detectedAt) <= reportDate,
    ),
  );
  const editorialNote = eventLog.editorialNote ?? buildEditorialNote(eventLog.date, rawEvents);
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
    highlights: (freshUniqueEvents.length > 0
      ? freshUniqueEvents
      : uniqueEvents
    ).slice(0, 5),
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
