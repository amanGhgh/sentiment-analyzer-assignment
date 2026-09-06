const lexicons = {
  positive: [
    "good",
    "great",
    "excellent",
    "happy",
    "helpful",
    "thanks",
    "thank",
    "love",
    "perfect",
    "awesome",
    "resolved",
    "satisfied",
    "appreciate",
    "amazing",
    "yes",
    "quick",
  ],
  negative: [
    "bad",
    "poor",
    "angry",
    "frustrated",
    "disappointed",
    "hate",
    "issue",
    "problem",
    "broken",
    "waiting",
    "slow",
    "terrible",
    "cancel",
    "refund",
    "complaint",
    "not working",
    "unhappy",
  ],
  urgency: [
    "urgent",
    "asap",
    "immediately",
    "today",
    "now",
    "quickly",
    "waiting",
  ],
  churn: [
    "cancel",
    "close my account",
    "switch",
    "leave",
    "refund",
    "competitor",
  ],
};

function score(text) {
  const value = text.toLowerCase();

  const count = (words) =>
    words.reduce(
      (total, word) =>
        total +
        (
          value.match(
            new RegExp(
              `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
              "g",
            ),
          ) || []
        ).length,
      0,
    );

  const positive = count(lexicons.positive);
  const negative = count(lexicons.negative);
  const compound = positive - negative;

  let label = "Neutral";

  // Strong emotional words should be detected even once
  const strongNegative =
    /\b(angry|frustrated|hate|terrible|unhappy|disappointed)\b/.test(value);

  const strongPositive =
    /\b(excellent|great|awesome|amazing|love|perfect)\b/.test(value);

  if (strongNegative || compound < 0) {
    label = "Negative";
  } else if (strongPositive || compound > 0) {
    label = "Positive";
  }

  return {
    positive,
    negative,
    compound,
    label,
  };
}

function emotion(text, sentiment) {
  const t = text.toLowerCase();

  if (/angry|frustrated|terrible|unacceptable/.test(t))
    return "Frustration";

  if (/thank|great|happy|appreciate|love/.test(t))
    return "Satisfaction";

  if (/urgent|asap|immediately|worried/.test(t))
    return "Concern";

  return sentiment === "Negative"
    ? "Concern"
    : sentiment === "Positive"
      ? "Optimism"
      : "Neutral";
}

function speakerAndText(line, index) {
  const match = line.match(/^\s*([^:]{1,35}):\s*(.+)$/);

  return match
    ? { speaker: match[1].trim(), text: match[2].trim() }
    : {
        speaker: index % 2 ? "Agent" : "Customer",
        text: line.trim(),
      };
}

function summaryFor(sentences, overall) {
  const negatives = sentences
    .filter((item) => item.sentiment === "Negative")
    .map((item) => item.text);

  const positives = sentences
    .filter((item) => item.sentiment === "Positive")
    .map((item) => item.text);

  if (overall === "Negative") {
    return `The caller raised ${
      negatives.length || "several"
    } concern(s). Follow up on: ${negatives.slice(0, 2).join(" ")}.`;
  }

  if (overall === "Positive") {
    return `The conversation ended positively, with ${
      positives.length || "some"
    } positive signal(s). ${positives.slice(-1)[0] || ""}`;
  }

  return "The conversation remained mostly neutral. Review the transcript for unresolved requests and next steps.";
}

function findPrimaryIssue(text) {
  const value = text.toLowerCase();

  if (/internet|network|connection|wifi/.test(value))
    return "Connectivity problem";

  if (/bill|charge|payment|invoice/.test(value))
    return "Billing question";

  if (/delivery|order|shipment/.test(value))
    return "Delivery concern";

  if (/login|password|account/.test(value))
    return "Account access issue";

  return "General customer request";
}

function findResolutionStatus(text) {
  const value = text.toLowerCase();

  if (/resolved|fixed|scheduled|will send|priority ticket/.test(value))
    return "Follow-up arranged";

  if (/cancel|refund|not working|still waiting/.test(value))
    return "Needs follow-up";

  return "No clear resolution";
}

// Offline demo fallback only.
// n8n + an LLM is used when N8N_WEBHOOK_URL is configured.
function analyze(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const source =
    lines.length > 1
      ? lines
      : text.split(/(?<=[.!?])\s+/).filter(Boolean);

  const sentences = source.map((line, index) => {
    const { speaker, text: sentence } = speakerAndText(line, index);
    const result = score(sentence);

    return {
      id: index + 1,
      speaker,
      text: sentence,
      sentiment: result.label,
      emotion: emotion(sentence, result.label),
      score: result.compound,
    };
  });

  // Calculate overall sentiment from sentence-level results
  const sentimentCounts = {
    Positive: sentences.filter((item) => item.sentiment === "Positive").length,
    Neutral: sentences.filter((item) => item.sentiment === "Neutral").length,
    Negative: sentences.filter((item) => item.sentiment === "Negative").length,
  };

  let overallLabel = "Neutral";

  if (
    sentimentCounts.Positive > sentimentCounts.Negative &&
    sentimentCounts.Positive >= sentimentCounts.Neutral
  ) {
    overallLabel = "Positive";
  } else if (
    sentimentCounts.Negative > sentimentCounts.Positive &&
    sentimentCounts.Negative >= sentimentCounts.Neutral
  ) {
    overallLabel = "Negative";
  }

  const all = {
    positive: sentimentCounts.Positive,
    negative: sentimentCounts.Negative,
    compound: sentimentCounts.Positive - sentimentCounts.Negative,
    label: overallLabel,
  };

  const sentimentBreakdown = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  sentences.forEach((item) => {
    sentimentBreakdown[item.sentiment.toLowerCase()] += 1;
  });

  const urgencyCount = lexicons.urgency.reduce(
    (n, word) =>
      n +
      (
        text.toLowerCase().match(new RegExp(`\\b${word}\\b`, "g")) || []
      ).length,
    0,
  );

  const churnRisk = lexicons.churn.some((word) =>
    text.toLowerCase().includes(word),
  )
    ? "High"
    : all.negative > all.positive
      ? "Medium"
      : "Low";

  return {
    overallSentiment: all.label,

    sentimentScore: Math.max(
      -100,
      Math.min(100, all.compound * 20),
    ),

    sentimentBreakdown,

    sentenceAnalysis: sentences.map(
      ({ speaker, text: sentence, sentiment, emotion }) => ({
        speaker,
        sentence,
        sentiment,
        emotion,
      }),
    ),

    primaryEmotion: emotion(text, all.label),
    primaryIssue: findPrimaryIssue(text),
    resolutionStatus: findResolutionStatus(text),

    conversationSummary: summaryFor(sentences, all.label),

    keyInsights: [
      `${urgencyCount} urgency signal${
        urgencyCount === 1 ? "" : "s"
      } detected`,
      `Churn risk: ${churnRisk}`,
      `${sentences.length} conversation lines analyzed`,
    ],
  };
}

module.exports = { analyze };
