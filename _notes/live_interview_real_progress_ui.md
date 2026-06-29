# Real Progress UI Plan

## Goal

The frontend should only let the user choose the experience:

- Chat Interview
- Live Interview

Do not show Training Session, Real Interview Simulation, F-1, or B1/B2 as frontend buttons. Officer Charles asks those inside the conversation.

The right-side cards should not show fake progress. They should show progress only from real session state produced by the assistant/backend.

## Current Problem

The right side can show cards like:

- Actual Session
- Progress
- Answers checklist

But those cards are only useful if they are connected to real interview state. If they are based only on message counts, fixed percentages, or hardcoded steps, the UI can mislead the user.

## Recommended Session State

Create one shared session state shape for both chat and live:

```json
{
  "experience": "chat",
  "phase": "mode_selection",
  "selected_mode": null,
  "selected_visa_type": null,
  "interview_status": "setup",
  "current_question": null,
  "current_question_index": 0,
  "total_questions": 0,
  "answered_questions": [],
  "last_answer_quality": null,
  "evaluation_ready": false,
  "completed": false
}
```

Use these fields:

- `phase`: `mode_selection`, `visa_selection`, `training`, `interview`, `evaluation`, `completed`
- `selected_mode`: `training` or `interview`, only after the assistant knows it
- `selected_visa_type`: `f1` or `b1_b2`, only after the assistant knows it
- `current_question_index`: real current question number
- `total_questions`: real total questions for the selected visa type
- `answered_questions`: questions actually answered by the user
- `evaluation_ready`: true only when the real interview has ended
- `completed`: true only after final evaluation/report

## Chat Mode

For chat completion, update session state after every `/api/ai/messages` response.

Best approach:

1. Make `ChatInterviewAssistant` return both assistant text and metadata.
2. Add `state` to the `core_v3 /chat` response.
3. Store that state in Laravel with the active chat session.
4. Return it to the frontend with every message response and from `GET /api/ai/messages`.

Example response:

```json
{
  "content": "Choose your visa type...",
  "state": {
    "phase": "visa_selection",
    "selected_mode": "training",
    "selected_visa_type": null,
    "current_question_index": 0,
    "total_questions": 0,
    "answered_questions": []
  }
}
```

## Live Mode

For live realtime, emit state events over the websocket whenever the assistant changes service state.

Example websocket event:

```json
{
  "type": "session.state",
  "state": {
    "experience": "live",
    "phase": "interview",
    "selected_mode": "interview",
    "selected_visa_type": "f1",
    "current_question": "Why did you choose this university?",
    "current_question_index": 2,
    "total_questions": 10,
    "answered_questions": [
      "Tell me about your academic background."
    ],
    "evaluation_ready": false,
    "completed": false
  }
}
```

In `LiveInterviewAssistant`, send this event from service transitions:

- after mode selection
- after visa selection
- after each user answer
- before evaluation
- after final report

## Right-Side Cards

### Actual Session Card

Show only confirmed values:

- Experience: Chat Interview or Live Interview
- Practice mode: show `Not selected yet` until `selected_mode` exists
- Visa type: show `Not selected yet` until `selected_visa_type` exists
- Status: use `phase`

### Real Progress Card

Only show a percentage after `total_questions > 0`.

Formula:

```ts
const progress = totalQuestions > 0
  ? Math.round((answeredQuestions.length / totalQuestions) * 100)
  : null;
```

Before visa selection, show:

`Progress begins after Officer Charles starts the interview questions.`

### Answers Checklist

Render from `answered_questions`, not from fixed UI text.

For real interview mode:

- answered questions: checked
- current question: active
- remaining questions: locked or muted

For training mode:

- show latest answered question
- show last feedback sections if the assistant/backend exposes them
- do not mark progress complete just because the user retried

## Frontend State Design

Add state like:

```ts
interface InterviewSessionState {
  experience: 'chat' | 'live';
  phase: 'mode_selection' | 'visa_selection' | 'training' | 'interview' | 'evaluation' | 'completed';
  selected_mode: 'training' | 'interview' | null;
  selected_visa_type: 'f1' | 'b1_b2' | null;
  current_question: string | null;
  current_question_index: number;
  total_questions: number;
  answered_questions: string[];
  evaluation_ready: boolean;
  completed: boolean;
}
```

Keep separate state for chat and live:

```ts
const [chatSessionState, setChatSessionState] = useState<InterviewSessionState | null>(null);
const [liveSessionState, setLiveSessionState] = useState<InterviewSessionState | null>(null);
```

Then pass the active one into sidebar cards:

```ts
const activeSessionState = experienceMode === 'live'
  ? liveSessionState
  : chatSessionState;
```

## Backend Changes Needed

1. Add a session state column or table in Laravel.
2. Return `session_state` from:
   - `GET /api/ai/messages`
   - `POST /api/ai/messages`
   - `POST /api/ai/live-session`
3. Add `state` output from `core_v3 /chat`.
4. Add websocket `session.state` events from `core_v3 /ws/{session_id}`.
5. Make the frontend sidebar render only from `session_state`.

## Acceptance Criteria

- No Training Session / Real Interview Simulation buttons on frontend.
- No F-1 / B1/B2 buttons on frontend.
- Progress percentage is hidden until real interview questions start.
- Progress percentage uses real answered question count and total question count.
- Chat mode and live mode use the same session state shape.
- Sidebar never shows hardcoded completion or fake checklist items.
- Restart clears the matching chat or live session state.

