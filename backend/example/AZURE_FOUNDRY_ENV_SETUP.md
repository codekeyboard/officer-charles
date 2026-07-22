# Azure Foundry Environment Setup

This guide explains where to find the values for `backend/.env` so the AI interview module can use Microsoft Foundry, Azure OpenAI Responses, Realtime WebRTC, and Voice Live.

## 1. Run The Terminal Example Locally First

From the repo root:

```bash
node backend/example/chatinterview.js
```

This works without Azure. It uses the local interview flow and deterministic scoring.

There is also a typo-compatible alias:

```bash
node backend/example/cahtinterview.js
```

To test your actual Foundry Agent from the terminal:

```bash
az login
node backend/example/foundryChatInterview.js
```

The Foundry test script reads `backend/.env` first and then falls back to `backend/.env.example`.

If `az: command not found`, install Azure CLI or use the service-principal fallback.

Ubuntu/Linux quick install:

```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
az login
```

If Azure CLI login does not work, manually create a temporary token after installing Azure CLI:

```bash
az account get-access-token --scope https://ai.azure.com/.default --query accessToken -o tsv
```

Then put it in:

```env
AZURE_AI_AUTH_TOKEN=<paste-token-here>
```

No Azure CLI option:

```env
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-app-client-id>
AZURE_CLIENT_SECRET=<your-app-client-secret>
```

The app registration/service principal must have access to the Foundry project/resource.

To try Azure Responses wording later, create `backend/.env`, fill the values below, and add:

```env
USE_AZURE_RESPONSES=true
```

## 2. Create `backend/.env`

Start from:

```bash
cp backend/.env.example backend/.env
```

Never commit `backend/.env`.

## 3. Foundry Project Values

Open Microsoft Foundry / Azure AI Foundry, create or open your project, then use the project overview and agent pages.

```env
AZURE_FOUNDRY_PROJECT_ENDPOINT=
AZURE_FOUNDRY_AGENT_NAME=
AZURE_FOUNDRY_AGENT_ID=
AZURE_FOUNDRY_RESOURCE_NAME=
AZURE_FOUNDRY_PROJECT_NAME=
```

What to copy:

- `AZURE_FOUNDRY_PROJECT_ENDPOINT`: project endpoint from the Foundry project overview. It usually looks like `https://<resource>.services.ai.azure.com/api/projects/<project-name>`.
- `AZURE_FOUNDRY_RESOURCE_NAME`: Azure AI Foundry / AI services resource name.
- `AZURE_FOUNDRY_PROJECT_NAME`: project name shown in Foundry.
- `AZURE_FOUNDRY_AGENT_NAME`: agent display/name from the Agents area.
- `AZURE_FOUNDRY_AGENT_ID`: agent ID from the agent details page.

## 4. Azure OpenAI Responses API Values

Create or open an Azure OpenAI resource, deploy a chat-capable model, and copy:

```env
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
AZURE_OPENAI_API_KEY=<key-from-resource-keys-and-endpoint>
AZURE_OPENAI_API_VERSION=2025-04-01-preview
AZURE_CHAT_MODEL_DEPLOYMENT=<your-chat-deployment-name>
DEFAULT_CHAT_MODEL=<same-as-chat-deployment-for-now>
```

Important:

- Use the **deployment name**, not only the model family name.
- The current Responses API uses the v1 path: `/openai/v1/responses`.
- Keep `AZURE_OPENAI_API_VERSION` because some SDK/API surfaces still need version config, even though the v1 Responses path does not use `api-version` in this example.

## 5. Realtime WebRTC Values

Deploy a supported realtime model in Azure OpenAI, then set:

```env
ENABLE_REALTIME_WEBRTC=true
AZURE_REALTIME_MODEL_DEPLOYMENT=<your-gpt-realtime-deployment-name>
DEFAULT_REALTIME_MODEL=<same-as-realtime-deployment-for-now>
```

The backend creates short-lived client secrets through:

```text
POST https://<your-resource>.openai.azure.com/openai/v1/realtime/client_secrets
```

The browser later connects to:

```text
https://<your-resource>.openai.azure.com/openai/v1/realtime/calls
```

Do not send `AZURE_OPENAI_API_KEY` to React. The backend should return only an ephemeral token.

## 6. Voice Live Values

In Foundry, open the Speech / Voice Live experience or Voice Live resource setup, choose a model and voice, then set:

```env
ENABLE_VOICE_LIVE=true
AZURE_VOICE_LIVE_ENDPOINT=
AZURE_VOICE_LIVE_API_KEY=
AZURE_VOICE_LIVE_API_VERSION=2026-06-01-preview
AZURE_VOICE_LIVE_MODEL=gpt-realtime
DEFAULT_VOICE_NAME=alloy
```

Notes:

- Voice Live supports realtime speech-to-speech sessions and WebRTC.
- Voice, avatar, turn detection, noise reduction, and echo cancellation are configured in the session config.
- Exact Voice Live temporary session/token endpoints may change by SDK/API version, so keep that logic isolated in `SecureTokenService.js`.

## 7. App, Auth, Limits, And Database Values

For local development:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://placeholder
JWT_ACCESS_SECRET=local-access-secret
JWT_REFRESH_SECRET=local-refresh-secret

AI_PROVIDER=azure
ENABLE_AGENT_JSON_MODE=true

FREE_CHAT_INTERVIEW_LIMIT=1
FREE_LIVE_INTERVIEW_LIMIT=1
TRAINING_MAX_RETRIES_PER_QUESTION=3
TRAINING_MAX_QUESTIONS=8
SIMULATION_MAX_QUESTIONS=10
```

For production:

- Replace stub auth with real JWT/session auth.
- Use PostgreSQL for sessions, messages, scores, transcript, and usage logs.
- Prefer Microsoft Entra ID / managed identity instead of API keys where possible.

## 8. Optional Entra ID Credentials

For local service-principal auth:

```env
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
```

If these are present, the backend config treats auth mode as `servicePrincipal`. In Azure hosting, prefer managed identity.

## 9. Minimal `.env` For The Terminal Chat Example With Azure Responses

```env
USE_AZURE_RESPONSES=true
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
AZURE_OPENAI_API_KEY=<your-key>
AZURE_CHAT_MODEL_DEPLOYMENT=<your-chat-deployment-name>
TRAINING_MAX_RETRIES_PER_QUESTION=3
```

Then run:

```bash
node backend/example/chatinterview.js
```

## Official Microsoft Docs

- Foundry Agent Service overview: https://learn.microsoft.com/en-us/azure/foundry/agents/overview
- Microsoft Foundry SDKs and endpoints: https://learn.microsoft.com/en-us/azure/foundry/how-to/develop/sdk-overview
- Azure AI Projects JavaScript SDK: https://learn.microsoft.com/en-us/javascript/api/overview/azure/ai-projects-readme
- Azure OpenAI Responses API: https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses
- Azure OpenAI Realtime WebRTC: https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/realtime-audio-webrtc
- Voice Live overview: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live
- Voice Live WebRTC: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live-webrtc
- Voice Live API reference: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live-api-reference-2025-10-01
