from __future__ import annotations

import asyncio
import base64
from datetime import datetime, timedelta, timezone
import json
import os
import sys
import threading
import uuid
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field


ROOT = Path(__file__).resolve().parents[1]
CORE_V3_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(CORE_V3_ROOT))

load_dotenv(ROOT / ".env")
load_dotenv(CORE_V3_ROOT / ".env", override=True)

from assistants.realtime.LiveInterviewAssistant import LiveInterviewAssistant


VALID_MODES = {"training", "interview"}
VALID_VISA_TYPES = {"f1", "b1_b2"}
SAMPLE_RATE = int(os.getenv("CORE_V3_SAMPLE_RATE", "24000"))
MESSAGE_PROTOCOL = "htask-v1"
LIVE_SESSION_TTL_SECONDS = int(os.getenv("CORE_V3_LIVE_SESSION_TTL_SECONDS", "3600"))
CHAT_SESSION_TTL_SECONDS = int(os.getenv("CORE_V3_CHAT_SESSION_TTL_SECONDS", str(LIVE_SESSION_TTL_SECONDS)))

app = FastAPI(title="Officer Charles Core V3")
live_sessions: dict[str, dict[str, Any]] = {}
chat_sessions: dict[str, dict[str, Any]] = {}
chat_sessions_lock = threading.Lock()


class SessionRequest(BaseModel):
    mode: str
    visa_type: str
    visitor_id: str | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    content: str = Field(min_length=1, max_length=10000)
    history: list[ChatMessage] = []
    mode: str
    visa_type: str
    session_id: str | None = None
    visitor_id: str | None = None


def validate_selection(mode: str, visa_type: str) -> None:
    if mode not in VALID_MODES:
        raise HTTPException(status_code=422, detail="Invalid mode.")
    if visa_type not in VALID_VISA_TYPES:
        raise HTTPException(status_code=422, detail="Invalid visa_type.")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ChatOutputCollector:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.text_parts: list[str] = []
        self.last_state: dict[str, Any] | None = None
        self.errors: list[str] = []

    def send(self, data: Any) -> None:
        if isinstance(data, bytes):
            return

        if isinstance(data, str):
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                self.text_parts.append(data)
                return
        elif isinstance(data, dict):
            payload = data
        else:
            return

        event_type = payload.get("type")
        if event_type == "session.state":
            state = payload.get("state")
            if isinstance(state, dict):
                self.last_state = state
            return

        if event_type == "text.delta":
            delta = payload.get("delta") or payload.get("message") or ""
            if delta:
                self.text_parts.append(str(delta))
            return

        if event_type == "direct.reply":
            message = payload.get("message") or ""
            if message:
                self.text_parts.append(str(message))
            return

        if event_type == "error":
            message = payload.get("message") or "Unknown chat assistant error."
            self.errors.append(str(message))

    def content(self) -> str:
        return "".join(self.text_parts).strip()

    def state(self) -> dict[str, Any] | None:
        return self.last_state


def expire_live_sessions() -> None:
    cutoff = utc_now() - timedelta(seconds=LIVE_SESSION_TTL_SECONDS)
    expired_session_ids = [
        session_id
        for session_id, session in live_sessions.items()
        if session.get("last_activity", session.get("created_at", cutoff)) < cutoff
    ]

    for session_id in expired_session_ids:
        live_sessions.pop(session_id, None)


def expire_chat_sessions() -> None:
    cutoff = utc_now() - timedelta(seconds=CHAT_SESSION_TTL_SECONDS)
    expired_session_ids = [
        session_id
        for session_id, session in chat_sessions.items()
        if session.get("last_activity", session.get("created_at", cutoff)) < cutoff
    ]

    for session_id in expired_session_ids:
        session = chat_sessions.pop(session_id, None)
        assistant = session.get("assistant") if session else None
        try:
            if assistant and assistant.wsc:
                assistant.wsc.close()
        except Exception:
            pass


async def send_json(websocket: WebSocket, payload: dict[str, Any]) -> None:
    await websocket.send_text(json.dumps(payload))


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "core_v3",
        "openai_configured": bool(os.getenv("OPENAI_KEY") or os.getenv("OPENAI_API_KEY")),
    }


@app.post("/sessions")
def create_session(request: SessionRequest) -> dict[str, Any]:
    validate_selection(request.mode, request.visa_type)
    expire_live_sessions()
    session_id = str(uuid.uuid4())
    now = utc_now()
    live_sessions[session_id] = {
        "mode": request.mode,
        "visa_type": request.visa_type,
        "visitor_id": request.visitor_id,
        "created_at": now,
        "last_activity": now,
    }
    return {
        "session_id": session_id,
        "sample_rate": SAMPLE_RATE,
        "message_protocol": MESSAGE_PROTOCOL,
    }


@app.post("/chat")
def chat(request: ChatRequest) -> dict[str, Any]:
    validate_selection(request.mode, request.visa_type)
    expire_chat_sessions()

    session_id = request.session_id or str(uuid.uuid4())
    now = utc_now()

    with chat_sessions_lock:
        session = chat_sessions.get(session_id)
        if (
            not session
            or session.get("mode") != request.mode
            or session.get("visa_type") != request.visa_type
            or session.get("visitor_id") != request.visitor_id
        ):
            try:
                if session and session.get("assistant") and session["assistant"].wsc:
                    session["assistant"].wsc.close()
            except Exception:
                pass

            collector = ChatOutputCollector()
            assistant = LiveInterviewAssistant(
                setup=False,
                disable_wss=True,
                text_only=True,
                mode=request.mode,
                visa_type=request.visa_type,
                visitor_id=request.visitor_id,
            )
            assistant.wss_send = collector.send
            assistant.wss_send_raw = collector.send

            try:
                is_setup = assistant.setup()
            except Exception as exc:
                raise HTTPException(status_code=502, detail=f"Could not start the chat interview assistant: {exc}") from exc

            if not is_setup:
                raise HTTPException(status_code=502, detail="Could not start the chat interview assistant.")

            assistant.start_conversation()
            session = {
                "assistant": assistant,
                "collector": collector,
                "mode": request.mode,
                "visa_type": request.visa_type,
                "visitor_id": request.visitor_id,
                "created_at": now,
                "last_activity": now,
                "started": True,
            }
            chat_sessions[session_id] = session

            if chat_history_has_started(request.history):
                replay_chat_history(assistant, collector, request.history)
                session["last_activity"] = now
                collector.reset()
            else:
                return {
                    "content": collector.content() or "No response received.",
                    "state": collector.state() or assistant.session_state(),
                }

        else:
            session["last_activity"] = now
            assistant = session["assistant"]
            collector = session["collector"]
            collector.reset()

    try:
        assistant.fe_command_handler({"type": "command", "command": "text", "payload": request.content})
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Officer Charles could not process that message: {exc}") from exc

    return {
        "content": collector.content() or "No response received.",
        "state": collector.state() or assistant.session_state(),
    }


def chat_history_has_started(history: list[ChatMessage]) -> bool:
    return any(
        message.role == "assistant" and "Choose your practice mode" in message.content
        for message in history
    )


def replay_chat_history(assistant: LiveInterviewAssistant, collector: ChatOutputCollector, history: list[ChatMessage]) -> None:
    seen_welcome = False

    for message in history:
        if message.role == "assistant" and "Choose your practice mode" in message.content:
            seen_welcome = True
            continue

        if not seen_welcome or message.role != "user":
            continue

        collector.reset()
        assistant.fe_command_handler({"type": "command", "command": "text", "payload": message.content})


@app.websocket("/ws/{session_id}")
async def websocket_session(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()
    expire_live_sessions()
    session = live_sessions.get(session_id)
    if not session:
        await send_json(websocket, {"type": "error", "message": "Live session not found."})
        await websocket.close(code=1008)
        return

    loop = asyncio.get_running_loop()
    assistant = LiveInterviewAssistant(
        setup=False,
        disable_wss=True,
        mode=session["mode"],
        visa_type=session["visa_type"],
        visitor_id=session.get("visitor_id"),
    )

    def send_from_assistant(data: Any) -> None:
        if isinstance(data, (dict, list)):
            data = json.dumps(data)
        elif isinstance(data, bytes):
            data = base64.b64encode(data).decode("ascii")
        else:
            data = str(data)

        asyncio.run_coroutine_threadsafe(websocket.send_text(data), loop)

    assistant.wss_send = send_from_assistant
    assistant.wss_send_raw = send_from_assistant

    try:
        is_setup = await asyncio.to_thread(assistant.setup)
        if not is_setup:
            await send_json(websocket, {"type": "error", "message": "Could not start the live interview assistant."})
            await websocket.close(code=1011)
            return

        await send_json(websocket, {
            "type": "ready",
            "sample_rate": SAMPLE_RATE,
            "message_protocol": MESSAGE_PROTOCOL,
        })
        await asyncio.to_thread(assistant.start_conversation)

        while True:
            message = await websocket.receive()
            session["last_activity"] = utc_now()
            if message.get("type") == "websocket.disconnect":
                return

            if message.get("bytes") is not None:
                await asyncio.to_thread(assistant.fe_audio_handler, message["bytes"])
                continue

            text = message.get("text")
            if text is None:
                continue

            try:
                payload = json.loads(text)
            except json.JSONDecodeError:
                continue

            audio_base64 = payload.get("_bin")
            if audio_base64:
                try:
                    audio_bytes = base64.b64decode(audio_base64)
                except Exception:
                    await send_json(websocket, {"type": "error", "message": "Invalid audio payload."})
                    continue

                await asyncio.to_thread(assistant.fe_audio_handler, audio_bytes)
                continue

            if payload.get("type") == "command":
                await asyncio.to_thread(assistant.fe_command_handler, payload)
    except WebSocketDisconnect:
        return
    except Exception as exc:
        try:
            await send_json(websocket, {"type": "error", "message": f"Live session failed: {exc}"})
        except RuntimeError:
            return
    finally:
        live_sessions.pop(session_id, None)
        try:
            if assistant.wsc:
                assistant.wsc.close()
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "core_v3.server:app",
        host=os.getenv("CORE_V3_HOST", "127.0.0.1"),
        port=int(os.getenv("CORE_V3_PORT", "8020")),
        reload=os.getenv("CORE_V3_RELOAD", "false").lower() in {"1", "true", "yes"},
    )
