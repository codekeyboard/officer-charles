import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { stdin as input, stdout as output } from "node:process";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(currentDir, "..");
const env = {
  ...loadEnvFile(path.join(backendDir, ".env.example")),
  ...loadEnvFile(path.join(backendDir, ".env")),
  ...process.env
};
const pipedAnswers = await readPipedAnswers();

async function main() {
  printHeader();
  const settings = await loadFoundrySettings();
  const userName = await askRequired("Your name");
  const visaType = await askChoice("Visa type", ["F1", "B1_B2"], "F1");
  const mode = await askChoice("Mode", ["TRAINING", "SIMULATION"], "TRAINING");
  const conversationId = await createConversation(settings);
  const firstPrompt = [
    `You are Officer Charles, a professional US visa interview simulator.`,
    `Applicant name: ${userName}.`,
    `Visa type: ${visaType}.`,
    `Mode: ${mode}.`,
    "Ask one question at a time.",
    "Do not guarantee visa approval or denial.",
    "Begin the interview now with the first question."
  ].join("\n");

  const first = await sendToFoundryAgent(settings, {
    conversationId,
    input: firstPrompt
  });

  output.write(`\nOfficer Charles: ${first.outputText || "(No text returned)"}\n`);
  output.write("\nType your answer and press Enter. Type /done to request final evaluation or /exit to quit.\n\n");

  while (true) {
    const answer = (await ask("You: ")).trim();

    if (answer === "/exit") {
      output.write("Exiting Foundry interview.\n");
      return;
    }

    const inputText = answer === "/done"
      ? "Complete the interview now. Give a final evaluation with strengths, weaknesses, and improvement steps."
      : answer;

    const response = await sendToFoundryAgent(settings, {
      conversationId,
      input: inputText
    });

    output.write(`\nOfficer Charles: ${response.outputText || "(No text returned)"}\n\n`);

    if (answer === "/done") {
      return;
    }
  }
}

async function loadFoundrySettings() {
  const projectEndpoint = trimTrailingSlash(env.AZURE_FOUNDRY_PROJECT_ENDPOINT);
  const agentName = env.AZURE_FOUNDRY_AGENT_NAME;
  const agentId = env.AZURE_FOUNDRY_AGENT_ID;
  const token = env.AZURE_AI_AUTH_TOKEN || await getServicePrincipalAccessToken() || getAzureCliAccessToken();

  if (!projectEndpoint) {
    throw new Error("Missing AZURE_FOUNDRY_PROJECT_ENDPOINT in backend/.env or backend/.env.example.");
  }
  if (!agentName) {
    throw new Error("Missing AZURE_FOUNDRY_AGENT_NAME. The Foundry Responses API agent_reference uses the agent name.");
  }
  if (!token) {
    throw new Error([
      "Missing Azure auth token.",
      "Option 1, install Azure CLI and run:",
      "az login",
      "Option 2, fill AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET.",
      "Option 3, paste a temporary token into AZURE_AI_AUTH_TOKEN."
    ].join("\n"));
  }

  output.write(`Foundry project: ${projectEndpoint}\n`);
  output.write(`Foundry agent: ${agentName}${agentId ? ` (${agentId})` : ""}\n`);

  return {
    projectEndpoint,
    agentName,
    token
  };
}

async function createConversation(settings) {
  const response = await foundryFetch(settings, "/openai/v1/conversations", {
    method: "POST",
    body: {
      items: []
    }
  });

  if (!response.id) {
    throw new Error(`Foundry did not return a conversation ID. Raw response: ${JSON.stringify(response)}`);
  }

  return response.id;
}

async function sendToFoundryAgent(settings, { conversationId, input }) {
  const response = await foundryFetch(settings, "/openai/v1/responses", {
    method: "POST",
    body: {
      agent_reference: {
        type: "agent_reference",
        name: settings.agentName
      },
      conversation: conversationId,
      input
    }
  });

  return {
    id: response.id || null,
    outputText: extractOutputText(response),
    raw: response
  };
}

async function foundryFetch(settings, route, { method, body }) {
  const response = await fetch(`${settings.projectEndpoint}${route}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || payload.message || `Foundry request failed with ${response.status}`;
    throw new Error(`${message}\n\nRaw response: ${JSON.stringify(payload, null, 2)}`);
  }

  return payload;
}

function extractOutputText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  if (!Array.isArray(response.output)) return "";

  return response.output
    .flatMap((item) => item.content || [])
    .map((content) => content.text || content.value || "")
    .filter(Boolean)
    .join("\n");
}

function getAzureCliAccessToken() {
  try {
    return execFileSync("az", [
      "account",
      "get-access-token",
      "--scope",
      "https://ai.azure.com/.default",
      "--query",
      "accessToken",
      "-o",
      "tsv"
    ], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

async function getServicePrincipalAccessToken() {
  if (!env.AZURE_TENANT_ID || !env.AZURE_CLIENT_ID || !env.AZURE_CLIENT_SECRET) {
    return "";
  }

  const tokenUrl = `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: env.AZURE_CLIENT_ID,
    client_secret: env.AZURE_CLIENT_SECRET,
    grant_type: "client_credentials",
    scope: "https://ai.azure.com/.default"
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.access_token) {
    throw new Error(`Service principal token request failed: ${payload.error_description || payload.error || response.status}`);
  }

  return payload.access_token;
}

function printHeader() {
  output.write("Officer Charles Foundry Agent Terminal Test\n");
  output.write("-------------------------------------------\n");
  output.write("This talks to your Azure AI Foundry Agent through the project endpoint.\n");
  output.write("You need Azure CLI login or AZURE_AI_AUTH_TOKEN.\n\n");
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

  input.resume();
  return new Promise((resolve) => {
    input.once("data", (chunk) => resolve(String(chunk).replace(/\r?\n$/, "")));
  });
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

async function readPipedAnswers() {
  if (input.isTTY) return [];

  const chunks = [];
  for await (const chunk of input) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks)
    .toString("utf8")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

main().catch((error) => {
  console.error("\nFoundry terminal test failed:");
  console.error(error?.message || error);
  process.exitCode = 1;
});
