from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests


F1_OPENING = "Good morning. Please provide your passport and your Form I-20."
B1_B2_OPENING = "Good morning. Please provide your passport."
WELCOME_PROMPT = (
    "Welcome to Officer Charles. Choose your practice mode:\n"
    "1. Training Session\n"
    "2. Real Interview Simulation"
)
VISA_PROMPT = (
    "Choose your visa type:\n"
    "1. F-1 Student Visa\n"
    "2. B1/B2 Visitor Visa"
)

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


class ChatCompletionError(RuntimeError):
    pass


@dataclass
class GeminiConfig:
    api_key: str
    model: str
    fallback_model: str | None = None

    @property
    def models(self) -> list[str]:
        models = [self.model]
        if self.fallback_model and self.fallback_model not in models:
            models.append(self.fallback_model)
        return models


class ChatInterviewAssistant:
    def __init__(
        self,
        gemini_config: GeminiConfig,
        mode: str,
        visa_type: str,
        session_target: int = 12,
    ):
        self.gemini_config = gemini_config
        self.mode = mode
        self.visa_type = visa_type
        self.session_target = session_target

    def reply(self, user_message: str, history: list[dict[str, str]]) -> str:
        system_instruction = self._system_instruction(history, user_message)
        contents = self._gemini_contents(history, user_message)
        return self._call_gemini(system_instruction, contents)

    def reply_with_state(self, user_message: str, history: list[dict[str, str]]) -> dict[str, Any]:
        content = self.reply(user_message, history)

        return {
            "content": content,
            "state": self.session_state(history, user_message, content),
        }

    def session_state(
        self,
        history: list[dict[str, str]],
        user_message: str | None = None,
        assistant_response: str | None = None,
    ) -> dict[str, Any]:
        last_assistant = self._last_assistant_content(history)
        selected_mode = self._selected_mode_from_history(history)
        selected_visa_type = self._selected_visa_type_from_history(history)
        phase = "mode_selection"
        current_question = None
        current_question_index = 0
        total_questions = 0
        answered_questions: list[str] = []
        evaluation_ready = False
        completed = False

        if not last_assistant:
            return self._state_payload(
                phase=phase,
                selected_mode=selected_mode,
                selected_visa_type=selected_visa_type,
                current_question=current_question,
                current_question_index=current_question_index,
                total_questions=total_questions,
                answered_questions=answered_questions,
                evaluation_ready=evaluation_ready,
                completed=completed,
            )

        if "Choose your practice mode" in last_assistant:
            selected_mode = self._normalize_mode(user_message or "")
            phase = "visa_selection" if selected_mode else "mode_selection"
            return self._state_payload(
                phase=phase,
                selected_mode=selected_mode,
                selected_visa_type=None,
                current_question=None,
                current_question_index=0,
                total_questions=0,
                answered_questions=[],
                evaluation_ready=False,
                completed=False,
            )

        if "Choose your visa type" in last_assistant:
            selected_mode = selected_mode or self.mode
            selected_visa_type = self._normalize_visa_type(user_message or "")
            if not selected_visa_type:
                return self._state_payload(
                    phase="visa_selection",
                    selected_mode=selected_mode,
                    selected_visa_type=None,
                    current_question=None,
                    current_question_index=0,
                    total_questions=0,
                    answered_questions=[],
                    evaluation_ready=False,
                    completed=False,
                )

            questions = self._questions(selected_visa_type)
            return self._state_payload(
                phase="training" if selected_mode == "training" else "interview",
                selected_mode=selected_mode,
                selected_visa_type=selected_visa_type,
                current_question=questions[0],
                current_question_index=1,
                total_questions=len(questions),
                answered_questions=[],
                evaluation_ready=False,
                completed=False,
            )

        selected_mode = selected_mode or self.mode
        selected_visa_type = selected_visa_type or self.visa_type
        questions = self._questions(selected_visa_type)
        total_questions = len(questions)

        if selected_mode == "training":
            current_question = questions[0]
            answered_questions = [current_question] if (user_message or "").strip() else []
            return self._state_payload(
                phase="training",
                selected_mode=selected_mode,
                selected_visa_type=selected_visa_type,
                current_question=current_question,
                current_question_index=1,
                total_questions=total_questions,
                answered_questions=answered_questions,
                evaluation_ready=False,
                completed=False,
            )

        answered_count = min(self._active_user_answer_count(history, user_message), total_questions)
        completed = bool(assistant_response and "Performance Report" in assistant_response)
        evaluation_ready = completed or answered_count >= total_questions
        phase = "completed" if completed else ("evaluation" if evaluation_ready else "interview")
        current_question_index = min(answered_count + 1, total_questions) if not evaluation_ready else total_questions
        current_question = None if evaluation_ready else questions[max(current_question_index - 1, 0)]
        answered_questions = questions[:answered_count]

        return self._state_payload(
            phase=phase,
            selected_mode=selected_mode,
            selected_visa_type=selected_visa_type,
            current_question=current_question,
            current_question_index=current_question_index,
            total_questions=total_questions,
            answered_questions=answered_questions,
            evaluation_ready=evaluation_ready,
            completed=completed,
        )

    def _system_instruction(self, history: list[dict[str, str]], user_message: str) -> str:
        last_assistant = self._last_assistant_content(history)

        if not last_assistant:
            return self._base_instruction() + f'\n\nSay exactly this and nothing else:\n"{WELCOME_PROMPT}"'

        if "Choose your practice mode" in last_assistant:
            selected_mode = self._normalize_mode(user_message)
            if not selected_mode:
                return self._base_instruction() + f'\n\nSay exactly this and nothing else:\n"{WELCOME_PROMPT}"'
            return self._base_instruction() + f'\n\nSay exactly this and nothing else:\n"{VISA_PROMPT}"'

        if "Choose your visa type" in last_assistant:
            selected_mode = self._selected_mode_from_history(history) or self.mode
            selected_visa_type = self._normalize_visa_type(user_message)
            if not selected_visa_type:
                return self._base_instruction() + f'\n\nSay exactly this and nothing else:\n"{VISA_PROMPT}"'
            return self._start_selected_session(selected_mode, selected_visa_type)

        selected_mode = self._selected_mode_from_history(history) or self.mode
        selected_visa_type = self._selected_visa_type_from_history(history) or self.visa_type
        return self._active_session_instruction(history, selected_mode, selected_visa_type)

    def _base_instruction(self) -> str:
        return (
            "You are Officer Charles, an AI visa interview coach for realistic US visa interview practice.\n"
            "You are NOT a real US government officer. You do NOT make real visa decisions. "
            "You do NOT guarantee approval or denial.\n"
            "Always encourage honesty. Never tell users to create fake answers or misrepresent information.\n"
            "The Python chat completion assistant controls the session step. Follow this instruction exactly."
        )

    def _start_selected_session(self, selected_mode: str, selected_visa_type: str) -> str:
        questions = self._questions(selected_visa_type)
        opening = F1_OPENING if selected_visa_type == "f1" else B1_B2_OPENING

        if selected_mode == "training":
            return (
                f"{self._base_instruction()}\n\n"
                "CHAT COMPLETION SERVICE: Training Session.\n"
                f'Start with this opening: "{opening}"\n'
                f'Then ask this first practice question: "{questions[0]}"\n'
                "Do not provide feedback yet."
            )

        return (
            f"{self._base_instruction()}\n\n"
            "CHAT COMPLETION SERVICE: Real Interview Simulation.\n"
            "Stay in realistic visa officer character. Do not coach, give hints, or provide feedback.\n"
            f'Start with this opening: "{opening}"\n'
            f'Then ask this first question: "{questions[0]}"'
        )

    def _active_session_instruction(self, history: list[dict[str, str]], selected_mode: str, selected_visa_type: str) -> str:
        questions = self._questions(selected_visa_type)
        opening = F1_OPENING if selected_visa_type == "f1" else B1_B2_OPENING

        if selected_mode == "training":
            return (
                f"{self._base_instruction()}\n\n"
                "CHAT COMPLETION SERVICE: Training Session.\n"
                "The user has answered the latest visa practice question. Respond as a supportive visa interview coach.\n"
                "Provide exactly these sections:\n"
                "1. Strengths\n"
                "- What the applicant did well\n"
                "2. Weaknesses\n"
                "- What was unclear\n"
                "- Missing information\n"
                "- Possible concerns\n"
                "3. Improvement Suggestions\n"
                "- How to make the answer clearer\n"
                "- How to communicate better\n"
                "4. Retry\n"
                "- Ask the applicant to answer the same question again.\n"
                "Teach, explain mistakes, encourage honesty, and never invent fake answers for the applicant."
            )

        answered_questions = self._active_assistant_turns(history)
        if answered_questions >= min(self.session_target, len(questions)):
            return self._evaluation_instruction(self._base_instruction())

        next_index = min(answered_questions, len(questions) - 1)
        return (
            f"{self._base_instruction()}\n\n"
            "CHAT COMPLETION SERVICE: Real Interview Simulation.\n"
            "Stay in realistic visa officer character. Do not coach, give hints, explain mistakes, or provide feedback.\n"
            "Ask exactly one question at a time.\n"
            f'Ask this next realistic officer question: "{questions[next_index]}"\n'
            "If the user's answer is unclear, ask one concise follow-up instead of moving ahead."
        )

    def _evaluation_instruction(self, base: str) -> str:
        return (
            f"{base}\n\n"
            "CHAT COMPLETION SERVICE: Real Interview Simulation complete.\n"
            "Create an Interview Performance Report now. Do not ask another interview question.\n"
            "Include:\n"
            "1. Overall Performance Score with overall percentage.\n"
            "Categories: Communication (Clarity, Organization), Confidence (Calmness, Delivery), "
            "Purpose of Travel (Understanding, Explanation), Financial Explanation (Ability to explain funding), "
            "Consistency (Whether answers match each other).\n"
            "2. What Went Well: strong answers, good communication, progress.\n"
            "3. Areas To Improve: weak answers, missing details, unclear explanations.\n"
            "4. Recommended Next Steps: practice weak questions, improve explanations, repeat simulation, build confidence.\n"
            "End with a motivational message. Never guarantee visa approval."
        )

    def _questions(self, visa_type: str | None = None) -> list[str]:
        return F1_QUESTIONS if (visa_type or self.visa_type) == "f1" else B1_B2_QUESTIONS

    def _last_assistant_content(self, history: list[dict[str, str]]) -> str:
        for message in reversed(history):
            if message.get("role") == "assistant":
                return str(message.get("content", ""))
        return ""

    def _selected_mode_from_history(self, history: list[dict[str, str]]) -> str | None:
        for index, message in enumerate(history):
            if message.get("role") == "assistant" and "Choose your practice mode" in str(message.get("content", "")):
                next_user = self._next_user_content(history, index)
                selected = self._normalize_mode(next_user)
                if selected:
                    return selected
        return None

    def _selected_visa_type_from_history(self, history: list[dict[str, str]]) -> str | None:
        for index, message in enumerate(history):
            if message.get("role") == "assistant" and "Choose your visa type" in str(message.get("content", "")):
                next_user = self._next_user_content(history, index)
                selected = self._normalize_visa_type(next_user)
                if selected:
                    return selected
        return None

    def _next_user_content(self, history: list[dict[str, str]], start_index: int) -> str:
        for message in history[start_index + 1:]:
            if message.get("role") == "user":
                return str(message.get("content", ""))
        return ""

    def _active_assistant_turns(self, history: list[dict[str, str]]) -> int:
        turns = 0
        for message in history:
            if message.get("role") != "assistant":
                continue
            content = str(message.get("content", ""))
            if "Choose your practice mode" in content or "Choose your visa type" in content:
                continue
            if "Interview Performance Report" in content:
                continue
            turns += 1
        return turns

    def _active_user_answer_count(self, history: list[dict[str, str]], user_message: str | None = None) -> int:
        session_started = False
        count = 0
        for message in history:
            content = str(message.get("content", ""))
            if message.get("role") == "assistant" and "Choose your visa type" in content:
                session_started = True
                continue
            if not session_started or message.get("role") != "user":
                continue
            if self._normalize_visa_type(content):
                continue
            count += 1

        if user_message and user_message.strip() and not self._normalize_visa_type(user_message):
            count += 1

        return count

    def _state_payload(
        self,
        phase: str,
        selected_mode: str | None,
        selected_visa_type: str | None,
        current_question: str | None,
        current_question_index: int,
        total_questions: int,
        answered_questions: list[str],
        evaluation_ready: bool,
        completed: bool,
    ) -> dict[str, Any]:
        return {
            "experience": "chat",
            "phase": phase,
            "selected_mode": selected_mode,
            "selected_visa_type": selected_visa_type,
            "interview_status": phase,
            "current_question": current_question,
            "current_question_index": current_question_index,
            "total_questions": total_questions,
            "answered_questions": answered_questions,
            "last_answer_quality": None,
            "evaluation_ready": evaluation_ready,
            "completed": completed,
        }

    def _normalize_mode(self, value: str) -> str | None:
        value = str(value or "").strip().lower()
        if value in {"1", "training", "training session", "coach", "coach mode"}:
            return "training"
        if value in {"2", "interview", "real interview", "real interview simulation", "simulation"}:
            return "interview"
        return None

    def _normalize_visa_type(self, value: str) -> str | None:
        value = str(value or "").strip().lower().replace("-", "").replace("/", "")
        if value in {"1", "f1", "f 1", "student", "student visa", "f1 student visa"}:
            return "f1"
        if value in {"2", "b1b2", "b1 b2", "visitor", "visitor visa", "b1b2 visitor visa"}:
            return "b1_b2"
        return None

    def _gemini_contents(self, history: list[dict[str, str]], user_message: str) -> list[dict[str, Any]]:
        contents = []
        for message in history:
            role = message.get("role")
            if role not in {"user", "assistant"}:
                continue
            contents.append({
                "role": "model" if role == "assistant" else "user",
                "parts": [{"text": str(message.get("content", ""))}],
            })

        contents.append({
            "role": "user",
            "parts": [{"text": user_message}],
        })
        return contents

    def _call_gemini(self, system_instruction: str, contents: list[dict[str, Any]]) -> str:
        if not self.gemini_config.api_key:
            raise ChatCompletionError("Gemini API key is not configured.")

        payload = {
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "contents": contents,
        }

        last_error = "No response received."
        for model in self.gemini_config.models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            try:
                response = requests.post(
                    url,
                    params={"key": self.gemini_config.api_key},
                    headers={"Content-Type": "application/json"},
                    json=payload,
                    timeout=45,
                )
            except requests.RequestException as exc:
                last_error = f"Could not connect to Gemini: {exc}"
                continue

            if response.status_code < 400:
                data = response.json()
                return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text") or "No response received."

            last_error = f"Gemini request failed with status {response.status_code}: {response.text[:500]}"
            if response.status_code not in {429, 503, 504}:
                break

        raise ChatCompletionError(last_error)
