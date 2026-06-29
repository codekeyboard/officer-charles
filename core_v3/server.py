from __future__ import annotations

import asyncio
import base64
import json
import os
import sys
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

from assistants.completion.ChatInterviewAssistant import ChatCompletionError, ChatInterviewAssistant, GeminiConfig
from assistants.realtime.LiveInterviewAssistant import LiveInterviewAssistant


VALID_MODES = {"training", "interview"}
VALID_VISA_TYPES = {"f1", "b1_b2"}
SAMPLE_RATE = int(os.getenv("CORE_V3_SAMPLE_RATE", "24000"))

app = FastAPI(title="Officer Charles Core V3")
live_sessions: dict[str, dict[str, Any]] = {}


class SessionRequest(BaseModel):
    mode: str
    visa_type: str
    visitor_id: str | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class GeminiRequestConfig(BaseModel):
    api_key: str | None = None
    model: str = "gemini-2.5-flash"
    fallback_model: str | None = "gemini-2.5-flash-lite"


class ChatRequest(BaseModel):
    content: str = Field(min_length=1, max_length=10000)
    history: list[ChatMessage] = []
    mode: str
    visa_type: str
    session_target: int = 12
    gemini: GeminiRequestConfig = Field(default_factory=GeminiRequestConfig)


def validate_selection(mode: str, visa_type: str) -> None:
    if mode not in VALID_MODES:
        raise HTTPException(status_code=422, detail="Invalid mode.")
    if visa_type not in VALID_VISA_TYPES:
        raise HTTPException(status_code=422, detail="Invalid visa_type.")


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
def create_session(request: SessionRequest) -> dict[str, str]:
    validate_selection(request.mode, request.visa_type)
    session_id = str(uuid.uuid4())
    live_sessions[session_id] = {
        "mode": request.mode,
        "visa_type": request.visa_type,
        "visitor_id": request.visitor_id,
    }
    return {"session_id": session_id}


@app.post("/chat")
def chat(request: ChatRequest) -> dict[str, Any]:
    validate_selection(request.mode, request.visa_type)
    assistant = ChatInterviewAssistant(
        gemini_config=GeminiConfig(
            api_key=request.gemini.api_key or os.getenv("GEMINI_API_KEY", ""),
            model=request.gemini.model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            fallback_model=request.gemini.fallback_model or os.getenv("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash-lite"),
        ),
        mode=request.mode,
        visa_type=request.visa_type,
        session_target=request.session_target,
    )

    try:
        result = assistant.reply_with_state(
            user_message=request.content,
            history=[message.model_dump() for message in request.history],
        )
    except ChatCompletionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return result


@app.websocket("/ws/{session_id}")
async def websocket_session(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()
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

        await send_json(websocket, {"type": "ready", "sample_rate": SAMPLE_RATE})
        await asyncio.to_thread(assistant.start_conversation)

        while True:
            message = await websocket.receive()
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
