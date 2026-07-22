import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stdin as input, stdout as output } from "node:process";
import { ChatInterviewAgent } from "../src/utils/classes/ChatInterviewAgent.js";
import { INTERVIEW_MODES } from "../src/constants/interviewModes.js";
import { VISA_TYPES } from "../src/constants/visaTypes.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(currentDir, "..");
const env = loadEnvFile(path.join(backendDir, ".env"));
const pipedAnswers = await readPipedAnswers();

const silentLogger = {
  info() {},
  warn() {},
  error() {},
  debug() {}
};

async function main() {
  printHeader();

  const userName = await askRequired("Your name");
  const visaType = await askChoice("Visa type", [VISA_TYPES.F1, VISA_TYPES.B1_B2], VISA_TYPES.F1);
  const mode = await askChoice("Mode", [INTERVIEW_MODES.TRAINING, INTERVIEW_MODES.SIMULATION], INTERVIEW_MODES.TRAINING);
  const useAzure = String(env.USE_AZURE_RESPONSES || "").toLowerCase() === "true";
  const aiClient = useAzure ? createAzureResponsesClient(env) : createLocalOnlyAiClient();
  const agent = new ChatInterviewAgent({
    aiClient,
    logger: silentLogger,
    maxRetryCount: Number(env.TRAINING_MAX_RETRIES_PER_QUESTION || 3)
  });

  const started = await agent.startInterview(
    { id: "terminal-user", name: userName },
    {
      userName,
      visaType,
      mode,
      interviewId: `terminal-${Date.now()}`
    }
  );

  let session = started.session;
  output.write(`\nOfficer Charles: ${started.message}\n`);
  output.write("\nType your answer and press Enter. Type /done to finish or /exit to quit.\n\n");

  while (true) {
    const answer = await ask("You: ");
    const trimmedAnswer = answer.trim();

    if (trimmedAnswer === "/exit") {
      output.write("Exiting interview.\n");
      break;
    }

    if (trimmedAnswer === "/done") {
      const completed = await agent.completeInterview(session);
      output.write(`\nOfficer Charles: ${completed.assistantMessage}\n\n`);
      break;
    }

    if (!trimmedAnswer) {
      output.write("Please type an answer, /done, or /exit.\n");
      continue;
    }

    const response = await agent.sendUserAnswer(session, trimmedAnswer);
    session = agent.sessionManager.getSession(session.id) || session;

    if (response.status === "COMPLETED" || response.nextAction === "COMPLETE_INTERVIEW") {
      output.write(`\nOfficer Charles: ${response.assistantMessage}\n\n`);
      break;
    }

    output.write(`\nOfficer Charles: ${response.assistantMessage}\n`);
    if (mode === INTERVIEW_MODES.TRAINING) {
      output.write(`Score: ${response.score}/100\n`);
      output.write(`Accepted: ${response.answerAccepted ? "yes" : "no"}\n`);
    }
    output.write("\n");
  }
}

function printHeader() {
  output.write("Officer Charles Terminal Chat Interview\n");
  output.write("---------------------------------------\n");
  output.write("Local mode works without Azure.\n");
  output.write("Set USE_AZURE_RESPONSES=true in backend/.env to try Azure Responses wording.\n\n");
}

async function askRequired(label) {
  while (true) {
    const value = (await ask(`${label}: `)).trim();
    if (value) return value;
    output.write(`${label} is required.\n`);
  }
}

async function askChoice(label, choices, fallback) {
  const value = (await ask(`${label} (${choices.join("/")} default ${fallback}): `)).trim().toUpperCase();
  return choices.includes(value) ? value : fallback;
}

async function ask(question) {
  output.write(question);
  if (pipedAnswers.length > 0) {
    const answer = pipedAnswers.shift();
    output.write(`${answer}\n`);
    return answer;
  }

  return new Promise((resolve) => {
    input.once("data", (chunk) => resolve(String(chunk).replace(/\r?\n$/, "")));
  });
}

function createLocalOnlyAiClient() {
  return {
    async createJsonResponse() {
      return {
        id: "local-only",
        provider: "local",
        model: "local-scoring",
        outputText: "",
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0
        }
      };
    }
  };
}

function createAzureResponsesClient(envValues) {
  const endpoint = trimTrailingSlash(envValues.AZURE_OPENAI_ENDPOINT);
  const apiKey = envValues.AZURE_OPENAI_API_KEY;
  const model = envValues.AZURE_CHAT_MODEL_DEPLOYMENT || envValues.DEFAULT_CHAT_MODEL;

  if (!endpoint || !apiKey || !model) {
    console.log("USE_AZURE_RESPONSES=true, but Azure OpenAI env values are missing.");
    console.log("Falling back to local-only interview wording.\n");
    return createLocalOnlyAiClient();
  }

  return {
    async createJsonResponse(input, options = {}) {
      const response = await fetch(`${endpoint}/openai/v1/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey
        },
        body: JSON.stringify({
          model,
          input,
          instructions: options.instructions || "Return valid JSON only for the interview assistant response.",
          metadata: options.metadata
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          id: null,
          provider: "azure_openai_responses",
          model,
          outputText: JSON.stringify({
            assistantMessage: payload.error?.message || "Azure request failed. Using local fallback."
          }),
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          raw: payload
        };
      }

      return {
        id: payload.id || null,
        provider: "azure_openai_responses",
        model: payload.model || model,
        outputText: extractOutputText(payload),
        usage: extractUsage(payload),
        raw: payload
      };
    }
  };
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  if (!Array.isArray(payload.output)) return "";

  return payload.output
    .flatMap((item) => item.content || [])
    .map((content) => content.text || content.value || "")
    .filter(Boolean)
    .join("\n");
}

function extractUsage(payload) {
  const usage = payload.usage || {};
  const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage.total_tokens ?? inputTokens + outputTokens
  };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex === -1) return [line, ""];
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
        return [key, value];
      })
  );
}

function trimTrailingSlash(value = "") {
  return value.replace(/\/+$/, "");
}

main()
  .catch((error) => {
    console.error("\nExample failed:");
    console.error(error?.publicMessage || error?.message || error);
    process.exitCode = 1;
  });

async function readPipedAnswers() {
  if (input.isTTY) {
    input.resume();
    return [];
  }

  const chunks = [];
  for await (const chunk of input) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks)
    .toString("utf8")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}
