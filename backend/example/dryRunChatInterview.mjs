import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(currentDir, "dry-runs");
const options = parseArgs(process.argv.slice(2));
const backendUrl = trimTrailingSlash(options.backend || process.env.BACKEND_URL || "http://localhost:4000");
const startedAt = new Date();
const transcript = [];
const metrics = {
  startMs: 0,
  turnMs: [],
  questionAttempts: 0,
  uniqueQuestions: new Set(),
  scores: []
};

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  await assertBackendHealth();

  const startStartedAt = Date.now();
  const start = await postJson("/api/ai/chat/start", {
    userName: options.name,
    visaType: options.visa,
    mode: options.mode
  });
  metrics.startMs = Date.now() - startStartedAt;

  const interviewId = start.interviewId;
  let currentQuestion = start.currentQuestion || start.message;
  let status = "ACTIVE";

  recordAssistant(start.message, {
    currentQuestion,
    ms: metrics.startMs
  });

  for (let turn = 1; turn <= options.maxTurns; turn += 1) {
    if (status === "COMPLETED") break;

    metrics.questionAttempts += 1;
    metrics.uniqueQuestions.add(currentQuestion);
    const answer = buildAnswer({ visaType: options.visa, question: currentQuestion, turn });
    recordUser(answer, { question: currentQuestion });

    const turnStartedAt = Date.now();
    const response = await postJson(`/api/ai/chat/${encodeURIComponent(interviewId)}/message`, {
      message: answer
    });
    const turnMs = Date.now() - turnStartedAt;
    metrics.turnMs.push(turnMs);

    if (typeof response.score === "number") {
      metrics.scores.push(response.score);
    }

    recordAssistant(response.assistantMessage, {
      score: response.score,
      accepted: response.answerAccepted,
      shouldRepeatQuestion: response.shouldRepeatQuestion,
      nextQuestion: response.nextQuestion,
      nextAction: response.nextAction,
      ms: turnMs
    });

    status = response.status || (response.nextAction === "COMPLETE_INTERVIEW" ? "COMPLETED" : "ACTIVE");
    currentQuestion = response.nextQuestion || extractQuestionText(response.assistantMessage) || currentQuestion;

    if (status === "COMPLETED") break;
  }

  if (status !== "COMPLETED") {
    const completeStartedAt = Date.now();
    const complete = await postJson(`/api/ai/chat/${encodeURIComponent(interviewId)}/complete`, {});
    recordAssistant(complete.assistantMessage, {
      nextAction: complete.nextAction,
      ms: Date.now() - completeStartedAt
    });
    status = "COMPLETED";
  }

  const filePath = writeMarkdownReport({
    interviewId,
    status,
    startedAt,
    endedAt: new Date()
  });

  console.log(`Dry chat interview complete.`);
  console.log(`Questions attempted: ${metrics.questionAttempts}`);
  console.log(`Unique backend questions: ${metrics.uniqueQuestions.size}`);
  console.log(`Transcript file: ${filePath}`);
}

async function assertBackendHealth() {
  const response = await fetch(`${backendUrl}/health`);
  if (!response.ok) {
    throw new Error(`Backend health check failed at ${backendUrl}/health`);
  }
}

async function postJson(route, body) {
  const response = await fetch(`${backendUrl}${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error?.message || payload.message || `Request failed: ${route}`);
  }

  return payload.data ?? payload;
}

function buildAnswer({ visaType, question, turn }) {
  const normalizedQuestion = question.toLowerCase();
  const f1Answers = [
    {
      match: ["university", "school"],
      answer:
        "I chose this university because its computer science program has courses and projects that match my academic background and career plan. I compared it with other schools and this university has the best fit for my goals."
    },
    {
      match: ["program", "major"],
      answer:
        "I chose this program because it connects directly to my previous studies and the career role I want after graduation. The curriculum includes practical work that I can use when I return home."
    },
    {
      match: ["academic background", "previous education"],
      answer:
        "My academic background prepared me through related coursework, projects, and consistent study in this field. That foundation makes this program a logical next step."
    },
    {
      match: ["sponsor", "pay", "fund", "tuition"],
      answer:
        "My family sponsor will pay for my tuition and living expenses. We have bank statements, income documents, and a sponsor letter ready to support the funding plan."
    },
    {
      match: ["work"],
      answer:
        "My sponsor works in a stable professional job and has regular income. The sponsor's income and savings are enough to cover tuition, living costs, and travel expenses."
    },
    {
      match: ["study plan"],
      answer:
        "My study plan is to complete the required courses, focus on practical projects, and finish the degree on time. I will follow the program requirements listed by the university."
    },
    {
      match: ["career"],
      answer:
        "After graduation I plan to return home and work in my field in a role that uses this degree. The program will help me qualify for better positions in my home country."
    },
    {
      match: ["united states", "us"],
      answer:
        "I chose the United States because this program offers strong academic resources, practical learning, and international exposure that are not available in the same way locally."
    },
    {
      match: ["locally", "local"],
      answer:
        "I considered local options, but they did not offer the same curriculum, facilities, and practical focus. That is why this US program is a better academic fit."
    },
    {
      match: ["ties", "return", "home country"],
      answer:
        "I have strong ties to my home country, including my family, career plan, and long-term work goals. I plan to return after graduation and use the degree there."
    }
  ];

  const b1b2Answers = [
    {
      match: ["purpose", "trip"],
      answer:
        "The purpose of my trip is temporary tourism and visiting major attractions. I have a clear itinerary and I will return home after the visit."
    },
    {
      match: ["long", "stay"],
      answer:
        "I plan to stay for two weeks. The length of stay matches my travel plan, hotel booking, and approved leave from work."
    },
    {
      match: ["pay", "expenses", "financial"],
      answer:
        "I will pay for my travel and living expenses myself. I have savings, bank statements, and income documents to support the trip."
    },
    {
      match: ["work", "business", "employment"],
      answer:
        "I work in my home country and have approved leave for this temporary trip. My job is one of the main reasons I will return on time."
    },
    {
      match: ["stay", "accommodation", "where"],
      answer:
        "I will stay at a hotel during the trip. I have planned the accommodation according to the cities in my itinerary."
    },
    {
      match: ["travel", "international"],
      answer:
        "I have traveled internationally before and followed visa rules. My travel history shows that I return on time after temporary visits."
    },
    {
      match: ["family"],
      answer:
        "My family lives in my home country, and I have responsibilities there. These family ties are an important reason I will return."
    },
    {
      match: ["return"],
      answer:
        "I will return because my job, family, and long-term life are in my home country. My US visit is temporary and limited to my planned itinerary."
    }
  ];

  const bank = visaType === "B1_B2" ? b1b2Answers : f1Answers;
  const matched = bank.find((item) => item.match.some((word) => normalizedQuestion.includes(word)));
  return matched?.answer || `This is answer ${turn}. I will provide specific, consistent details and supporting documents for this visa interview question.`;
}

function extractQuestionText(message) {
  const text = String(message || "").trim();
  const matches = text.match(/[A-Z0-9][^?]{8,}\?/gi);
  return matches?.at(-1)?.trim() || text;
}

function recordAssistant(text, metadata = {}) {
  transcript.push({
    role: "assistant",
    text: text || "",
    metadata,
    timestamp: new Date().toISOString()
  });
}

function recordUser(text, metadata = {}) {
  transcript.push({
    role: "user",
    text,
    metadata,
    timestamp: new Date().toISOString()
  });
}

function writeMarkdownReport({ interviewId, status, startedAt, endedAt }) {
  const durationMs = endedAt.getTime() - startedAt.getTime();
  const averageTurnMs = metrics.turnMs.length
    ? Math.round(metrics.turnMs.reduce((sum, value) => sum + value, 0) / metrics.turnMs.length)
    : 0;
  const averageScore = metrics.scores.length
    ? Math.round(metrics.scores.reduce((sum, value) => sum + value, 0) / metrics.scores.length)
    : 0;
  const filename = `chat-interview-${interviewId}-${toFileTimestamp(startedAt)}.md`;
  const filePath = path.join(outputDir, filename);
  const markdown = [
    `# Dry Run Chat Interview`,
    "",
    `- Interview ID: \`${interviewId}\``,
    `- Status: \`${status}\``,
    `- Visa type: \`${options.visa}\``,
    `- Mode: \`${options.mode}\``,
    `- Applicant: \`${options.name}\``,
    `- Started: ${startedAt.toISOString()}`,
    `- Ended: ${endedAt.toISOString()}`,
    `- Duration: ${durationMs} ms`,
    `- Start request time: ${metrics.startMs} ms`,
    `- Average message request time: ${averageTurnMs} ms`,
    `- Question attempts: ${metrics.questionAttempts}`,
    `- Unique backend questions: ${metrics.uniqueQuestions.size}`,
    `- Average score: ${averageScore}/100`,
    "",
    `## Backend Questions`,
    "",
    ...[...metrics.uniqueQuestions].map((question, index) => `${index + 1}. ${question}`),
    "",
    `## Transcript`,
    "",
    ...transcript.flatMap(formatTranscriptEntry)
  ].join("\n");

  fs.writeFileSync(filePath, markdown, "utf8");
  return filePath;
}

function formatTranscriptEntry(entry, index) {
  const title = entry.role === "user" ? "Applicant" : "Officer Charles";
  const meta = Object.entries(entry.metadata || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
    .join("\n");

  return [
    `### ${index + 1}. ${title}`,
    "",
    entry.text,
    "",
    meta ? `<details><summary>Metadata</summary>\n\n${meta}\n\n</details>\n` : ""
  ];
}

function parseArgs(args) {
  const parsed = {
    name: "Adam",
    visa: "F1",
    mode: "TRAINING",
    backend: "http://localhost:4000",
    maxTurns: 30
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === "--name" && next) parsed.name = next;
    if (arg === "--visa" && next) parsed.visa = next.toUpperCase();
    if (arg === "--mode" && next) parsed.mode = next.toUpperCase();
    if (arg === "--backend" && next) parsed.backend = next;
    if (arg === "--max-turns" && next) parsed.maxTurns = Number(next);
  }

  if (!["F1", "B1_B2"].includes(parsed.visa)) {
    throw new Error("--visa must be F1 or B1_B2");
  }
  if (!["TRAINING", "SIMULATION"].includes(parsed.mode)) {
    throw new Error("--mode must be TRAINING or SIMULATION");
  }

  return parsed;
}

function toFileTimestamp(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

main().catch((error) => {
  console.error("Dry run failed:");
  console.error(error?.message || error);
  process.exitCode = 1;
});
