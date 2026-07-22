

```txt
/api/v1
```

Your backend stack:

```txt
React Frontend
→ Express.js Backend
→ PostgreSQL
→ Microsoft Azure AI Foundry / Azure OpenAI / Voice Live
```

Important: your **React frontend should call only your Express backend endpoints**. It should not directly use Azure API keys. Microsoft’s Voice Live docs also note that browser WebSocket connections cannot use `api-key` as a connection header; API key in browser must be query-string based, but for your production app, keep Azure auth behind backend whenever possible. ([Microsoft Learn][1])

---

# 1. Backend Route Groups

```txt
/api/v1/health
/api/v1/auth
/api/v1/users
/api/v1/interviews
/api/v1/live-interviews
/api/v1/plans
/api/v1/billing
/api/v1/admin
/api/v1/ai
/api/v1/webhooks
```

Recommended backend folders:

```txt
src/
  modules/
    health/
    auth/
    users/
    interviews/
    liveInterview/
    billing/
    admin/
    ai/
    webhooks/
```

---

# 2. Standard Response Format

Every endpoint should return the same response shape:

```json
{
  "success": true,
  "message": "Request completed successfully.",
  "data": {}
}
```

For errors:

```json
{
  "success": false,
  "message": "Quota exceeded.",
  "errorCode": "QUOTA_EXCEEDED"
}
```

---

# 3. Health / System Endpoints

## 3.1 `GET /api/v1/health`

### Purpose

Checks if backend is running.

### Auth

No auth required.

### Working in code

Controller calls a simple service that returns app status, uptime, environment, and timestamp.

### Response

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "officer-charles-backend",
    "env": "development",
    "uptime": 12345
  }
}
```

---

## 3.2 `GET /api/v1/health/ai`

### Purpose

Checks if Azure AI Foundry / Azure OpenAI config is available.

### Auth

Admin only.

### Working in code

Backend checks:

```txt
AZURE_FOUNDRY_PROJECT_ENDPOINT
AZURE_FOUNDRY_AGENT_ID
AZURE_CHAT_MODEL_DEPLOYMENT
AZURE_REALTIME_MODEL_DEPLOYMENT
AZURE_VOICE_LIVE_ENDPOINT
```

Then it may call:

```txt
AzureFoundryClient.healthCheck()
AzureResponsesClient.healthCheck()
VoiceLiveClient.healthCheck()
```

### Response

```json
{
  "success": true,
  "data": {
    "foundryConfigured": true,
    "chatModelConfigured": true,
    "voiceLiveConfigured": true,
    "realtimeConfigured": true
  }
}
```

---

# 4. Auth Endpoints

These handle user login, register, Google login, logout, and session.

---

## 4.1 `POST /api/v1/auth/register`

### Purpose

Creates a user account using email/password.

### Auth

Public.

### Request

```json
{
  "name": "Adam",
  "email": "adam@example.com",
  "password": "Password123!"
}
```

### Working in code

```txt
auth.controller.register()
→ auth.service.register()
→ validate name/email/password
→ check if email exists
→ hash password using bcrypt
→ insert user into users table
→ create default profile
→ create free usage quota
→ generate access token + refresh token
→ save hashed refresh token
→ set HttpOnly cookie
→ return user
```

### Database work

Tables used:

```txt
users
user_profiles
user_usage
refresh_tokens
```

### Response

```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Adam",
      "email": "adam@example.com",
      "role": "user"
    }
  }
}
```

---

## 4.2 `POST /api/v1/auth/login`

### Purpose

Logs in user using email/password.

### Auth

Public.

### Request

```json
{
  "email": "adam@example.com",
  "password": "Password123!"
}
```

### Working in code

```txt
auth.controller.login()
→ auth.service.login()
→ find user by email
→ compare password with bcrypt
→ check user status is active
→ create access token
→ create refresh token
→ save hashed refresh token
→ set HttpOnly cookie
→ return user
```

---

## 4.3 `GET /api/v1/auth/google`

### Purpose

Starts Google OAuth login.

### Auth

Public.

### Working in code

```txt
Frontend redirects user to this endpoint
→ passport-google-oauth20 starts Google login
→ Google asks user permission
→ Google redirects to callback endpoint
```

---

## 4.4 `GET /api/v1/auth/google/callback`

### Purpose

Handles Google OAuth callback.

### Auth

Public.

### Working in code

```txt
Google returns profile
→ backend checks google_id or email
→ if user exists, login
→ if user does not exist, create user
→ create profile
→ create free quota
→ issue access + refresh token
→ redirect to frontend dashboard
```

---

## 4.5 `POST /api/v1/auth/refresh`

### Purpose

Creates new access token using refresh token.

### Auth

Refresh cookie required.

### Working in code

```txt
read refresh token from HttpOnly cookie
→ verify token
→ check hashed token in DB
→ rotate refresh token
→ issue new access token
→ update cookie
```

---

## 4.6 `POST /api/v1/auth/logout`

### Purpose

Logs user out.

### Auth

User required.

### Working in code

```txt
delete refresh token from DB
→ clear auth cookie
→ return success
```

---

## 4.7 `GET /api/v1/auth/me`

### Purpose

Returns currently logged-in user.

### Auth

User required.

### Working in code

```txt
requireAuth middleware verifies JWT
→ load user from DB
→ return user profile
```

---

# 5. User Profile Endpoints

---

## 5.1 `GET /api/v1/users/me`

### Purpose

Returns logged-in user profile.

### Auth

User required.

### Working in code

```txt
users.controller.getMe()
→ users.service.getProfile(user.id)
→ query users + user_profiles
→ return profile
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Adam",
    "email": "adam@example.com",
    "country": "Pakistan",
    "targetVisa": "F1"
  }
}
```

---

## 5.2 `PATCH /api/v1/users/me`

### Purpose

Updates profile settings.

### Auth

User required.

### Request

```json
{
  "name": "Adam Smith",
  "country": "Pakistan",
  "targetVisa": "F1"
}
```

### Working in code

```txt
validate input
→ update users.name if provided
→ update user_profiles
→ return updated profile
```

Important because the AI uses `user.name` when starting interview:

```txt
Hello Adam, let’s begin your F1 interview.
```

---

## 5.3 `GET /api/v1/users/me/usage`

### Purpose

Shows user interview usage.

### Auth

User required.

### Working in code

```txt
users.service.getUsage()
→ count completed chat interviews
→ count completed live interviews
→ get free quota
→ get active subscription quota
→ return remaining usage
```

### Response

```json
{
  "success": true,
  "data": {
    "freeChatLimit": 1,
    "freeLiveLimit": 1,
    "usedChat": 1,
    "usedLive": 0,
    "remainingChat": 0,
    "remainingLive": 1,
    "subscription": {
      "plan": "Starter",
      "chatRemaining": 5,
      "liveRemaining": 0
    }
  }
}
```

---

## 5.4 `GET /api/v1/users/me/interviews`

### Purpose

Returns interview history for user.

### Auth

User required.

### Query params

```txt
?type=chat
?type=live
?visaType=F1
?status=completed
```

### Working in code

```txt
query interviews table by user_id
→ include visaType, mode, score, startedAt, endedAt
→ return paginated list
```

---

# 6. Chat Interview Endpoints

These are for the **text-based interview**.

---

## 6.1 `POST /api/v1/interviews/chat/start`

### Purpose

Starts a new chat interview.

### Auth

User required.

### Request

```json
{
  "visaType": "F1",
  "mode": "TRAINING"
}
```

Allowed values:

```txt
visaType: B1_B2, F1
mode: TRAINING, SIMULATION
```

### Working in code

```txt
interview.controller.startChatInterview()
→ validate visaType and mode
→ load user profile
→ QuotaChecker.checkChatQuota(user.id)
→ create interview session in PostgreSQL
→ InterviewPromptBuilder builds system prompt
→ InterviewQuestionManager selects first question
→ ChatInterviewAgent.startInterview()
→ AzureResponsesClient or FoundryAgentClient sends first prompt
→ save assistant first message
→ decrement or reserve chat quota
→ return first question to frontend
```

### Classes used

```txt
ChatInterviewAgent
InterviewSessionManager
InterviewPromptBuilder
InterviewQuestionManager
QuotaChecker
AzureResponsesClient or FoundryAgentClient
UsageTracker
```

### Database work

Insert into:

```txt
interviews
interview_messages
usage_logs
```

### Azure integration

For chat, backend can use either:

```txt
Microsoft Foundry Agent Service
or
Azure OpenAI Responses API
```

Microsoft’s Foundry SDK quickstart shows backend code connecting through the Foundry project endpoint and agent name, using `AIProjectClient` with `DefaultAzureCredential`. ([Microsoft Learn][2])

### Response

```json
{
  "success": true,
  "data": {
    "interviewId": "uuid",
    "interviewType": "CHAT",
    "visaType": "F1",
    "mode": "TRAINING",
    "message": "Hello Adam, let's begin your F1 student visa interview. Why did you choose this university?",
    "currentQuestion": "Why did you choose this university?"
  }
}
```

---

## 6.2 `POST /api/v1/interviews/chat/:interviewId/message`

### Purpose

Sends user answer to the chat interview agent.

### Auth

User required.

### Request

```json
{
  "message": "I chose this university because it has a strong computer science program and good research opportunities."
}
```

### Working in code

```txt
validate interviewId
→ validate message
→ load interview from DB
→ check interview belongs to user
→ check interview is active
→ save user message
→ load previous messages/context
→ ChatInterviewAgent.sendUserAnswer()
→ build prompt with user answer, current question, visa type, mode
→ call Azure Foundry / Responses API
→ parse AI JSON with AgentResponseParser
→ score answer
→ apply InterviewModePolicy
```

### Training mode logic

```txt
If answer is accepted:
  save score
  select next question
  return feedback + score + next question

If answer is weak:
  increment retry count
  return feedback
  ask same question again

If retry limit reached:
  move to next question or complete interview
```

### Simulation mode logic

```txt
If answer is relevant:
  save internally
  do not show score
  ask next question

If answer is off-topic:
  ask same question again

At end:
  final evaluation only
```

### Classes used

```txt
ChatInterviewAgent
InterviewScoringEngine
InterviewModePolicy
AgentResponseParser
InterviewQuestionManager
UsageTracker
```

### Response in training mode

```json
{
  "success": true,
  "data": {
    "assistantMessage": "Good answer. You clearly explained your university choice, but you should also mention how this program connects to your career plan.",
    "answerAccepted": true,
    "score": 82,
    "feedback": {
      "good": "Clear university reason.",
      "weak": "Career connection needs more detail.",
      "improvement": "Mention your future job plan after graduation."
    },
    "shouldRepeatQuestion": false,
    "nextQuestion": "Who will sponsor your studies?"
  }
}
```

### Response in simulation mode

```json
{
  "success": true,
  "data": {
    "assistantMessage": "Who will sponsor your studies?",
    "answerAccepted": true,
    "scoreVisible": false
  }
}
```

---

## 6.3 `POST /api/v1/interviews/chat/:interviewId/complete`

### Purpose

Completes chat interview and generates final evaluation.

### Auth

User required.

### Working in code

```txt
load interview
→ verify owner
→ get all questions, answers, scores, messages
→ InterviewEvaluationEngine.generateFinalEvaluation()
→ optional final call to Azure for natural evaluation
→ save final score, strengths, weaknesses, feedback
→ mark interview as completed
→ return final evaluation
```

### Database work

Update:

```txt
interviews.final_score
interviews.final_feedback
interviews.strengths
interviews.weaknesses
interviews.status = completed
interviews.ended_at
```

### Response

```json
{
  "success": true,
  "data": {
    "finalScore": 84,
    "result": "Good readiness",
    "strengths": [
      "Clear study purpose",
      "Good sponsor explanation"
    ],
    "weaknesses": [
      "Needs stronger home country ties",
      "Some answers were too short"
    ],
    "recommendations": [
      "Prepare clearer post-graduation plan.",
      "Practice explaining why you will return home."
    ]
  }
}
```

---

## 6.4 `GET /api/v1/interviews/:interviewId`

### Purpose

Gets interview summary.

### Auth

User or admin.

### Working in code

```txt
load interview by ID
→ if normal user, verify owner
→ if admin, allow access
→ return summary
```

---

## 6.5 `GET /api/v1/interviews/:interviewId/messages`

### Purpose

Gets full chat transcript/messages.

### Auth

User or admin.

### Working in code

```txt
load interview
→ verify access
→ query interview_messages
→ order by created_at
→ return messages
```

---

## 6.6 `GET /api/v1/interviews/:interviewId/evaluation`

### Purpose

Gets final evaluation.

### Auth

User or admin.

### Working in code

```txt
load interview
→ verify access
→ return final score, feedback, strengths, weaknesses, question scores
```

---

# 7. Live Interview Endpoints

These are for the **voice/avatar interview**.

You have two live paths:

```txt
1. Azure OpenAI Realtime WebRTC
2. Azure Voice Live WebRTC / Voice Live WebSocket
```

Microsoft recommends Voice Live WebRTC for real-time audio in client-side apps like web or mobile applications. ([Microsoft Learn][1])

---

## 7.1 `POST /api/v1/live-interviews/start`

### Purpose

Starts a live voice interview session.

### Auth

User required.

### Request

```json
{
  "visaType": "B1_B2",
  "mode": "SIMULATION",
  "provider": "VOICE_LIVE",
  "enableAvatar": true
}
```

Allowed providers:

```txt
VOICE_LIVE
AZURE_REALTIME
```

### Working in code

```txt
liveInterview.controller.startLiveInterview()
→ validate visaType, mode, provider
→ load user profile
→ QuotaChecker.checkLiveQuota(user.id)
→ create interview record
→ create live_interview_sessions record
→ LiveInterviewAgent.createLiveSession()
→ build realtime instructions
→ if provider = VOICE_LIVE:
     VoiceLiveClient.createSessionConfig()
     SecureTokenService.createVoiceLiveTemporarySession()
→ if provider = AZURE_REALTIME:
     RealtimeWebRTCSession.createSession()
     SecureTokenService.createRealtimeEphemeralToken()
→ return safe frontend connection info
```

### Classes used

```txt
LiveInterviewAgent
VoiceLiveClient
RealtimeWebRTCSession
SecureTokenService
InterviewPromptBuilder
TranscriptManager
QuotaChecker
UsageTracker
```

### Database work

Insert into:

```txt
interviews
live_interview_sessions
usage_logs
```

### Response

```json
{
  "success": true,
  "data": {
    "interviewId": "uuid",
    "sessionId": "uuid",
    "provider": "VOICE_LIVE",
    "mode": "SIMULATION",
    "visaType": "B1_B2",
    "connectionInfo": {
      "connectionType": "webrtc",
      "expiresAt": "2026-07-12T18:00:00.000Z"
    },
    "sessionConfig": {
      "voice": "en-US-AvaNeural",
      "avatarEnabled": true
    }
  }
}
```

---

## 7.2 `POST /api/v1/live-interviews/:sessionId/token`

### Purpose

Creates temporary live session token or client secret.

### Auth

User required.

### Request

```json
{
  "provider": "AZURE_REALTIME"
}
```

### Working in code

```txt
verify session belongs to user
→ verify session is active
→ SecureTokenService creates temporary credential
→ for Azure Realtime:
     call /openai/v1/realtime/client_secrets
→ for Voice Live:
     create safe temporary session config
→ return short-lived connection data
```

### Azure integration

For Azure OpenAI realtime WebRTC, Microsoft’s current GA flow uses:

```txt
/openai/v1/realtime/client_secrets
/openai/v1/realtime/calls
```

The client secret endpoint is used to create a short-lived session credential, and the calls endpoint is used by the WebRTC client connection. ([Microsoft Learn][3])

### Response

```json
{
  "success": true,
  "data": {
    "clientSecret": "short_lived_secret_or_token",
    "expiresAt": "2026-07-12T18:00:00.000Z"
  }
}
```

Important: return **only short-lived token/client secret**, never your permanent Azure API key.

---

## 7.3 `POST /api/v1/live-interviews/:sessionId/config`

### Purpose

Returns live session config for frontend.

### Auth

User required.

### Working in code

```txt
load live session
→ verify user owns session
→ load interview visaType/mode
→ build frontend-safe config
→ return provider, voice, avatar flag, endpoint metadata
```

### Response

```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "provider": "VOICE_LIVE",
    "voice": "en-US-AvaNeural",
    "avatarEnabled": true,
    "turnDetection": "azure_semantic_vad",
    "inputAudioSamplingRate": 24000
  }
}
```

---

## 7.4 `POST /api/v1/live-interviews/:sessionId/transcript`

### Purpose

Stores transcript chunks from live interview.

### Auth

User required.

### Request

```json
{
  "speaker": "user",
  "text": "I want to visit the United States for tourism.",
  "timestampMs": 12345,
  "isFinal": true
}
```

### Working in code

```txt
verify session
→ normalize transcript
→ TranscriptManager.addTranscript()
→ save transcript to DB
→ if final user transcript:
     optionally send to scoring/evaluation engine
→ return success
```

### Database work

Insert into:

```txt
live_transcripts
interview_messages
```

---

## 7.5 `POST /api/v1/live-interviews/:sessionId/event`

### Purpose

Stores realtime/Voice Live events.

### Auth

User required.

### Request

```json
{
  "eventType": "response.done",
  "payload": {}
}
```

### Working in code

```txt
verify session
→ sanitize event payload
→ save important event to ai_event_logs
→ update usage if event includes token/audio metadata
→ ignore noisy events if not needed
```

### Examples of events

```txt
session.created
session.updated
input_audio_buffer.speech_started
input_audio_buffer.speech_stopped
conversation.item.input_audio_transcription.completed
response.audio.delta
response.done
response.animation_viseme.delta
```

Voice Live supports session events and Voice Live-specific features such as voice output, audio timestamps, and viseme/animation output for lip sync. ([Microsoft Learn][1])

---

## 7.6 `POST /api/v1/live-interviews/:sessionId/complete`

### Purpose

Completes live interview and creates final evaluation.

### Auth

User required.

### Working in code

```txt
verify session belongs to user
→ load transcript
→ LiveInterviewAgent.completeLiveInterview()
→ InterviewEvaluationEngine.generateFinalEvaluation()
→ save final evaluation
→ update live session ended_at
→ update interview status to completed
→ decrement/consume live quota
→ return final evaluation
```

### Response

```json
{
  "success": true,
  "data": {
    "finalScore": 78,
    "result": "Needs improvement",
    "strengths": [
      "Answered travel purpose clearly."
    ],
    "weaknesses": [
      "Financial explanation was incomplete.",
      "Home country ties were weak."
    ],
    "recommendations": [
      "Prepare stronger employment and family-ties explanation."
    ]
  }
}
```

---

## 7.7 `GET /api/v1/live-interviews/:sessionId/status`

### Purpose

Checks live interview status.

### Auth

User required.

### Working in code

```txt
load session
→ verify owner
→ return connection status, startedAt, endedAt, duration, transcript count
```

### Response

```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "status": "active",
    "connectionStatus": "connected",
    "startedAt": "2026-07-12T17:00:00.000Z",
    "durationSeconds": 188
  }
}
```

---

# 8. AI Internal Endpoints

These are optional but useful for debugging/testing the AI module.

---

## 8.1 `POST /api/v1/ai/chat/test`

### Purpose

Tests chat model / Foundry Agent connection.

### Auth

Admin only.

### Request

```json
{
  "message": "Ask me one F1 visa question."
}
```

### Working in code

```txt
admin sends test message
→ AzureResponsesClient.createResponse()
→ or FoundryAgentClient.sendMessage()
→ return raw normalized AI output
```

---

## 8.2 `POST /api/v1/ai/foundry-agent/test`

### Purpose

Tests your configured Foundry Agent.

### Auth

Admin only.

### Working in code

```txt
load AZURE_FOUNDRY_PROJECT_ENDPOINT
→ load AZURE_FOUNDRY_AGENT_ID
→ call FoundryAgentClient.sendMessage()
→ return output
```

---

## 8.3 `POST /api/v1/ai/voice-live/test-config`

### Purpose

Tests Voice Live configuration without opening a real WebSocket.

### Auth

Admin only.

### Working in code

```txt
build Voice Live URL
→ build session.update config
→ validate endpoint, model, api version
→ return generated config
```

---

## 8.4 `POST /api/v1/ai/realtime/test-config`

### Purpose

Tests Azure OpenAI Realtime config.

### Auth

Admin only.

### Working in code

```txt
validate AZURE_OPENAI_ENDPOINT
→ validate realtime deployment
→ build realtime session config
→ return config
```

---

# 9. Plans / Subscription Endpoints

---

## 9.1 `GET /api/v1/plans`

### Purpose

Returns available subscription plans.

### Auth

Public or user.

### Working in code

```txt
query active plans
→ return Starter, Pro, Premium
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Starter",
      "price": 9.99,
      "chatLimit": 5,
      "liveLimit": 0
    },
    {
      "id": "uuid",
      "name": "Pro",
      "price": 29.99,
      "chatLimit": 20,
      "liveLimit": 5
    }
  ]
}
```

---

## 9.2 `GET /api/v1/billing/subscription`

### Purpose

Gets logged-in user subscription.

### Auth

User required.

### Working in code

```txt
load active subscription by user_id
→ include plan details
→ include remaining chat/live quota
```

---

## 9.3 `POST /api/v1/billing/checkout`

### Purpose

Creates checkout session for payment.

### Auth

User required.

### Request

```json
{
  "planId": "uuid"
}
```

### Working in code

```txt
validate plan
→ create payment provider checkout session
→ save pending payment
→ return checkout URL
```

### Response

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/..."
  }
}
```

---

## 9.4 `GET /api/v1/billing/history`

### Purpose

Returns user payment history.

### Auth

User required.

### Working in code

```txt
query payments by user_id
→ return amount, provider, status, createdAt
```

---

# 10. Webhook Endpoints

---

## 10.1 `POST /api/v1/webhooks/stripe`

### Purpose

Receives Stripe payment events.

### Auth

No user auth, but must verify Stripe signature.

### Working in code

```txt
read raw request body
→ verify Stripe webhook signature
→ if checkout completed:
     mark payment as paid
     create subscription
     add chat/live quota
→ if payment failed:
     mark payment failed
→ return 200
```

### Security

Do not use normal JSON parser before Stripe signature verification.

---

## 10.2 `POST /api/v1/webhooks/paypal`

### Purpose

Receives PayPal payment events if you add PayPal.

### Working in code

```txt
verify webhook signature
→ update payment status
→ create or renew subscription
```

---

# 11. Admin Endpoints

All admin routes require:

```txt
requireAuth
requireAdmin
auditLog
```

---

## 11.1 `GET /api/v1/admin/dashboard`

### Purpose

Admin dashboard summary.

### Working in code

```txt
count total users
→ count active subscriptions
→ calculate total revenue
→ count chat/live interviews
→ calculate AI token/audio usage
→ return analytics
```

---

## 11.2 `GET /api/v1/admin/users`

### Purpose

Lists users.

### Query params

```txt
?page=1
?limit=20
?search=adam
?status=active
```

### Working in code

```txt
query users
→ join subscriptions/usage summary
→ return paginated users
```

---

## 11.3 `GET /api/v1/admin/users/:userId`

### Purpose

Gets one user detail.

### Working in code

```txt
load user
→ load profile
→ load subscriptions
→ load interviews
→ load usage logs
```

---

## 11.4 `PATCH /api/v1/admin/users/:userId/status`

### Purpose

Suspends or activates user.

### Request

```json
{
  "status": "suspended"
}
```

### Working in code

```txt
validate admin
→ update user.status
→ write admin_audit_logs
```

---

## 11.5 `GET /api/v1/admin/interviews`

### Purpose

Admin list of all interviews.

### Query params

```txt
?type=CHAT
?type=LIVE
?visaType=F1
?mode=TRAINING
?status=completed
```

### Working in code

```txt
query interviews
→ join user
→ return list
```

---

## 11.6 `GET /api/v1/admin/interviews/:interviewId`

### Purpose

Admin detail for one interview.

### Working in code

```txt
load interview
→ load messages/transcripts
→ load scores
→ load usage logs
→ return full detail
```

---

## 11.7 `GET /api/v1/admin/subscriptions`

### Purpose

Lists all subscriptions.

### Working in code

```txt
query subscriptions
→ join users and plans
→ return active/expired/cancelled subscriptions
```

---

## 11.8 `GET /api/v1/admin/payments`

### Purpose

Lists all payments.

### Working in code

```txt
query payments
→ filter by provider/status/date
→ return results
```

---

## 11.9 `GET /api/v1/admin/revenue`

### Purpose

Revenue analytics.

### Working in code

```txt
sum successful payments
→ group by month
→ calculate MRR
→ calculate plan distribution
```

---

## 11.10 `GET /api/v1/admin/ai-usage`

### Purpose

Shows token/audio usage.

### Working in code

```txt
query usage_logs
→ group by model
→ sum input tokens
→ sum output tokens
→ sum audio seconds
→ calculate estimated cost
```

---

## 11.11 `GET /api/v1/admin/settings`

### Purpose

Gets app settings.

### Working in code

```txt
load app_settings table
→ return limits, models, feature flags
```

---

## 11.12 `PATCH /api/v1/admin/settings`

### Purpose

Updates app settings.

### Request

```json
{
  "trainingMaxRetries": 3,
  "trainingMaxQuestions": 8,
  "simulationMaxQuestions": 10,
  "enableVoiceLive": true
}
```

### Working in code

```txt
validate settings
→ update app_settings
→ write audit log
```

---

## 11.13 `GET /api/v1/admin/question-bank`

### Purpose

Lists interview questions.

### Working in code

```txt
query interview_questions
→ filter by visa type/category/difficulty
```

---

## 11.14 `POST /api/v1/admin/question-bank`

### Purpose

Creates a new interview question.

### Request

```json
{
  "visaType": "F1",
  "questionText": "Why did you choose this university?",
  "category": "university_choice",
  "difficulty": "medium"
}
```

### Working in code

```txt
validate question
→ insert into interview_questions
→ write audit log
```

---

## 11.15 `PATCH /api/v1/admin/question-bank/:questionId`

### Purpose

Updates a question.

---

## 11.16 `DELETE /api/v1/admin/question-bank/:questionId`

### Purpose

Disables or deletes question.

Better approach:

```txt
Soft delete using is_active = false
```

---

# 12. External Azure Endpoints Used by Backend

These are **not your frontend API routes**. These are endpoints/classes your backend calls.

---

## 12.1 Foundry Project Endpoint

Your value:

```txt
https://officer-charles-resource.services.ai.azure.com/api/projects/officer-charles
```

Used by:

```txt
AzureFoundryClient
FoundryAgentClient
```

Purpose:

```txt
Connect backend to Microsoft Foundry project and agent.
```

Microsoft’s Foundry SDK quickstart uses a project endpoint and agent name as environment variables when connecting code to Foundry. ([Microsoft Learn][2])

---

## 12.2 Voice Live Normal WebSocket

Use for non-WebRTC Voice Live streaming:

```txt
wss://officer-charles-resource.services.ai.azure.com/voice-live/realtime?api-version=2026-04-10&model=gpt-realtime
```

For custom Foundry Agent mode:

```txt
wss://officer-charles-resource.services.ai.azure.com/voice-live/realtime?api-version=2026-04-10&agent_id=4be4241e-e246-4949-a7b3-ab2fa21c15e0&project_id=officer-charles
```

Microsoft’s Voice Live docs say the endpoint uses `/voice-live/realtime`, `api-version=2026-04-10`, and either `model` or `agent_id` plus `project_id`. ([Microsoft Learn][1])

---

## 12.3 Voice Live WebRTC Endpoint

Use for browser microphone + realtime low-latency audio:

```txt
wss://officer-charles-resource.services.ai.azure.com/voice-live/realtime/calls?api-version=2026-01-01-preview&model=gpt-realtime
```

Used by:

```txt
VoiceLiveClient
LiveInterviewAgent
React WebRTC UI
```

The Voice Live WebRTC doc says WebRTC uses `/voice-live/realtime/calls` and a WebSocket control channel for SDP/session events. ([Microsoft Learn][4])

---

## 12.4 Azure OpenAI Realtime Client Secret Endpoint

Used by backend to create short-lived secret:

```txt
POST https://officer-charles-resource.openai.azure.com/openai/v1/realtime/client_secrets
```

Used by:

```txt
SecureTokenService.createRealtimeEphemeralToken()
RealtimeWebRTCSession.createClientSecret()
```

Purpose:

```txt
Backend creates temporary client secret.
Frontend uses it to establish WebRTC call.
```

Microsoft’s Realtime WebRTC guide uses `/openai/v1/realtime/client_secrets` for the realtime browser flow. ([Microsoft Learn][3])

---

## 12.5 Azure OpenAI Realtime Calls Endpoint

Used by frontend WebRTC after backend gives short-lived secret:

```txt
https://officer-charles-resource.openai.azure.com/openai/v1/realtime/calls
```

Purpose:

```txt
Browser sends SDP offer and receives SDP answer for realtime audio.
```

The same Microsoft Realtime WebRTC guide documents `/openai/v1/realtime/calls` as the WebRTC call endpoint. ([Microsoft Learn][3])

---

# 13. Full Endpoint List Summary

```txt
HEALTH
GET    /api/v1/health
GET    /api/v1/health/ai

AUTH
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/google
GET    /api/v1/auth/google/callback
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

USER
GET    /api/v1/users/me
PATCH  /api/v1/users/me
GET    /api/v1/users/me/usage
GET    /api/v1/users/me/interviews

CHAT INTERVIEW
POST   /api/v1/interviews/chat/start
POST   /api/v1/interviews/chat/:interviewId/message
POST   /api/v1/interviews/chat/:interviewId/complete
GET    /api/v1/interviews/:interviewId
GET    /api/v1/interviews/:interviewId/messages
GET    /api/v1/interviews/:interviewId/evaluation

LIVE INTERVIEW
POST   /api/v1/live-interviews/start
POST   /api/v1/live-interviews/:sessionId/token
POST   /api/v1/live-interviews/:sessionId/config
POST   /api/v1/live-interviews/:sessionId/transcript
POST   /api/v1/live-interviews/:sessionId/event
POST   /api/v1/live-interviews/:sessionId/complete
GET    /api/v1/live-interviews/:sessionId/status

AI DEBUG / INTERNAL
POST   /api/v1/ai/chat/test
POST   /api/v1/ai/foundry-agent/test
POST   /api/v1/ai/voice-live/test-config
POST   /api/v1/ai/realtime/test-config

PLANS / BILLING
GET    /api/v1/plans
GET    /api/v1/billing/subscription
POST   /api/v1/billing/checkout
GET    /api/v1/billing/history

WEBHOOKS
POST   /api/v1/webhooks/stripe
POST   /api/v1/webhooks/paypal

ADMIN
GET    /api/v1/admin/dashboard
GET    /api/v1/admin/users
GET    /api/v1/admin/users/:userId
PATCH  /api/v1/admin/users/:userId/status
GET    /api/v1/admin/interviews
GET    /api/v1/admin/interviews/:interviewId
GET    /api/v1/admin/subscriptions
GET    /api/v1/admin/payments
GET    /api/v1/admin/revenue
GET    /api/v1/admin/ai-usage
GET    /api/v1/admin/settings
PATCH  /api/v1/admin/settings
GET    /api/v1/admin/question-bank
POST   /api/v1/admin/question-bank
PATCH  /api/v1/admin/question-bank/:questionId
DELETE /api/v1/admin/question-bank/:questionId
```

---

# 14. Most Important Flow in Code

## Chat interview flow

```txt
React calls:
POST /api/v1/interviews/chat/start

Backend:
requireAuth
→ validate request
→ check quota
→ create interview
→ call Foundry/Responses API
→ save first assistant question
→ return first question

React calls:
POST /api/v1/interviews/chat/:id/message

Backend:
save user answer
→ call AI
→ parse response
→ score answer
→ apply training/simulation rules
→ save result
→ return next message

React calls:
POST /api/v1/interviews/chat/:id/complete

Backend:
load full interview
→ generate final evaluation
→ save score
→ return evaluation
```

---

## Live interview flow

```txt
React calls:
POST /api/v1/live-interviews/start

Backend:
requireAuth
→ validate request
→ check live quota
→ create interview + live session
→ build Voice Live or Realtime config
→ return safe connection info

React opens WebRTC/WebSocket with temporary backend-issued info.

During interview:
React sends transcript/events to backend:
POST /api/v1/live-interviews/:sessionId/transcript
POST /api/v1/live-interviews/:sessionId/event

At the end:
React calls:
POST /api/v1/live-interviews/:sessionId/complete

Backend:
load transcript
→ evaluate interview
→ save final result
→ return final evaluation
```

---

# 15. Best Rule for Your Backend

Keep this separation:

```txt
Auth endpoints
= login, register, session

User endpoints
= profile, usage, history

Chat interview endpoints
= text interview lifecycle

Live interview endpoints
= voice/avatar lifecycle

Billing endpoints
= plans, checkout, subscription

Admin endpoints
= analytics, users, revenue, AI usage

AI internal endpoints
= testing Azure/Foundry config only
```

This keeps your backend clean and prevents your AI module from becoming mixed with auth, billing, and admin logic.

[1]: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live-how-to "How to use the Voice Live API - Foundry Tools | Microsoft Learn"
[2]: https://learn.microsoft.com/en-us/azure/foundry/quickstarts/get-started-code "Quickstart: Get started with Microsoft Foundry SDK - Microsoft Foundry | Microsoft Learn"
[3]: https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/realtime-audio-webrtc "Use the GPT Realtime API via WebRTC - Microsoft Foundry | Microsoft Learn"
[4]: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live-webrtc "Voice Live API with WebRTC - Foundry Tools | Microsoft Learn"
