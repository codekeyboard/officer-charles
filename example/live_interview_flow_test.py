#!/usr/bin/env python3
"""Smoke-test Officer Charles live interview flows against a running Core V3 server.

This script uses the same live websocket path as the frontend, but sends text
commands instead of microphone audio so the test is repeatable.
"""

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


F1_QUESTIONS = [
    "Tell me about your academic background.",
    "Why did you choose this university?",
    "Why did you choose this program?",
    "Why do you want to study in the United States?",
    "What are your future career goals?",
    "How will you pay for your studies?",
    "Who is sponsoring your education?",
    "What ties do you have to your home country?",
    "Tell me about your previous education.",
    "Have you traveled internationally before?",
]

B1_B2_QUESTIONS = [
    "What is the purpose of your visit to the United States?",
    "Where will you be traveling in the United States?",
    "How long do you plan to stay?",
    "Who is paying for your trip?",
    "What is your current employment or business situation?",
    "What family ties do you have in your home country?",
    "What are your return plans?",
    "Tell me about your previous travel history.",
]


REAL_ANSWERS = {
    "f1": {
        F1_QUESTIONS[0]: "Here is my passport and my Form I-20. I completed a bachelor degree in computer science at my university.",
        F1_QUESTIONS[1]: "I chose this university because it has strong faculty, a good reputation, and affordable tuition.",
        F1_QUESTIONS[2]: "I chose this program because the computer science curriculum matches my career goals.",
        F1_QUESTIONS[3]: "I want to study in the United States because the education quality and career opportunities are strong.",
        F1_QUESTIONS[4]: "My future career goal is to return home and work as a software engineer.",
        F1_QUESTIONS[5]: "My parents will pay for my studies using family savings and bank funds.",
        F1_QUESTIONS[6]: "My father is sponsoring my education.",
        F1_QUESTIONS[7]: "My family, home, and future job are strong ties to my home country.",
        F1_QUESTIONS[8]: "I completed my bachelor degree in computer science at my previous university.",
        F1_QUESTIONS[9]: "No, I have not traveled internationally before.",
    },
    "b1_b2": {
        B1_B2_QUESTIONS[0]: "Here is my passport. I want to visit the United States for tourism and to see New York.",
        B1_B2_QUESTIONS[1]: "I want to travel the whole streets and visit several cities.",
        B1_B2_QUESTIONS[2]: "I plan to stay for two weeks.",
        B1_B2_QUESTIONS[3]: "My father is paying for my trip.",
        B1_B2_QUESTIONS[4]: "I am employed as a software engineer at a company.",
        B1_B2_QUESTIONS[5]: "My parents, siblings, and family home are in my home country.",
        B1_B2_QUESTIONS[6]: "I will return home after two weeks to resume my job.",
        B1_B2_QUESTIONS[7]: "I visited Turkey and Dubai before.",
    },
}

TRAINING_ANSWERS = {
    "f1": {
        question: (
            f"For this question, {answer} I will answer honestly, clearly, and provide documents if requested."
        )
        for question, answer in REAL_ANSWERS["f1"].items()
    },
    "b1_b2": {
        question: (
            f"For this question, {answer} I will answer honestly, clearly, and provide documents if requested."
        )
        for question, answer in REAL_ANSWERS["b1_b2"].items()
    },
}


@dataclass
class EventBatch:
    replies: list[str]
    state: dict[str, Any] | None
    ready: bool = False

    @property
    def last_reply(self) -> str:
        return self.replies[-1] if self.replies else ""


class FlowFailure(AssertionError):
    pass


def websocket_url(core_url: str, session_id: str) -> str:
    parsed = urlparse(core_url)
    scheme = "wss" if parsed.scheme == "https" else "ws"
    netloc = parsed.netloc or parsed.path
    return f"{scheme}://{netloc}/ws/{session_id}"


def create_session(core_url: str, mode: str, visa_type: str) -> str:
    response = requests.post(
        f"{core_url.rstrip('/')}/sessions",
        json={"mode": mode, "visa_type": visa_type},
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json()
    return payload["session_id"]


def assert_health(core_url: str) -> None:
    response = requests.get(f"{core_url.rstrip('/')}/health", timeout=10)
    response.raise_for_status()
    payload = response.json()
    if not payload.get("ok"):
        raise FlowFailure(f"Core health check failed: {payload}")
    if not payload.get("openai_configured"):
        raise FlowFailure("Core is running, but OPENAI_KEY/OPENAI_API_KEY is not configured.")


async def collect_events(
    ws: websockets.ClientConnection,
    *,
    timeout: float,
    need_reply: bool = True,
    wait_for_audio: bool = True,
) -> EventBatch:
    deadline = time.monotonic() + timeout
    audio_deadline: float | None = None
    replies: list[str] = []
    state: dict[str, Any] | None = None
    ready = False

    while time.monotonic() < deadline:
        remaining = max(0.1, deadline - time.monotonic())
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        except asyncio.TimeoutError as exc:
            if need_reply and not replies:
                raise FlowFailure(f"Timed out waiting for assistant reply after {timeout:.1f}s") from exc
            return EventBatch(replies=replies, state=state, ready=ready)

        try:
            event = json.loads(raw)
        except json.JSONDecodeError:
            continue

        event_type = event.get("type")
        if event_type == "ready":
            ready = True
        elif event_type == "session.state":
            state = event.get("state") or state
        elif event_type == "direct.reply":
            replies.append(str(event.get("message") or ""))
            if wait_for_audio:
                audio_deadline = time.monotonic() + min(8.0, max(1.0, timeout / 3))
            else:
                return EventBatch(replies=replies, state=state, ready=ready)
        elif event_type == "direct.audio":
            if replies:
                return EventBatch(replies=replies, state=state, ready=ready)
        elif event_type == "error":
            raise FlowFailure(str(event.get("message") or "Unknown websocket error."))

        if replies and audio_deadline is not None and time.monotonic() >= audio_deadline:
            return EventBatch(replies=replies, state=state, ready=ready)

    if need_reply and not replies:
        raise FlowFailure(f"Timed out waiting for assistant reply after {timeout:.1f}s")
    return EventBatch(replies=replies, state=state, ready=ready)


async def send_text(
    ws: websockets.ClientConnection,
    text: str,
    *,
    timeout: float,
    wait_for_audio: bool,
) -> EventBatch:
    await ws.send(json.dumps({"type": "command", "command": "text", "payload": text}))
    return await collect_events(ws, timeout=timeout, need_reply=True, wait_for_audio=wait_for_audio)


def questions_for_visa(visa_type: str) -> list[str]:
    return F1_QUESTIONS if visa_type == "f1" else B1_B2_QUESTIONS


def mode_phrase(mode: str) -> str:
    return "I want the real interview simulation." if mode == "interview" else "I want the training session."


def visa_phrase(visa_type: str) -> str:
    return "F1 student visa." if visa_type == "f1" else "B1/B2 visitor visa."


def state_question(state: dict[str, Any] | None) -> str | None:
    return str((state or {}).get("current_question") or "") or None


def state_phase(state: dict[str, Any] | None) -> str:
    return str((state or {}).get("phase") or "")


async def connect_and_setup(
    core_url: str,
    *,
    mode: str,
    visa_type: str,
    timeout: float,
    wait_for_audio: bool,
) -> tuple[websockets.ClientConnection, EventBatch]:
    session_id = create_session(core_url, mode=mode, visa_type=visa_type)
    ws = await websockets.connect(websocket_url(core_url, session_id), max_size=64 * 1024 * 1024)

    initial = await collect_events(ws, timeout=timeout, need_reply=True, wait_for_audio=wait_for_audio)
    if "Choose your practice mode" not in initial.last_reply:
        raise FlowFailure(f"Expected mode prompt, got: {initial.last_reply}")

    mode_batch = await send_text(ws, mode_phrase(mode), timeout=timeout, wait_for_audio=wait_for_audio)
    if "Choose your visa type" not in mode_batch.last_reply:
        raise FlowFailure(f"Expected visa prompt, got: {mode_batch.last_reply}")

    visa_batch = await send_text(ws, visa_phrase(visa_type), timeout=timeout, wait_for_audio=wait_for_audio)
    first_question = questions_for_visa(visa_type)[0]
    if first_question not in visa_batch.last_reply:
        raise FlowFailure(f"Expected first question {first_question!r}, got: {visa_batch.last_reply}")

    return ws, visa_batch


async def run_noisy_setup_regression(core_url: str, timeout: float, wait_for_audio: bool) -> None:
    print("[noise] connecting")
    session_id = create_session(core_url, mode="interview", visa_type="f1")
    ws = await websockets.connect(websocket_url(core_url, session_id), max_size=64 * 1024 * 1024)

    try:
        initial = await collect_events(ws, timeout=timeout, need_reply=True, wait_for_audio=wait_for_audio)
        if "Choose your practice mode" not in initial.last_reply:
            raise FlowFailure(f"Expected mode prompt, got: {initial.last_reply}")

        disclaimer = await send_text(
            ws,
            "Please see the complete disclaimer at https://sites.google.com.au",
            timeout=timeout,
            wait_for_audio=wait_for_audio,
        )
        if "Choose your practice mode" not in disclaimer.last_reply:
            raise FlowFailure(f"Disclaimer/noise advanced mode selection: {disclaimer.last_reply}")

        mode_batch = await send_text(
            ws,
            "I want the real interview simulation.",
            timeout=timeout,
            wait_for_audio=wait_for_audio,
        )
        if "Choose your visa type" not in mode_batch.last_reply:
            raise FlowFailure(f"Expected visa prompt after valid mode selection, got: {mode_batch.last_reply}")

        meta_batch = await send_text(
            ws,
            "Transcribe in English only.",
            timeout=timeout,
            wait_for_audio=wait_for_audio,
        )
        if "Choose your visa type" not in meta_batch.last_reply:
            raise FlowFailure(f"Meta transcription text advanced visa selection: {meta_batch.last_reply}")

        await ws.send(json.dumps({"type": "command", "command": "commit"}))
        no_reply = await collect_events(ws, timeout=3.0, need_reply=False, wait_for_audio=wait_for_audio)
        if no_reply.replies:
            raise FlowFailure(f"Empty audio commit produced an assistant reply: {no_reply.last_reply}")

        visa_batch = await send_text(ws, "Visa type is 1.", timeout=timeout, wait_for_audio=wait_for_audio)
        if F1_QUESTIONS[0] not in visa_batch.last_reply:
            raise FlowFailure(f"Expected F-1 first question after valid visa selection, got: {visa_batch.last_reply}")

        partial_batch = await send_text(ws, "My passport is ABCDOT.", timeout=timeout, wait_for_audio=wait_for_audio)
        if "Form I-20" not in partial_batch.last_reply or "academic background" not in partial_batch.last_reply:
            raise FlowFailure(f"Passport-only answer did not request missing fields: {partial_batch.last_reply}")

        form_only_batch = await send_text(ws, "Form ID is ABCD123.", timeout=timeout, wait_for_audio=wait_for_audio)
        if "Why did you choose this university?" in form_only_batch.last_reply:
            raise FlowFailure("Form-only answer advanced to the university question.")
        if "academic background" not in form_only_batch.last_reply:
            raise FlowFailure(f"Form-only answer did not keep academic background missing: {form_only_batch.last_reply}")

        print("[noise] setup and partial-answer fallback ok")
    finally:
        await ws.close()


async def run_real_interview(core_url: str, visa_type: str, timeout: float, wait_for_audio: bool) -> None:
    print(f"[real:{visa_type}] connecting")
    ws, batch = await connect_and_setup(
        core_url,
        mode="interview",
        visa_type=visa_type,
        timeout=timeout,
        wait_for_audio=wait_for_audio,
    )

    try:
        questions = questions_for_visa(visa_type)
        current_state = batch.state

        if visa_type == "f1":
            before_question = state_question(current_state)
            bad_batch = await send_text(
                ws,
                "My passport is ABCD only.",
                timeout=timeout,
                wait_for_audio=wait_for_audio,
            )
            if state_question(bad_batch.state) != before_question:
                raise FlowFailure("F-1 passport-only answer advanced the first question.")
            print(f"[real:{visa_type}] partial-answer fallback ok")

        for index, question in enumerate(questions):
            answer = REAL_ANSWERS[visa_type][question]
            batch = await send_text(ws, answer, timeout=timeout, wait_for_audio=wait_for_audio)
            current_state = batch.state
            phase = state_phase(current_state)
            next_question = state_question(current_state)
            print(f"[real:{visa_type}] answered {index + 1}/{len(questions)} -> phase={phase} next={next_question!r}")

            if index < len(questions) - 1:
                expected_next = questions[index + 1]
                if next_question != expected_next:
                    raise FlowFailure(
                        f"Expected next question {expected_next!r} after {question!r}, got {next_question!r}. "
                        f"Reply: {batch.last_reply}"
                    )
            elif phase not in {"evaluation", "completed"} and "Interview Performance Report" not in batch.last_reply:
                raise FlowFailure(f"Expected final interview report after last question, got phase={phase!r}")
    finally:
        await ws.close()


async def run_training(core_url: str, visa_type: str, timeout: float, wait_for_audio: bool) -> None:
    print(f"[training:{visa_type}] connecting")
    ws, batch = await connect_and_setup(
        core_url,
        mode="training",
        visa_type=visa_type,
        timeout=timeout,
        wait_for_audio=wait_for_audio,
    )

    try:
        questions = questions_for_visa(visa_type)
        index = 0
        attempts_for_question = 0

        while index < len(questions):
            state = batch.state
            current_question = state_question(state) or questions[index]
            expected_question = questions[index]
            if current_question != expected_question:
                raise FlowFailure(f"Training expected {expected_question!r}, got {current_question!r}")

            attempts_for_question += 1
            answer = TRAINING_ANSWERS[visa_type][current_question]
            if attempts_for_question > 1:
                answer += " I am adding more specific details about dates, documents, reasons, and my plan to return home."

            batch = await send_text(ws, answer, timeout=timeout, wait_for_audio=wait_for_audio)
            phase = state_phase(batch.state)
            next_question = state_question(batch.state)
            next_index = questions.index(next_question) if next_question in questions else len(questions)

            print(
                f"[training:{visa_type}] answered {index + 1}/{len(questions)} "
                f"attempt={attempts_for_question} -> phase={phase} next={next_question!r}"
            )

            if phase in {"evaluation", "completed"} or "Training Session Complete" in batch.last_reply:
                index = len(questions)
                break

            if next_index > index:
                index = next_index
                attempts_for_question = 0
                continue

            if attempts_for_question >= 2:
                batch = await send_text(ws, "Please skip this question.", timeout=timeout, wait_for_audio=wait_for_audio)
                next_question = state_question(batch.state)
                next_index = questions.index(next_question) if next_question in questions else len(questions)
                if next_index <= index and state_phase(batch.state) not in {"evaluation", "completed"}:
                    raise FlowFailure(f"Training stuck on {current_question!r} after retries and skip.")
                index = next_index
                attempts_for_question = 0

        if index < len(questions):
            raise FlowFailure(f"Training did not finish {visa_type}; stopped at question {index + 1}.")
    finally:
        await ws.close()


async def run(args: argparse.Namespace) -> None:
    assert_health(args.core_url)
    if not args.skip_noise:
        await run_noisy_setup_regression(args.core_url, args.timeout, not args.no_wait_audio)

    scenarios: list[tuple[str, str]] = []
    visas = ["f1", "b1_b2"] if args.visa == "all" else [args.visa]
    modes = ["interview", "training"] if args.mode == "all" else [args.mode]

    for mode in modes:
        for visa_type in visas:
            scenarios.append((mode, visa_type))

    for mode, visa_type in scenarios:
        if mode == "interview":
            await run_real_interview(args.core_url, visa_type, args.timeout, not args.no_wait_audio)
        else:
            await run_training(args.core_url, visa_type, args.timeout, not args.no_wait_audio)

    print("Live interview smoke test passed.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Smoke-test Officer Charles live interview flows.")
    parser.add_argument("--core-url", default="http://127.0.0.1:8020", help="Core V3 base URL.")
    parser.add_argument("--mode", choices=["all", "interview", "training"], default="all")
    parser.add_argument("--visa", choices=["all", "f1", "b1_b2"], default="all")
    parser.add_argument("--timeout", type=float, default=90.0, help="Seconds to wait for each assistant reply.")
    parser.add_argument(
        "--no-wait-audio",
        action="store_true",
        help="Do not wait for direct.audio after direct.reply. Faster, but less close to the frontend flow.",
    )
    parser.add_argument(
        "--skip-noise",
        action="store_true",
        help="Skip noisy setup regression prompts.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    try:
        asyncio.run(run(parse_args()))
    except KeyboardInterrupt:
        raise SystemExit(130)
    except Exception as exc:
        print(f"FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
