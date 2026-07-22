PHASED PROMPTS FOR MICROSOFT FOUNDRY AGENT MODULE
Use these prompts one by one.
Do not send all phases at once.
After each phase, ask the coding agent to stop, summarize completed files, and wait for the next phase.

PHASE 0 — Documentation Review + Module Plan
You are a senior backend architect and Microsoft Azure AI Foundry engineer.
We are building the AI module for a visa interview platform.
Tech stack:
    • Backend: Express.js / Node.js
    • Frontend: React.js
    • Database: PostgreSQL
    • AI: Microsoft Azure AI Foundry
    • Chat interview: Azure AI Foundry Agent / Responses API
    • Live interview: Azure OpenAI Realtime WebRTC and/or Azure Voice Live API
    • Authentication and database will be connected later
Before writing code, review the latest official Microsoft documentation for:
    1. Microsoft Azure AI Foundry Agent Service
    2. Microsoft Azure AI Foundry SDK for JavaScript/TypeScript
    3. Azure OpenAI Responses API
    4. Azure OpenAI Realtime API with WebRTC
    5. Azure Voice Live API
    6. Azure Voice Live API with WebRTC
    7. Voice Live API Reference
After reviewing the docs, create a short implementation plan for the backend AI module only.
The module must eventually support:
    • Chat interview
    • Live voice interview
    • Training mode
    • Real simulation mode
    • B1/B2 visa interview
    • F1 student visa interview
    • Per-question scoring
    • Final evaluation
    • Retry logic in training mode
    • User name personalization
    • Usage tracking
    • Token/audio usage logging
    • Secure Azure credential loading from .env
    • Clean class-based architecture
    • Config files under src/config/
    • Core reusable classes under src/utils/classes/
    • Utility functions under src/utils/functions/
Do not write full implementation code yet.
In this phase, only produce:
    1. Final folder structure
    2. List of files to create
    3. Purpose of each file
    4. Order of implementation
    5. Any Microsoft Foundry or Voice Live SDK concerns
    6. Security notes about not exposing Azure secrets to frontend
Stop after this phase and wait for the next prompt.

PHASE 1 — Folder Structure + Environment Config
Now create the base folder structure and configuration layer for the Microsoft Foundry Agent module.
Create this structure:
backend/ src/ config/ env.config.js azureFoundry.config.js azureRealtime.config.js voiceLive.config.js agent.config.js interview.config.js
constants/
  visaTypes.js
  interviewModes.js
  interviewTypes.js
  scoringRubric.js
  azureModels.js

utils/
  classes/

  functions/

prompts/
Also create:
.env.example
Use ES modules.
Do not implement AI clients yet.
Create .env.example with these variables:
NODE_ENV= PORT=
DATABASE_URL=
JWT_ACCESS_SECRET= JWT_REFRESH_SECRET=
AZURE_FOUNDRY_PROJECT_ENDPOINT= AZURE_FOUNDRY_AGENT_NAME= AZURE_FOUNDRY_AGENT_ID= AZURE_FOUNDRY_RESOURCE_NAME= AZURE_FOUNDRY_PROJECT_NAME=
AZURE_CHAT_MODEL_DEPLOYMENT= AZURE_REALTIME_MODEL_DEPLOYMENT=
AZURE_OPENAI_ENDPOINT= AZURE_OPENAI_API_KEY= AZURE_OPENAI_API_VERSION=
AZURE_VOICE_LIVE_ENDPOINT= AZURE_VOICE_LIVE_API_KEY= AZURE_VOICE_LIVE_API_VERSION= AZURE_VOICE_LIVE_MODEL=
AZURE_TENANT_ID= AZURE_CLIENT_ID= AZURE_CLIENT_SECRET=
AI_PROVIDER=azure ENABLE_VOICE_LIVE=true ENABLE_REALTIME_WEBRTC=true ENABLE_AGENT_JSON_MODE=true
DEFAULT_CHAT_MODEL= DEFAULT_REALTIME_MODEL= DEFAULT_VOICE_NAME=
FREE_CHAT_INTERVIEW_LIMIT=1 FREE_LIVE_INTERVIEW_LIMIT=1
TRAINING_MAX_RETRIES_PER_QUESTION=3 TRAINING_MAX_QUESTIONS=8 SIMULATION_MAX_QUESTIONS=10
Create env.config.js.
It must:
    • Load dotenv
    • Read all environment variables
    • Validate required variables
    • Export one clean config object
    • Throw a clean error if required values are missing
    • Never log secrets
Create these config files:
azureFoundry.config.js
It must export:
    • project endpoint
    • resource name
    • project name
    • agent name
    • agent ID
    • chat model deployment
    • auth mode
azureRealtime.config.js
It must export:
    • Azure OpenAI endpoint
    • realtime deployment/model
    • API version
    • WebRTC enabled flag
    • realtime session settings
voiceLive.config.js
It must export:
    • Voice Live endpoint
    • API version
    • model
    • default voice name
    • avatar enabled flag
    • turn detection settings
    • noise reduction settings
    • echo cancellation settings
agent.config.js
It must export:
    • JSON mode flag
    • max retry count
    • training max questions
    • simulation max questions
    • default behavior settings
interview.config.js
It must export:
    • accepted answer threshold
    • weak answer threshold
    • excellent threshold
    • visa types
    • interview modes
    • interview types
Create constants for:
visaTypes:
    • B1_B2
    • F1
interviewModes:
    • TRAINING
    • SIMULATION
interviewTypes:
    • CHAT
    • LIVE
scoringRubric:
    • relevance: 25
    • clarity: 20
    • consistency: 20
    • visaStrength: 25
    • communication: 10
azureModels:
    • chat deployment
    • realtime deployment
    • voice live model
Do not create services, routes, or AI classes in this phase.
Stop after creating these files and summarize what was created.

PHASE 2 — Prompt Files
Now create the prompt files under:
src/prompts/
Required files:
baseAgent.prompt.js b1b2.prompt.js f1.prompt.js trainingMode.prompt.js simulationMode.prompt.js scoringRubric.prompt.js liveVoice.prompt.js
Use ES modules.
Each file should export a function or string that can be imported by the prompt builder later.
Create baseAgent.prompt.js.
It must define the main role:
    • Professional US visa interview simulator
    • Ask one question at a time
    • Use user name naturally
    • Do not guarantee visa approval or denial
    • Keep tone professional and realistic
    • Follow selected visa type and mode
Create b1b2.prompt.js.
It must include interview context for:
    • Travel purpose
    • Travel plan
    • Length of stay
    • Financial ability
    • Employment or business background
    • Travel history
    • Accommodation
    • Family ties
    • Home country ties
    • Intention to return
Create f1.prompt.js.
It must include interview context for:
    • University choice
    • Program choice
    • Academic background
    • Financial sponsor
    • Sponsor occupation
    • Study plan
    • Career plan
    • Home country ties
    • Why United States
    • Why not study locally
    • Intention to return
Create trainingMode.prompt.js.
Training mode rules:
    • Give feedback after every answer
    • Score every answer
    • If answer is weak, vague, incomplete, inconsistent, or risky, explain what is missing
    • Ask same question again until acceptable or retry limit is reached
    • At the end, give final evaluation
Create simulationMode.prompt.js.
Simulation mode rules:
    • Behave like a real visa officer
    • Ask short, direct questions
    • Do not coach after every answer
    • Do not reveal score during interview
    • Repeat only if user is off-topic, unclear, or did not answer
    • Give full evaluation only at the end
Create scoringRubric.prompt.js.
Scoring:
    • Relevance: 25
    • Clarity: 20
    • Consistency: 20
    • Visa strength: 25
    • Communication quality: 10
    • Total: 100
Required structured JSON shape:
{ “assistantMessage”: “…”, “answerAccepted”: true, “shouldRepeatQuestion”: false, “currentQuestion”: “…”, “nextQuestion”: “…”, “totalScore”: 0, “scores”: { “relevance”: 0, “clarity”: 0, “consistency”: 0, “visaStrength”: 0, “communication”: 0 }, “feedback”: { “good”: “…”, “weak”: “…”, “improvement”: “…” }, “nextAction”: “ASK_NEXT_QUESTION” }
Allowed nextAction values:
    • ASK_NEXT_QUESTION
    • REPEAT_QUESTION
    • COMPLETE_INTERVIEW
Create liveVoice.prompt.js.
It must define:
    • Realtime voice behavior
    • Natural spoken interview style
    • Short questions
    • Avoid long paragraphs in voice mode
    • Use user name naturally
    • Respect training/simulation mode
    • Do not speak JSON to the user
    • Final evaluation should be returned when backend asks for completion
Do not create classes yet.
Stop after this phase and summarize created prompt files.

PHASE 3 — Utility Functions
Now create utility functions under:
src/utils/functions/
Required files:
buildSystemPrompt.js buildTrainingPrompt.js buildSimulationPrompt.js buildVisaContext.js calculateInterviewScore.js parseAgentJsonResponse.js validateInterviewInput.js normalizeTranscript.js estimateAzureCost.js sanitizeUserInput.js generateSessionId.js formatFinalEvaluation.js
Use ES modules.
Implement each function clearly.
Requirements:
buildSystemPrompt.js
    • Combines base prompt, visa prompt, mode prompt, scoring prompt, and live prompt if needed
    • Accepts userName, visaType, mode, interviewType, currentQuestion, retryCount, previousAnswers
buildTrainingPrompt.js
    • Creates extra instructions for training mode
    • Includes retry count and max retry count
    • Tells AI to give feedback after every answer
buildSimulationPrompt.js
    • Creates extra instructions for simulation mode
    • Tells AI to not reveal scoring until the end
buildVisaContext.js
    • Returns B1/B2 or F1 context
    • Throws clean error for invalid visa type
calculateInterviewScore.js
    • Accepts score parts
    • Validates max values
    • Returns total score and label:
        ◦ EXCELLENT
        ◦ GOOD
        ◦ NEEDS_IMPROVEMENT
        ◦ WEAK
parseAgentJsonResponse.js
    • Safely parses AI JSON
    • Handles malformed JSON
    • Handles markdown-wrapped JSON
    • Handles plain text fallback
    • Returns safe normalized object
validateInterviewInput.js
    • Validates visaType
    • Validates mode
    • Validates interviewType
    • Validates userName
    • Returns clean validation result
normalizeTranscript.js
    • Cleans transcript text
    • Removes repeated spaces
    • Handles empty transcript
    • Does not remove meaningful user content
estimateAzureCost.js
    • Accepts model name, input tokens, output tokens, audio seconds
    • Uses configurable rates
    • Do not hardcode production pricing
    • Add TODO comment to load rates from database/admin settings later
sanitizeUserInput.js
    • Removes dangerous HTML/script content
    • Limits length
    • Preserves normal interview answer text
generateSessionId.js
    • Generates secure unique session ID
formatFinalEvaluation.js
    • Formats final evaluation object into user-friendly response
Do not create classes yet.
Stop after this phase and summarize created utility functions.

PHASE 4 — Base Utility Classes
Now create base reusable classes under:
src/utils/classes/
Required files for this phase:
AppError.js Logger.js AgentResponseParser.js UsageTracker.js QuotaChecker.js TranscriptManager.js InterviewModePolicy.js VisaContextProvider.js
Use ES modules.
Create AppError class.
It must support:
    • statusCode
    • publicMessage
    • internalMessage
    • errorCode
    • metadata
    • isOperational
Error codes:
AI_CONFIG_ERROR AI_PROVIDER_ERROR AI_RESPONSE_PARSE_ERROR INVALID_INTERVIEW_TYPE INVALID_VISA_TYPE INVALID_INTERVIEW_MODE QUOTA_EXCEEDED LIVE_SESSION_ERROR AZURE_AUTH_ERROR
Create Logger class.
It must support:
    • info
    • warn
    • error
    • debug
It must mask sensitive values:
    • API keys
    • tokens
    • authorization headers
    • cookies
    • passwords
    • client secrets
Create AgentResponseParser class.
It must use the utility function parseAgentJsonResponse.
It must safely parse:
    • valid JSON
    • malformed JSON
    • markdown JSON
    • plain text
    • empty response
    • Azure error response
Never crash the server because of malformed AI output.
Create UsageTracker class.
It must track:
    • user ID
    • interview ID
    • provider
    • model name
    • input tokens
    • output tokens
    • total tokens
    • audio seconds
    • live session seconds
    • estimated cost
    • provider response ID
    • timestamp
For now, create in-memory/stub methods with TODO comments for PostgreSQL integration.
Create QuotaChecker class.
It must support:
    • free chat limit
    • free live limit
    • paid chat limit
    • paid live limit
    • active subscription check
    • quota decrement
For now, create stub methods with TODO comments for database integration.
Create TranscriptManager class.
It must support:
    • addTranscript()
    • getTranscript()
    • clearTranscript()
    • normalize transcript text
    • store speaker role: user or assistant
Create InterviewModePolicy class.
It must define behavior for:
TRAINING:
    • feedback after each answer
    • score after each answer
    • retry weak answers
    • repeat same question when needed
SIMULATION:
    • no feedback after each answer
    • no score reveal until end
    • repeat only if off-topic or unclear
Create VisaContextProvider class.
It must provide context for:
    • B1/B2
    • F1
Do not create Azure client classes yet.
Stop after this phase and summarize created classes.

PHASE 5 — Azure Client Classes
Now create the Azure integration classes under:
src/utils/classes/
Required files:
AzureFoundryClient.js AzureResponsesClient.js FoundryAgentClient.js VoiceLiveClient.js RealtimeWebRTCSession.js SecureTokenService.js
Use ES modules.
Important:
    • Keep Azure SDK-specific logic isolated inside these classes.
    • Do not expose Azure secrets to frontend.
    • Use environment config files from src/config/.
    • Use Logger and AppError.
    • Use DefaultAzureCredential where possible.
    • Support API key fallback only if configured.
Create AzureFoundryClient.
Responsibilities:
    • Initialize Foundry project client
    • Load project endpoint
    • Load agent name/ID
    • Use DefaultAzureCredential when possible
    • Provide method:
        ◦ getProjectClient()
        ◦ getOpenAIClient()
        ◦ healthCheck()
Create AzureResponsesClient.
Responsibilities:
    • Send chat/model requests through Azure OpenAI Responses API
    • Support model deployment name
    • Support structured prompt input
    • Return normalized response object
    • Extract output text
    • Extract token usage if available
    • Handle Azure errors cleanly
Methods:
    • createResponse(input, options)
    • createJsonResponse(input, options)
    • getResponse(responseId)
    • extractOutputText(response)
    • extractUsage(response)
Create FoundryAgentClient.
Responsibilities:
    • Talk to the configured Foundry agent
    • Send agent instructions/context
    • Support multi-turn interview flow
    • Hide SDK details from business logic
Methods:
    • sendMessage(messages, options)
    • startAgentSession(context)
    • continueAgentSession(sessionId, userMessage, context)
    • completeAgentSession(sessionId)
Create VoiceLiveClient.
Responsibilities:
    • Build Voice Live session configuration
    • Build Voice Live WebRTC connection metadata
    • Support avatar-enabled config
    • Support voice settings
    • Support turn detection
    • Support noise reduction
    • Support echo cancellation
    • Generate backend-safe session config
Methods:
    • createSessionConfig(user, options)
    • createAvatarConfig(options)
    • createVoiceConfig(options)
    • buildWebRTCConnectionInfo(sessionId)
    • handleVoiceLiveEvent(event)
Create RealtimeWebRTCSession.
Responsibilities:
    • Build Azure OpenAI realtime session config
    • Prepare session instructions
    • Prepare WebRTC metadata for frontend
    • Do not expose long-lived Azure secrets
Methods:
    • createSession(user, options)
    • buildRealtimeInstructions(user, options)
    • buildSessionConfig(user, options)
    • createClientSecret()
    • buildConnectionInfo(clientSecret)
Create SecureTokenService.
Responsibilities:
    • Create temporary session credentials
    • Prevent long-lived Azure keys from reaching frontend
    • Prepare ephemeral token response where supported
    • Mask token values in logs
Methods:
    • createRealtimeEphemeralToken(options)
    • createVoiceLiveTemporarySession(options)
    • maskToken(token)
    • validateTokenRequest(user, options)
Where exact Microsoft SDK method names may differ, add TODO comments and keep the implementation isolated.
Stop after this phase and summarize created Azure client classes.

PHASE 6 — Prompt Builder + Interview Logic Classes
Now create the main interview logic classes under:
src/utils/classes/
Required files:
InterviewPromptBuilder.js InterviewQuestionManager.js InterviewScoringEngine.js InterviewEvaluationEngine.js InterviewSessionManager.js
Use ES modules.
Create InterviewPromptBuilder.
It must generate:
    • base system prompt
    • visa-specific prompt
    • mode-specific prompt
    • scoring prompt
    • live voice prompt
    • final evaluation prompt
Inputs:
{ userName, visaType, mode, interviewType, currentQuestion, previousAnswers, retryCount }
It must use the prompt files from src/prompts/.
Create InterviewQuestionManager.
Responsibilities:
    • Provide first question
    • Provide next question
    • Track current question
    • Track retry count
    • Prevent repeated random questions unless repeating is required
    • Support B1/B2 and F1 question banks
    • Add TODO comments for future PostgreSQL question storage
Create InterviewScoringEngine.
It must score each answer using:
    • Relevance: 25
    • Clarity: 20
    • Consistency: 20
    • Visa strength: 25
    • Communication quality: 10
Return this shape:
{ “answerAccepted”: true, “totalScore”: 85, “scores”: { “relevance”: 22, “clarity”: 17, “consistency”: 18, “visaStrength”: 20, “communication”: 8 }, “feedback”: { “good”: “…”, “weak”: “…”, “improvement”: “…” }, “shouldRepeatQuestion”: false, “nextAction”: “ASK_NEXT_QUESTION” }
Create InterviewEvaluationEngine.
Responsibilities:
    • Generate final evaluation
    • Calculate average score
    • Summarize strengths
    • Summarize weaknesses
    • Create improvement plan
    • Format final result for frontend
    • Support chat and live interview
Create InterviewSessionManager.
Responsibilities:
    • Create interview session object
    • Store user ID, user name, visa type, mode, interview type
    • Store current question
    • Store answers
    • Store scores
    • Store status
    • Complete session
    • Add TODO comments for PostgreSQL integration
Do not create ChatInterviewAgent or LiveInterviewAgent yet.
Stop after this phase and summarize created classes.

PHASE 7 — ChatInterviewAgent
Now create:
src/utils/classes/ChatInterviewAgent.js
Use ES modules.
This class must use:
    • AzureResponsesClient or FoundryAgentClient
    • InterviewPromptBuilder
    • InterviewQuestionManager
    • InterviewScoringEngine
    • InterviewEvaluationEngine
    • InterviewSessionManager
    • AgentResponseParser
    • UsageTracker
    • QuotaChecker
    • InterviewModePolicy
    • Logger
    • AppError
Required methods:
    • startInterview(user, options)
    • sendUserAnswer(interviewSession, userAnswer)
    • evaluateAnswer(interviewSession, userAnswer)
    • completeInterview(interviewSession)
Input options:
{ visaType: “B1_B2” | “F1”, mode: “TRAINING” | “SIMULATION”, userName: string, interviewId: string }
Behavior:
Training mode:
    • Ask one question at a time
    • Score every answer
    • Give feedback after every answer
    • If the answer is weak or incomplete, ask the same question again
    • Retry until answer is acceptable or max retry count is reached
    • Store retry count
    • Move to next question only when accepted or retry limit is reached
    • Give final evaluation at the end
Simulation mode:
    • Ask one question at a time
    • Do not give feedback after every answer
    • Continue naturally like a real visa officer
    • Repeat only if user is off-topic, unclear, or did not answer
    • Give complete evaluation only at the end
The AI response should be parsed safely.
The class must never crash if AI returns malformed JSON.
Include TODO comments for saving:
    • messages
    • scores
    • token usage
    • final evaluation
to PostgreSQL later.
Return frontend-friendly objects.
Example start response:
{ “interviewId”: “…”, “message”: “Hello Adam, let’s begin your F1 visa interview. Why did you choose this university?”, “currentQuestion”: “…”, “mode”: “TRAINING”, “visaType”: “F1” }
Example answer response in training mode:
{ “assistantMessage”: “…”, “answerAccepted”: true, “score”: 82, “feedback”: { “good”: “…”, “weak”: “…”, “improvement”: “…” }, “shouldRepeatQuestion”: false, “nextQuestion”: “…” }
Example answer response in simulation mode:
{ “assistantMessage”: “Who will sponsor your studies?”, “answerAccepted”: true, “scoreVisible”: false }
Stop after this phase and summarize the ChatInterviewAgent implementation.

PHASE 8 — LiveInterviewAgent
Now create:
src/utils/classes/LiveInterviewAgent.js
Use ES modules.
This class must support live voice interviews using:
    • Azure Voice Live API when ENABLE_VOICE_LIVE=true
    • Azure OpenAI Realtime WebRTC when ENABLE_REALTIME_WEBRTC=true
This class must use:
    • VoiceLiveClient
    • RealtimeWebRTCSession
    • SecureTokenService
    • InterviewPromptBuilder
    • InterviewEvaluationEngine
    • InterviewSessionManager
    • TranscriptManager
    • UsageTracker
    • QuotaChecker
    • Logger
    • AppError
Required methods:
    • createLiveSession(user, options)
    • buildRealtimeInstructions(user, options)
    • createVoiceLiveConfig(user, options)
    • handleTranscriptEvent(event)
    • handleRealtimeEvent(event)
    • completeLiveInterview(sessionId)
Input options:
{ visaType: “B1_B2” | “F1”, mode: “TRAINING” | “SIMULATION”, userName: string, interviewId: string, enableAvatar: boolean }
Behavior:
    • Backend creates live interview session
    • Backend checks quota
    • Backend builds realtime instructions
    • Backend creates Voice Live or Realtime session config
    • Backend returns only safe frontend connection info
    • Frontend will later handle microphone, RTCPeerConnection, SDP offer/answer, and media streaming
    • Backend stores transcript events later through TODO database integration
    • Backend generates final evaluation when interview completes
Voice behavior:
Training mode:
    • Give spoken feedback after each answer
    • Ask user to retry weak answers
    • Keep voice feedback concise
Simulation mode:
    • Behave like a real visa officer
    • Do not reveal score during interview
    • Ask natural short questions
    • Give final evaluation only at completion
Create safe return shape:
{ “interviewId”: “…”, “sessionId”: “…”, “provider”: “VOICE_LIVE”, “connectionInfo”: {}, “sessionConfig”: {}, “instructions”: “…”, “expiresAt”: “…” }
Do not expose long-lived Azure keys.
Add TODO comments where actual Microsoft SDK calls need exact endpoint adjustment.
Stop after this phase and summarize the LiveInterviewAgent implementation.

PHASE 9 — AI Service, Controller, and Routes
Now create the API layer.
Required files:
src/modules/ai/ai.service.js src/modules/ai/ai.controller.js src/modules/ai/ai.routes.js
Also create middleware if not existing:
src/middleware/requireAuth.js src/middleware/validateRequest.js src/middleware/rateLimitAI.js
Use ES modules.
ai.service.js must expose:
    • startChatInterview(user, options)
    • sendChatInterviewMessage(user, interviewId, message)
    • completeChatInterview(user, interviewId)
    • startLiveInterview(user, options)
    • handleLiveTranscript(user, sessionId, transcript)
    • handleLiveEvent(user, sessionId, event)
    • completeLiveInterview(user, sessionId)
It must use:
    • ChatInterviewAgent
    • LiveInterviewAgent
    • Logger
    • AppError
ai.controller.js must expose controller functions:
    • startChatInterview
    • sendChatMessage
    • completeChatInterview
    • startLiveInterview
    • handleLiveTranscript
    • handleLiveEvent
    • completeLiveInterview
ai.routes.js must create these routes:
POST /api/ai/chat/start POST /api/ai/chat/:interviewId/message POST /api/ai/chat/:interviewId/complete
POST /api/ai/live/start POST /api/ai/live/:sessionId/transcript POST /api/ai/live/:sessionId/event POST /api/ai/live/:sessionId/complete
Routes must use:
    • requireAuth
    • validateRequest
    • rateLimitAI
Middleware requirements:
requireAuth.js
    • Temporary stub auth middleware
    • Reads user from request if already attached
    • For now, creates a TODO placeholder user only in development
    • Must not be used as final production auth
validateRequest.js
    • Validate request body
    • Validate visa type
    • Validate mode
    • Validate message text
rateLimitAI.js
    • Basic AI route rate limiter
    • Add TODO for Redis-based production limiter
Return clean JSON responses.
Do not create frontend.
Do not create database migrations.
Add TODO comments where PostgreSQL integration is required.
Stop after this phase and summarize created API files.

PHASE 10 — Integration Review + Testing Stubs
Now review the whole AI module.
Check:
    • All imports are correct
    • All file paths are correct
    • All config files load correctly
    • .env.example contains all required values
    • No Azure secrets are exposed
    • All classes can be imported
    • ChatInterviewAgent can start interview
    • ChatInterviewAgent can process message
    • LiveInterviewAgent can create session config
    • AI service calls correct classes
    • Routes call correct controllers
    • Errors are handled cleanly
    • Malformed AI JSON does not crash server
Create simple testing stubs under:
src/modules/ai/ai.test-stub.js
The test stub should demonstrate:
    1. Starting a chat interview
    2. Sending a chat answer
    3. Completing a chat interview
    4. Starting a live interview session
    5. Handling a fake transcript event
    6. Completing a live interview
Do not use a real testing framework yet.
Use fake user object:
{ id: “test-user-id”, name: “Adam”, email: “adam@example.com”, role: “user” }
Add final notes:
    • What still needs database integration
    • What still needs real Azure credential testing
    • What still needs frontend integration
    • What exact routes frontend should call
    • What environment values are required before real testing
Stop after this phase and provide a final implementation summary.


implement paystack iin it also user can go with 2 payment methds stripe and paystack paystack doc is here `/home/dj/Documents/repo/mrnate/Officer_Charles_Project/_notes/paystack.md` do all these things in docs accept refund and cover eveyr routes and eror handling while payemnt 