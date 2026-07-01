# Officer Charles Architecture

This document describes the current Officer Charles flow from frontend to Laravel backend to `core_v3`, with special focus on Chat Interview and Live Interview behavior.

## High Level System

Officer Charles has two user experiences:

- **Chat Interview**: typed messages in the React UI are saved by Laravel, sent to `core_v3 /chat`, answered by `ChatInterviewAssistant` using Gemini, saved back to the database, and rendered as user/assistant message bubbles.
- **Live Interview**: the React UI creates a live session through Laravel, opens a websocket to `core_v3 /ws/{session_id}`, records microphone audio in the browser, streams PCM audio to `core_v3`, and receives live transcription, assistant text, session state, and generated audio.

Main parts:

- Frontend: `resources/js/pages/welcome.tsx`
- Inertia wrapper page: `resources/js/pages/visa-ai.tsx`
- Laravel API routes: `routes/api.php`
- Laravel controller: `app/Http/Controllers/AiMessageController.php`
- Persistence models: `app/Models/AiMessage.php`, `app/Models/AiSessionState.php`
- Core V3 FastAPI app: `core_v3/server.py`
- Chat assistant: `core_v3/assistants/completion/ChatInterviewAssistant.py`
- Live assistant: `core_v3/assistants/realtime/LiveInterviewAssistant.py`
- Realtime base class: `core_v3/core/realtime/RealtimeCoreOpenAI.py`
- Live assistant brain files: `core_v3/dist/brains/LiveInterviewAssistant/`

## Frontend Entry Points

`routes/web.php` serves the UI:

- `/` renders the `welcome` page with empty messages.
- `/visa-ai` renders `visa-ai` for authenticated and verified users.

`resources/js/pages/visa-ai.tsx` is a thin wrapper around `resources/js/pages/welcome.tsx`.

The real frontend implementation is `ChatExperience` in `welcome.tsx`. It owns both chat and live state:

- `experienceMode`: either `chat` or `live`.
- `chatMessages`: persisted chat messages loaded from Laravel.
- `liveMessagesBySession`: in-memory live transcript messages, keyed by `${mode}:${visaType}`.
- `chatSessionState` and `liveSessionState`: progress metadata used by the sidebar.
- `liveConnecting`, `liveConnected`, `liveRecording`, `liveSpeaking`, and `liveError`: live interview connection and audio states.

Current UI defaults:

- `mode = "training"`
- `visaType = "f1"`

The assistants and backend support both `training/interview` and `f1/b1_b2`, but the current frontend active selection is hard-coded to training plus F-1.

## Message Shape In Frontend

Frontend server messages use:

```ts
interface ServerMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
    mode?: 'training' | 'interview' | null;
    visa_type?: 'f1' | 'b1_b2' | null;
}
```

`ChatMessage` extends this with local-only fields:

- `localId`: used for optimistic pending messages.
- `status`: `pending` or `failed`.

Both chat and live transcripts render through `ChatTranscript`, which maps messages into `MessageBubble` components. User and assistant messages are distinguished by `role`.

## Chat Interview Flow

### 1. Loading Existing Chat Messages

On page load, `ChatExperience.loadMessages()` calls:

```http
GET /api/ai/messages
```

Laravel handles this in `AiMessageController@index`.

The controller:

- Reads or creates a visitor UUID from the `officer_charles_visitor` cookie.
- Builds active sessions for every mode and visa type combination.
- Loads incomplete `ai_messages` matching those active sessions.
- Returns:
  - `messages`
  - `session_state`
- Queues visitor and session cookies.

The frontend stores the result in:

- `chatMessages`
- `chatSessionState`

### 2. Sending A User Chat Message

When the user submits the textarea, `submitMessage()`:

- Trims the draft.
- Creates an optimistic local user message with `status: "pending"`.
- Appends it to `chatMessages`.
- Sends:

```http
POST /api/ai/messages
Content-Type: application/json

{
  "content": "...",
  "mode": "training",
  "visa_type": "f1"
}
```

The request is handled by `AiMessageController@store`.

### 3. Laravel Chat Handling

`store()` validates:

- `content`: required string, max 10000.
- `mode`: optional, `training` or `interview`, defaults to `interview`.
- `visa_type`: optional, `f1` or `b1_b2`, defaults to `f1`.

Then it:

1. Resolves `visitor_id` from cookie or creates a UUID.
2. Resolves an active session ID using `activeSession()`.
3. Loads existing incomplete message history for visitor/session/mode/visa type.
4. Creates a user `AiMessage`.
5. Calls `callCoreV3Chat()`.
6. Creates an assistant `AiMessage` from the Core V3 response.
7. Saves `AiSessionState`.
8. If the assistant response contains `FINAL REPORT` or `Performance Report`, marks the session complete and queues a new session cookie.
9. Returns:

```json
{
  "user": {},
  "assistant": {},
  "session_completed": false,
  "session_reset": false,
  "session_state": {}
}
```

If Core V3 is down or Gemini fails, Laravel returns a `502` with a user-facing error message and the saved user message.

### 4. Core V3 Chat Endpoint

Laravel calls:

```http
POST {CORE_V3_BASE_URL}/chat
```

Request shape from Laravel:

```json
{
  "content": "user message",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "mode": "training",
  "visa_type": "f1",
  "session_target": 12,
  "gemini": {
    "api_key": "...",
    "model": "gemini-2.5-flash",
    "fallback_model": "gemini-2.5-flash-lite"
  }
}
```

`core_v3/server.py` validates `mode` and `visa_type`, creates `ChatInterviewAssistant`, and calls:

```py
assistant.reply_with_state(user_message=request.content, history=...)
```

The response is:

```json
{
  "content": "assistant reply",
  "state": {
    "experience": "chat",
    "phase": "...",
    "selected_mode": "...",
    "selected_visa_type": "...",
    "interview_status": "...",
    "current_question": "...",
    "current_question_index": 1,
    "total_questions": 10,
    "answered_questions": [],
    "last_answer_quality": null,
    "evaluation_ready": false,
    "completed": false
  }
}
```

### 5. ChatInterviewAssistant

`ChatInterviewAssistant` owns the chat workflow.

Important constants:

- `WELCOME_PROMPT`: asks the user to choose Training Session or Real Interview Simulation.
- `VISA_PROMPT`: asks the user to choose F-1 or B1/B2.
- `F1_OPENING`: asks for passport and Form I-20.
- `B1_B2_OPENING`: asks for passport.
- `F1_QUESTIONS`: 10 student visa questions.
- `B1_B2_QUESTIONS`: 8 visitor visa questions.

Important methods:

- `reply(user_message, history)`: builds the Gemini system instruction and contents, then returns text.
- `reply_with_state(user_message, history)`: returns both response content and computed session state.
- `session_state(...)`: derives phase, selected mode, selected visa type, current question, progress, evaluation readiness, and completion.
- `_system_instruction(...)`: chooses the exact prompt for the next step.
- `_base_instruction()`: safety and personality rules.
- `_start_selected_session(...)`: starts training or interview after mode and visa selection.
- `_active_session_instruction(...)`: controls the ongoing training or interview turn.
- `_evaluation_instruction(...)`: asks Gemini for the final performance report.
- `_gemini_contents(...)`: converts app history roles to Gemini roles.
- `_call_gemini(...)`: calls Gemini, trying fallback models for retryable failures.

Chat training behavior:

- After the user answers a practice question, the assistant gives structured coaching:
  - Strengths
  - Weaknesses
  - Improvement Suggestions
  - Retry prompt for the same question

Chat interview behavior:

- The assistant stays in realistic officer character.
- It asks one question at a time.
- It does not coach or explain during the simulation.
- After enough turns, it returns an Interview Performance Report.

## Live Interview Flow

### 1. Starting A Live Session

When the user clicks Start Live Interview, `startLiveInterview()` calls:

```http
POST /api/ai/live-session
Content-Type: application/json

{
  "mode": "training",
  "visa_type": "f1"
}
```

`AiMessageController@liveSession`:

1. Validates mode and visa type.
2. Gets or creates the visitor cookie.
3. Calls Core V3:

```http
POST {CORE_V3_BASE_URL}/sessions

{
  "mode": "training",
  "visa_type": "f1",
  "visitor_id": "..."
}
```

4. Receives a Core V3 `session_id`.
5. Returns:

```json
{
  "session_id": "...",
  "ws_url": "ws://127.0.0.1:8020/ws/{session_id}",
  "session_state": {
    "experience": "live",
    "phase": "mode_selection",
    "...": "..."
  }
}
```

Live transcript messages are not persisted to Laravel in the current implementation. They live in React state only.

### 2. Core V3 Live Session Registry

`core_v3/server.py` stores live sessions in memory:

```py
live_sessions[session_id] = {
    "mode": request.mode,
    "visa_type": request.visa_type,
    "visitor_id": request.visitor_id,
}
```

This means live sessions are process-local and disappear if Core V3 restarts.

### 3. Opening The Websocket

The frontend opens:

```ts
const socket = new WebSocket(payload.ws_url);
```

Core V3 handles this in:

```py
@app.websocket("/ws/{session_id}")
async def websocket_session(...)
```

Core V3:

1. Accepts the websocket.
2. Looks up the in-memory session.
3. Creates `LiveInterviewAssistant` with:
   - `setup=False`
   - `disable_wss=True`
   - selected mode and visa type
   - visitor ID
4. Overrides `assistant.wss_send` and `assistant.wss_send_raw` so the assistant sends messages directly through the FastAPI websocket.
5. Runs `assistant.setup()` in a worker thread.
6. Sends:

```json
{"type": "ready", "sample_rate": 24000}
```

7. Calls `assistant.start_conversation()`.
8. Receives browser websocket messages until disconnect.

### 4. Browser Microphone Recording

`startAudioCapture(socket)`:

- Creates an `AudioContext` with sample rate `24000`.
- Calls `navigator.mediaDevices.getUserMedia()` with:
  - mono audio
  - echo cancellation
  - noise suppression
  - auto gain control
- Creates a `MediaStreamAudioSourceNode`.
- Creates a `ScriptProcessorNode` with buffer size `4096`.

On every audio process event:

1. The output buffer is filled with silence to avoid speaker feedback.
2. If `liveRecordingRef.current` is false, no audio is sent.
3. If recording is active, input float samples are downsampled to 24 kHz if needed.
4. Samples are converted to PCM16.
5. PCM bytes are base64 encoded.
6. The browser sends:

```json
{"_bin": "base64-pcm16-audio"}
```

The frontend starts and stops actual capture resources when the live session starts/stops. The mic button only toggles whether buffers are sent.

### 5. Recording Toggle And Commit

`toggleLiveRecording()` does two things:

- If not recording, it sets `liveRecording` to true. Audio buffers begin streaming.
- If already recording, it sets `liveRecording` to false and sends:

```json
{"type": "command", "command": "commit"}
```

The commit tells Core V3/OpenAI that the current spoken answer is complete.

### 6. Core V3 Websocket Message Handling

In `server.py`, Core V3 accepts two kinds of browser audio payloads:

- Raw websocket bytes.
- JSON with `_bin`, which is base64-decoded to bytes.

Audio bytes are passed to:

```py
assistant.fe_audio_handler(audio_bytes)
```

Command payloads are passed to:

```py
assistant.fe_command_handler(payload)
```

### 7. RealtimeCoreOpenAI Base Class

`RealtimeCoreOpenAI` is the reusable realtime core class. `LiveInterviewAssistant` extends it.

Responsibilities:

- Connect to OpenAI Realtime API through `WSC`.
- Optionally host a frontend websocket server through `WSS`; disabled in this app because FastAPI handles the browser websocket.
- Load assistant context, tools, and model config from `core_v3/dist/brains/{AssistantName}`.
- Register plugins.
- Route frontend audio and commands.
- Route OpenAI realtime events.
- Send assistant audio/text/transcription events back to the frontend.
- Dispatch OpenAI function calls to Python handlers.

Important fields:

- `wsc`: websocket client connected to OpenAI Realtime.
- `wss`: optional websocket server for frontend clients.
- `tools`: OpenAI tool definitions loaded from `tools.json`.
- `tools_map`: Python function handlers keyed by OpenAI tool name.
- `WSC_EVENT_HANDLERS`: maps OpenAI events to handlers.
- `WSS_EVENT_HANDLERS`: maps frontend events to handlers.
- `MESSAGE_LISTENERS`: callbacks for system, user, and assistant messages.
- `_wsc_text_queue` and `_wsc_audio_queue`: preserve event ordering for text/transcription and audio.

Important frontend handlers:

- `fe_audio_handler(audio)`: sends audio to OpenAI using `input_audio_buffer.append`.
- `fe_command_handler(payload)`: handles:
  - `commit`: commits the audio buffer and waits for `input_audio_buffer.committed`.
  - `text`: creates a text conversation item and requests the next reply.
  - `response.cancel`: cancels an active OpenAI response.

Important OpenAI handlers:

- `rt_audio_delta_handler(payload)`: forwards OpenAI audio delta to frontend.
- `rt_text_delta_handler(payload)`: forwards text delta as `{type: "text.delta"}`.
- `rt_response_transcription_delta(payload)`: forwards assistant transcript delta.
- `rt_transcription_handler(payload)`: receives user speech transcription, sends `{type: "transcription"}`, and requests the next assistant response.
- `rt_assistant_reply_handler(payload)`: handles completed assistant audio transcript.
- `rt_response_text_done(payload)`: handles completed text response.
- `rt_request_function()`: asks OpenAI to call a required tool, parses arguments, and dispatches to `tools_map`.
- `rt_request_reply()`: creates an assistant response.

### 8. LiveInterviewAssistant

`LiveInterviewAssistant` extends `RealtimeCoreOpenAI` and implements the visa interview state machine.

Constructor setup:

- Enables text and audio modalities.
- Overrides/extends OpenAI event handlers for newer realtime event names:
  - `response.output_audio.delta`
  - `response.output_audio_transcript.delta`
  - `response.output_audio_transcript.done`
  - `response.output_text.delta`
  - `response.output_text.done`
- Registers `_remember_user_message` as a user message listener.
- Loads plugins:
  - `payload`
  - `service`
  - `local_storage`
- Registers services:
  - `unknown`
  - `start`
  - `mode_selection`
  - `visa_selection`
  - `training`
  - `interview`
- Sets default payload and local storage state.

Important lifecycle methods:

- `setup()`: calls base setup and registers `tools_map["process_admin"] = handle_process_admin`.
- `create_session()`: uses the configured OpenAI API key directly as the realtime secret.
- `setup_wsc()`: connects to `wss://api.openai.com/v1/realtime?model=gpt-realtime-mini` by default.
- `wsc_open()`: sends `session.update` with instructions, tools, audio transcription config, server VAD, and output voice.
- `start_conversation()`: emits initial live session state and sends the welcome prompt as direct assistant text/audio.

### 9. Live Assistant Tools And Brain Files

The live assistant loads:

- `context.json`: tells the model it is Officer Charles, not a real government officer, and that Python controls the workflow.
- `tools.json`: defines the `process_admin` function.
- `config.json`: model, TTS, STT, voice, VAD, and generation config.

The OpenAI model must call `process_admin` after user messages. It submits structured data such as:

- `service_type`
- `selected_mode`
- `selected_visa_type`
- `user_answer`
- `extracted_payload`
- `answered_current_question`
- `answer_is_unclear`
- `answer_score`
- `strengths`
- `weaknesses`
- `suggestions`
- `wants_next_question`
- `cancel_current_request`

Python then decides the actual next applicant-facing response.

### 10. Live State Machine

The live interview state is stored in the assistant local storage plugin.

Default local storage:

- `phase`
- `selected_mode`
- `selected_visa_type`
- `current_question`
- `question_index`
- `answers`
- `question_payloads`
- `training_scores`
- `training_attempts`
- `training_answered_questions`
- `skipped_questions`
- `training_results`
- `questions`
- `evaluation_done`

Main service methods:

- `service_start()`: resets state and asks for mode selection.
- `service_mode_selection(arguments)`: normalizes Training vs Real Interview Simulation.
- `service_visa_selection(arguments)`: normalizes F-1 vs B1/B2, loads question set, starts training or interview.
- `service_training(arguments)`: scores practice answers, gives feedback, repeats weak answers, advances on score >= 80, allows skip, and emits a training completion report.
- `service_interview(arguments)`: validates real interview answers, asks missing required slots, advances through questions, and emits an Interview Performance Report.

The live assistant emits state to the frontend through:

```json
{
  "type": "session.state",
  "state": {
    "experience": "live",
    "phase": "...",
    "selected_mode": "...",
    "selected_visa_type": "...",
    "interview_status": "...",
    "current_question": "...",
    "current_question_index": 1,
    "total_questions": 10,
    "answered_questions": [],
    "last_answer_quality": null,
    "evaluation_ready": false,
    "completed": false,
    "training_scores": [],
    "skipped_questions": []
  }
}
```

### 11. Live Assistant Responses To Frontend

The frontend handles these websocket message types in `handleLiveMessage()`:

- `ready`: Core V3 websocket and assistant are ready.
- `session.state`: update progress/sidebar state.
- `transcription`: add a user transcript message to the live transcript.
- `direct.reply`: append/finalize assistant text in the live transcript.
- `direct.audio`: play generated MP3 audio in the browser.
- `error`: show live error.

`LiveInterviewAssistant._send_direct_assistant_text(message)` sends:

```json
{"type": "direct.reply", "message": "..."}
```

Then it calls `_tts_audio(message)`, which uses OpenAI audio speech:

- model: `gpt-4o-mini-tts` by default
- voice: `ash`
- response format: `mp3`

If TTS succeeds, it sends:

```json
{
  "type": "direct.audio",
  "audio": "base64-mp3",
  "mime_type": "audio/mpeg"
}
```

The frontend plays this by creating a Blob URL and an `Audio` element.

The base realtime class can also forward normal OpenAI streaming events like `text.delta`, `text.completed`, and audio deltas. The current frontend mainly consumes the direct reply/audio path plus transcription and session state.

## Persistence

### ai_messages

`AiMessage` stores persisted chat turns.

Columns include:

- `user_id`
- `visitor_id`
- `session_id`
- `role`
- `content`
- `agent_id`
- `mode`
- `visa_type`
- `completed_at`
- timestamps

Chat messages are persisted. Live messages are not currently persisted.

### ai_session_states

`AiSessionState` stores session progress JSON.

Columns include:

- `visitor_id`
- `session_id`
- `experience`: `chat` or `live`
- `mode`
- `visa_type`
- `state`
- `completed_at`
- timestamps

The controller currently saves chat session state after `/chat` replies. Live returns default state through Laravel and then streams live state directly from Core V3 to the frontend.

## Cookies And Session Selection

Laravel uses cookies for anonymous visitor/session tracking:

- Visitor cookie: `officer_charles_visitor`
- Session cookie prefix: `officer_charles_session_`
- Session cookie format: `officer_charles_session_{mode}_{visa_type}`

`activeSession()`:

- Reuses a valid session cookie if it has not completed.
- Falls back to the latest incomplete DB session for the visitor/mode/visa type.
- Starts a new session if none exists.
- Times out sessions after 5 minutes of inactivity if the latest incomplete message is from the assistant.

When a session is completed, Laravel marks messages and session state with `completed_at` and queues a fresh UUID for the next session.

## Restart Behavior

Chat restart:

- Frontend calls `POST /api/ai/restart`.
- Laravel marks current incomplete chat messages and chat session state as completed.
- Laravel returns empty messages and default chat state.
- Frontend clears active chat messages.

Live restart:

- Frontend closes the websocket.
- Stops audio processor, source, stream tracks, and audio state.
- Clears live messages for the active live session key.
- Resets live state to `defaultLiveSessionState`.
- No backend DB cleanup is needed because live transcript is in-memory only.

## Environment And Config

Laravel service config lives in `config/services.php`.

Core V3 defaults:

- HTTP base URL: `CORE_V3_BASE_URL`, default `http://127.0.0.1:8020`
- Public websocket URL: `CORE_V3_WS_PUBLIC_URL`, default `ws://127.0.0.1:8020`

Chat model config:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`, default `gemini-2.5-flash`
- `GEMINI_FALLBACK_MODEL`, default `gemini-2.5-flash-lite`

Live model config:

- `OPENAI_KEY` or `OPENAI_API_KEY`
- `core_v3/dist/brains/LiveInterviewAssistant/config.json`

Core V3 FastAPI defaults:

- host: `CORE_V3_HOST`, default `127.0.0.1`
- port: `CORE_V3_PORT`, default `8020`
- sample rate: `CORE_V3_SAMPLE_RATE`, default `24000`

## AI Models Used

Officer Charles uses different AI models for chat and live interview.

### Chat Interview Models

Chat interview responses are generated by Gemini in `ChatInterviewAssistant`.

Configured in Laravel `config/services.php` and sent to Core V3 in `AiMessageController@callCoreV3Chat()`:

- Primary chat model: `GEMINI_MODEL`, default `gemini-2.5-flash`
- Fallback chat model: `GEMINI_FALLBACK_MODEL`, default `gemini-2.5-flash-lite`
- API key: `GEMINI_API_KEY`

Core V3 receives these values in the `/chat` request, builds a `GeminiConfig`, and `ChatInterviewAssistant._call_gemini()` calls:

```text
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

If the primary Gemini model fails with retryable status codes `429`, `503`, or `504`, the assistant tries the fallback model.

### Live Interview Models

Live interview uses OpenAI models in `LiveInterviewAssistant`.

Configured in:

```text
core_v3/dist/brains/LiveInterviewAssistant/config.json
```

Current defaults:

- Realtime conversation model: `gpt-realtime-mini`
- Speech-to-text model: `whisper-1`
- STT language: `en`
- Text-to-speech model: `gpt-4o-mini-tts`
- TTS/realtime voice: `ash`

`LiveInterviewAssistant.setup_wsc()` connects to:

```text
wss://api.openai.com/v1/realtime?model=gpt-realtime-mini
```

`LiveInterviewAssistant.wsc_open()` sends `session.update` with audio input transcription config:

```json
{
  "audio": {
    "input": {
      "transcription": {
        "model": "whisper-1",
        "language": "en",
        "prompt": "The applicant is speaking English during a US visa interview practice session."
      },
      "turn_detection": {
        "type": "server_vad",
        "threshold": 0.5,
        "prefix_padding_ms": 300,
        "silence_duration_ms": 500,
        "create_response": false,
        "interrupt_response": false
      }
    },
    "output": {
      "voice": "ash"
    }
  }
}
```

Direct assistant speech is generated by `_tts_audio()` through OpenAI audio speech:

```text
POST https://api.openai.com/v1/audio/speech
```

with:

- model: `gpt-4o-mini-tts`
- voice: `ash`
- response format: `mp3`
- instructions: speak as Officer Charles in a calm professional US visa officer tone

### Model Responsibilities

- Gemini `gemini-2.5-flash`: produces typed Chat Interview assistant responses.
- Gemini `gemini-2.5-flash-lite`: fallback for chat if the main Gemini model is temporarily unavailable/rate-limited.
- OpenAI `gpt-realtime-mini`: interprets live conversation and calls the `process_admin` function.
- OpenAI `whisper-1`: transcribes browser microphone audio into user text for live interview.
- OpenAI `gpt-4o-mini-tts`: turns exact Python-controlled live assistant text into playable MP3 audio.

## End To End Chat Sequence

1. User types in textarea.
2. React creates optimistic user bubble.
3. React sends `POST /api/ai/messages`.
4. Laravel validates request.
5. Laravel resolves visitor/session cookies.
6. Laravel loads incomplete message history.
7. Laravel saves user `AiMessage`.
8. Laravel posts to Core V3 `/chat`.
9. Core V3 creates `ChatInterviewAssistant`.
10. Assistant builds Gemini system instruction and contents.
11. Gemini returns assistant text.
12. Assistant computes chat session state.
13. Core V3 returns `{content, state}`.
14. Laravel saves assistant `AiMessage`.
15. Laravel saves `AiSessionState`.
16. Laravel returns user message, assistant message, completion flags, and state.
17. React replaces optimistic message with server messages.
18. `ChatTranscript` renders user and assistant bubbles.

## End To End Live Sequence

1. User switches to Live Interview.
2. User clicks start.
3. React sends `POST /api/ai/live-session`.
4. Laravel validates request and calls Core V3 `/sessions`.
5. Core V3 stores an in-memory live session and returns `session_id`.
6. Laravel returns `ws_url` and default live state.
7. React opens `WebSocket(ws_url)`.
8. Core V3 creates `LiveInterviewAssistant`.
9. Assistant connects to OpenAI Realtime API.
10. Core V3 sends `ready`.
11. Assistant emits `session.state`.
12. Assistant sends the welcome prompt as `direct.reply` and `direct.audio`.
13. React renders assistant message and plays audio.
14. User toggles mic recording.
15. Browser records microphone samples.
16. Browser sends base64 PCM16 chunks as `{_bin: "..."}`.
17. User toggles mic off.
18. Browser sends `{"type":"command","command":"commit"}`.
19. Core V3 commits OpenAI input audio buffer.
20. OpenAI transcribes user speech.
21. Core V3 sends `transcription` to React.
22. React renders user transcript bubble.
23. OpenAI calls `process_admin`.
24. `LiveInterviewAssistant.handle_process_admin()` routes to the active service method.
25. Python updates local interview state.
26. Python emits `session.state`.
27. Python returns exact next assistant message.
28. Assistant sends `direct.reply` and optional `direct.audio`.
29. React renders assistant bubble, updates progress, and plays audio.

## Current Design Notes

- Chat and live use different model providers: Gemini for chat, OpenAI Realtime/TTS/STT for live.
- Chat history and state are durable in Laravel database tables.
- Live transcript and live state are not durable in Laravel; live session registry is in Core V3 memory.
- The live assistant uses OpenAI function calling for interpretation, but Python owns the final workflow decision.
- The frontend currently only exposes a hard-coded active mode and visa type, even though backend/Core V3 support more combinations.
- Direct live replies are generated by Python and spoken through OpenAI TTS, which helps keep workflow responses exact.
- `RealtimeCoreOpenAI` still supports a standalone frontend websocket server, but this Laravel app bypasses it by setting `disable_wss=True` and wiring sends to FastAPI websocket methods.
