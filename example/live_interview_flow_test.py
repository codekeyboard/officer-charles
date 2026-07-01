#!/usr/bin/env python3
"""Smoke-test dynamic Officer Charles flows through the live websocket."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import requests
import websockets


@dataclass
class EventBatch:
    replies: list[str]
    state: dict[str, Any] | None

    @property
    def last_reply(self):
        return self.replies[-1] if self.replies else ""


class FlowFailure(AssertionError):
    pass


def websocket_url(core_url, session_id):
    parsed = urlparse(core_url)
    scheme = "wss" if parsed.scheme == "https" else "ws"
    return f"{scheme}://{parsed.netloc or parsed.path}/ws/{session_id}"


def create_session(core_url, mode, visa_type):
    response = requests.post(
        f"{core_url.rstrip('/')}/sessions",
        json={"mode": mode, "visa_type": visa_type},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()["session_id"]


async def collect_events(ws, timeout, need_reply=True):
    deadline = time.monotonic() + timeout
    replies = []
    text_buffer = ""
    state = None
    while time.monotonic() < deadline:
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=max(0.1, deadline - time.monotonic()))
        except asyncio.TimeoutError:
            break
        event = json.loads(raw)
        event_type = event.get("type")
        if event_type == "session.state":
            state = event.get("state") or state
        elif event_type == "text.delta":
            text_buffer += str(event.get("delta") or event.get("message") or "")
        elif event_type == "text.completed":
            if text_buffer.strip():
                replies.append(text_buffer.strip())
                return EventBatch(replies, state)
        elif event_type == "direct.reply":
            replies.append(str(event.get("message") or ""))
            return EventBatch(replies, state)
        elif event_type == "error":
            raise FlowFailure(str(event.get("message") or "Unknown websocket error"))
    if need_reply:
        raise FlowFailure("Timed out waiting for assistant response")
    return EventBatch(replies, state)


async def send_text(ws, text, timeout):
    await ws.send(json.dumps({"type": "command", "command": "text", "payload": text}))
    return await collect_events(ws, timeout)


def assert_no_coaching(reply):
    prohibited = ["strengths", "weaknesses", "improvement suggestions", "retry", "score:"]
    found = [term for term in prohibited if term in reply.lower()]
    if found:
        raise FlowFailure(f"Real interview exposed coaching terms {found}: {reply}")


def assert_training_feedback(reply):
    required = ["Score:", "Strengths", "Weaknesses", "Improvement Suggestions", "Retry / Next Step"]
    missing = [term for term in required if term not in reply]
    if missing:
        raise FlowFailure(f"Training response missing {missing}: {reply}")


async def start_flow(core_url, mode, visa_type, timeout):
    session_id = create_session(core_url, mode, visa_type)
    ws = await websockets.connect(websocket_url(core_url, session_id), max_size=64 * 1024 * 1024)
    welcome = await collect_events(ws, timeout)
    if "Choose your practice mode" not in welcome.last_reply:
        raise FlowFailure(f"Missing mode prompt: {welcome.last_reply}")
    await send_text(ws, "Training Session" if mode == "training" else "Real Interview Simulation", timeout)
    documents = await send_text(ws, "F-1 Student Visa" if visa_type == "f1" else "B1/B2 Visitor Visa", timeout)
    if "passport" not in documents.last_reply.lower():
        raise FlowFailure(f"Missing document setup prompt: {documents.last_reply}")
    if documents.state and not documents.state.get("current_question_skippable"):
        raise FlowFailure(f"Document setup prompt was not marked skippable: {documents.state}")
    document_answer = (
        "Here are my valid passport and Form I-20."
        if visa_type == "f1"
        else "Here is my valid passport."
    )
    first = await send_text(ws, document_answer, timeout)
    if not first.last_reply.strip().endswith("?"):
        raise FlowFailure(f"Expected first dynamic question: {first.last_reply}")
    return ws, first


async def run_real(core_url, visa_type, timeout):
    ws, batch = await start_flow(core_url, "interview", visa_type, timeout)
    try:
        questions = [batch.last_reply]
        answers = [
            "My plans are temporary and specific, and I have researched the relevant details carefully.",
            "My family, professional responsibilities, and long-term career remain in my home country.",
            "My funding and return plan are supported by specific family and professional obligations.",
        ]
        for answer in answers:
            batch = await send_text(ws, answer, timeout)
            assert_no_coaching(batch.last_reply)
            if batch.last_reply in questions:
                raise FlowFailure(f"Dynamic interview repeated a question: {batch.last_reply}")
            questions.append(batch.last_reply)
    finally:
        await ws.close()


async def run_training(core_url, visa_type, timeout):
    ws, _ = await start_flow(core_url, "training", visa_type, timeout)
    try:
        batch = await send_text(
            ws,
            "My answer includes a clear reason and several truthful, specific supporting details.",
            timeout,
        )
        assert_training_feedback(batch.last_reply)
    finally:
        await ws.close()


async def run(args):
    health = requests.get(f"{args.core_url.rstrip('/')}/health", timeout=10)
    health.raise_for_status()
    if not health.json().get("openai_configured"):
        raise FlowFailure("OpenAI is not configured")
    visas = ["f1", "b1_b2"] if args.visa == "all" else [args.visa]
    modes = ["interview", "training"] if args.mode == "all" else [args.mode]
    for mode in modes:
        for visa_type in visas:
            if mode == "interview":
                await run_real(args.core_url, visa_type, args.timeout)
            else:
                await run_training(args.core_url, visa_type, args.timeout)
    print("Dynamic live interview smoke test passed.")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--core-url", default="http://127.0.0.1:8020")
    parser.add_argument("--mode", choices=["all", "interview", "training"], default="all")
    parser.add_argument("--visa", choices=["all", "f1", "b1_b2"], default="all")
    parser.add_argument("--timeout", type=float, default=90.0)
    parser.add_argument("--no-wait-audio", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    try:
        asyncio.run(run(parse_args()))
    except KeyboardInterrupt:
        raise SystemExit(130)
    except Exception as exc:
        print(f"FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
