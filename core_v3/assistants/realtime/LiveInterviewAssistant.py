import json
import os
import re
import sys
from base64 import b64encode

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

import requests

from core.realtime.RealtimeCoreOpenAI import RealtimeCoreOpenAI
from core.util.classes.WSC import WSC
from core.util.functions.debug import d, debug
from core.util.functions.env import env


WELCOME_PROMPT = (
    'Welcome to Officer Charles. Choose your practice mode:\n'
    '1. Training Session\n'
    '2. Real Interview Simulation'
)

VISA_PROMPT = (
    'Choose your visa type:\n'
    '1. F-1 Student Visa\n'
    '2. B1/B2 Visitor Visa'
)

F1_OPENING = "Good morning. Please provide your passport and your Form I-20."
B1_B2_OPENING = "Good morning. Please provide your passport."

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


class LiveInterviewAssistant(RealtimeCoreOpenAI):
    DEBUG = 1

    def __init__(
        self,
        api_key=env("OPENAI_KEY", env("OPENAI_API_KEY", None)),
        setup=False,
        wss_host="127.0.0.1",
        wss_port=6123,
        text_only=False,
        use_default_plugins=False,
        **kwargs
    ):
        super().__init__(
            api_key=api_key,
            setup=False,
            wss_host=wss_host,
            wss_port=wss_port,
            use_default_plugins=use_default_plugins,
            text_only=text_only,
            **kwargs
        )

        self.DEBUG = 1
        self.core = self
        self.post_reply = False
        self.text_call = False
        self.modalities = ["text", "audio"]
        self.conversational_lang = "en"
        self.WSC_EVENT_HANDLERS.update({
            "response.output_audio.delta": self.rt_audio_delta_handler,
            "response.output_audio_transcript.delta": self.rt_response_transcription_delta,
            "response.output_audio_transcript.done": self.rt_assistant_reply_handler,
            "response.output_text.delta": self.rt_text_delta_handler,
            "response.output_text.done": self.rt_response_text_done,
        })
        self.MESSAGE_LISTENERS.setdefault("user", []).append(self._remember_user_message)
        self._last_user_message = None

        self.use([
            "payload",
            "service",
            "local_storage",
        ])

        self.set_services({
            "unknown": self.service_start,
            "start": self.service_start,
            "mode_selection": self.service_mode_selection,
            "visa_selection": self.service_visa_selection,
            "training": self.service_training,
            "interview": self.service_interview,
        })
        self.set_service_resets(False)

        self.set_default_payload({
            "service_type": None,
            "selected_mode": None,
            "selected_visa_type": None,
            "user_answer": None,
            "answered_current_question": None,
            "answer_is_unclear": None,
            "answer_score": None,
            "strengths": None,
            "weaknesses": None,
            "suggestions": None,
            "wants_next_question": None,
            "cancel_current_request": None,
        })

        self.set_default_local_storage({
            "phase": "mode_selection",
            "selected_mode": None,
            "selected_visa_type": None,
            "current_question": None,
            "question_index": 0,
            "answers": [],
            "question_payloads": {},
            "training_scores": [],
            "training_attempts": {},
            "training_answered_questions": [],
            "skipped_questions": [],
            "training_results": [],
            "questions": [],
            "evaluation_done": False,
        })

        if setup:
            self.setup()

    def setup(self):
        is_setup = super().setup()
        self.tools_map["process_admin"] = self.handle_process_admin
        return is_setup

    def create_session(self):
        if not self.api_key:
            debug(f"[{self.CLASS_NAME}] FATAL: OpenAI API key is missing.")
            return False

        self.session = {"server_side": True}
        self.empherial_secret = self.api_key
        return True

    def setup_wsc(self):
        self.wsc_url = "wss://api.openai.com/v1/realtime?model=" + self.config.get("llm", "gpt-realtime-mini")
        self.wsc = WSC(
            self.wsc_url,
            header=[
                f"Authorization: Bearer {self.empherial_secret}",
            ],
            on_open=self.wsc_open,
            on_message=self.wsc_message,
            on_error=self.wsc_error,
            on_close=self.wsc_close,
        )

        if self.DEBUG:
            d(f"[{self.CLASS_NAME}] OpenAI Starting.")
        self.wsc.run_forever(threaded=True)
        if self.DEBUG:
            d(f"[{self.CLASS_NAME}] OpenAI Ready.")

    def wsc_open(self, ws):
        if self.wsc_waiting_for == "ws_open":
            self.wsc_waiting_for = None

        voice = self.voice or self.config.get("voice", "ash")
        self.wsc_send({
            "type": "session.update",
            "session": {
                "type": "realtime",
                "instructions": self.instructions,
                "tools": self.tools or [],
                "tool_choice": "auto" if self.tools else "none",
                "output_modalities": ["audio"],
                "audio": {
                    "input": {
                        "transcription": {
                            "model": self.config.get("stt", "whisper-1"),
                            "language": self.config.get("stt_language", "en"),
                            "prompt": self.config.get(
                                "stt_prompt",
                                "The applicant is speaking English during a US visa interview practice session.",
                            ),
                        },
                        "turn_detection": {
                            "type": "server_vad",
                            "threshold": self.config.get("threshold", 0.5),
                            "prefix_padding_ms": self.config.get("prefix_padding_ms", 300),
                            "silence_duration_ms": self.config.get("silence_duration_ms", 500),
                            "create_response": False,
                            "interrupt_response": False,
                        },
                    },
                    "output": {
                        "voice": voice,
                    },
                },
            },
        })

    def rt_request_reply(self, guidelines=None, reply=True):
        output_modalities = ["audio"]
        if self.text_call:
            output_modalities = ["text"]
            self.text_call = False

        self._ensure_response_done()
        if not reply:
            self.rt_call_next_function(toggle=False)
            return

        response = {
            "output_modalities": output_modalities,
            "tool_choice": "none",
        }
        if guidelines is not None:
            response["instructions"] = self._strict_exact_speech(guidelines)
            if self._is_exact_speech(guidelines):
                response["conversation"] = "none"

        self.wsc_send({
            "type": "response.create",
            "response": response,
        })

    def rt_request_function(self):
        self.wsc_clearlog("response.output_item.added")
        self.wsc_clearlog("response.function_call_arguments.done")

        self._ensure_response_done()
        self.wsc_send({
            "type": "response.create",
            "response": {
                "output_modalities": ["text"],
                "tool_choice": "required",
                "tools": self.tools or [],
            },
        })

        name = None
        max_retries = 10
        retries = 0
        while not name and retries < max_retries:
            retries += 1
            self.wsc_wait("response.output_item.added", timeout=10)
            response_event_log = self.wsc_event_logs.get("response.output_item.added", {})
            if response_event_log is None:
                continue
            name = response_event_log.get("item", {}).get("name")

        if name is None:
            return

        self.wsc_wait("response.function_call_arguments.done")
        arguments = self.wsc_event_logs.get("response.function_call_arguments.done", {})
        if arguments is None:
            return

        arguments = json.loads(arguments.get("arguments", "{}"))
        self.function_called = True

        if name in self.tools_map:
            self.function_name = name
            self.function_arguments = arguments
            self.function_output = self.tools_map[name](arguments)

            if self.function_output:
                if self._is_exact_speech(self.function_output):
                    self._send_direct_assistant_text(self._exact_speech_message(self.function_output))
                    return

                should_reply_now = self.pre_reply if self.next_pre_reply is None else self.next_pre_reply
                self.rt_request_reply(
                    guidelines=self.function_output,
                    reply=should_reply_now,
                )
        else:
            debug(f"[{self.CLASS_NAME}] WSC: Function called by OpenAI does not exist: {name}")

    def rt_transcription_handler(self, payload):
        if not str(payload.get("transcript") or "").strip():
            debug(f"[{self.CLASS_NAME}] Ignoring empty transcription.")
            return

        super().rt_transcription_handler(payload)

    def start_conversation(self):
        self.function_call_enabled = True
        self._emit_session_state("mode_selection")
        self._send_direct_assistant_text(WELCOME_PROMPT)

    def handle_process_admin(self, arguments):
        arguments = self._arguments_with_raw_user_answer(arguments)

        if arguments.get("cancel_current_request"):
            self._reset_interview_state()
            self.sync_service({"service_type": "mode_selection"})
            return self._prompt_mode_selection()

        self.sync_payload(arguments)
        service_type = self._current_service_type()
        self.sync_service({"service_type": service_type})
        return self.call_service(arguments)

    def service_start(self, arguments):
        self._reset_interview_state()
        return self._prompt_mode_selection()

    def service_mode_selection(self, arguments):
        selected_mode = self._normalize_mode(arguments.get("user_answer"))
        if not selected_mode:
            return self._prompt_mode_selection()

        self.local_set("selected_mode", selected_mode)
        self.local_set("phase", "visa_selection")
        self.sync_service({"service_type": "visa_selection"})
        self.set_sub_category("choose visa")
        return self._prompt_visa_selection()

    def service_visa_selection(self, arguments):
        selected_visa_type = self._normalize_visa_type(
            arguments.get("user_answer")
        )
        if not selected_visa_type:
            return self._prompt_visa_selection()

        self.local_set("selected_visa_type", selected_visa_type)
        self.local_set("question_index", 0)
        self.local_set("answers", [])
        self.local_set("question_payloads", {})
        self.local_set("training_scores", [])
        self.local_set("training_attempts", {})
        self.local_set("training_answered_questions", [])
        self.local_set("skipped_questions", [])
        self.local_set("training_results", [])
        self.local_set("questions", self._questions_for_visa(selected_visa_type))
        self.local_set("evaluation_done", False)

        selected_mode = self.local_get("selected_mode")
        next_service = "training" if selected_mode == "training" else "interview"
        self.local_set("phase", next_service)
        self.sync_service({"service_type": next_service})
        self.set_sub_category("active")

        opening = F1_OPENING if selected_visa_type == "f1" else B1_B2_OPENING
        first_question = self._current_question()
        self.local_set("current_question", first_question)
        self._emit_session_state(next_service)
        return self._say_exactly(f"{opening}\n{first_question}")

    def service_training(self, arguments):
        missing_prompt = self._missing_state_prompt()
        if missing_prompt:
            return missing_prompt

        answer = self._answer_from(arguments)
        current_question = self.local_get("current_question") or self._current_question()
        self.local_set("current_question", current_question)

        if not answer:
            self._emit_session_state("training")
            return self._say_exactly(current_question)

        if self._is_skip_request(answer, arguments):
            self._record_training_result(current_question, answer, arguments, skipped=True)
            self._advance_question()
            if self._question_index() >= len(self.local_get("questions") or []):
                self.local_set("evaluation_done", True)
                self.local_set("phase", "evaluation")
                self._emit_session_state("evaluation")
                return self._training_completion_report()

            current_question = self._set_current_question_from_index()
            self._emit_session_state("training")
            return self._say_exactly(current_question)

        if self._answer_is_off_context(current_question, answer, arguments):
            self._emit_session_state("training")
            return self._say_exactly(f"Please answer the question: {current_question}")

        score = self._answer_score(arguments, answer)
        self._record_training_result(current_question, answer, arguments, score=score)

        if score >= 80:
            self._advance_question()
            if self._question_index() >= len(self.local_get("questions") or []):
                self.local_set("evaluation_done", True)
                self.local_set("phase", "evaluation")
                self._emit_session_state("evaluation")
                return self._training_completion_report()

            current_question = self._set_current_question_from_index()
            self._emit_session_state("training")
            return self._say_exactly(current_question)

        self._emit_session_state("training")
        return self._training_feedback_prompt(current_question, answer, arguments, score)

    def service_interview(self, arguments):
        missing_prompt = self._missing_state_prompt()
        if missing_prompt:
            return missing_prompt

        if self.local_get("evaluation_done"):
            self._emit_session_state("completed")
            return self._interview_completion_message()

        answer = self._answer_from(arguments)
        questions = self.local_get("questions") or self._questions_for_visa(self.local_get("selected_visa_type"))
        index = int(self.local_get("question_index") or 0)

        if not answer:
            self._emit_session_state("interview")
            return self._ask_interview_question(index, questions)

        current_question = questions[index] if index < len(questions) else questions[-1]
        required_slots = self._required_slots_for_question(current_question)
        extracted_slots = self._extract_answer_slots(current_question, answer, arguments)

        if required_slots:
            if extracted_slots:
                self._merge_question_payload(current_question, extracted_slots)

            missing_slots = self._missing_slots_for_question(current_question)
            if missing_slots:
                self._emit_session_state("interview")
                return self._say_exactly(self._missing_slots_prompt(current_question, missing_slots))

        if (
            self._answer_is_off_context(current_question, answer, arguments)
            or not self._question_specific_answer_valid(current_question, answer)
        ):
            self._emit_session_state("interview")
            return self._say_exactly(self._interview_fallback_prompt(current_question))

        answers = self.local_get("answers") or []
        answers.append(self._interview_answer_record(current_question, answer))
        self.local_set("answers", answers)

        index += 1
        self.local_set("question_index", index)
        if index >= len(questions):
            self.local_set("evaluation_done", True)
            self.local_set("phase", "evaluation")
            self._emit_session_state("evaluation")
            return self._evaluation_prompt(answers)

        self.local_set("current_question", questions[index])
        self._emit_session_state("interview")
        return self._say_exactly(questions[index])

    def _ask_interview_question(self, index, questions):
        question = questions[index] if index < len(questions) else questions[-1]
        self.local_set("current_question", question)
        return self._say_exactly(question)

    def _evaluation_prompt(self, answers):
        answered_count = len(answers or [])
        total_questions = len(self.local_get("questions") or [])
        score = min(95, max(55, int((answered_count / max(total_questions, 1)) * 90)))
        lines = [
            "Interview Performance Report",
            f"Overall Performance Score: {score}%",
            "What Went Well: You completed the interview questions and gave answers for the officer to review.",
            "Areas To Improve: Make each answer specific, consistent, and supported with clear details.",
            "Recommended Next Steps: Practice concise answers, prepare documents, and repeat the simulation to build confidence.",
            "This practice result does not guarantee visa approval or denial.",
        ]
        self.local_set("phase", "completed")
        self._emit_session_state("completed")
        return self._say_exactly("\n".join(lines))

    def _prompt_mode_selection(self):
        self.local_set("phase", "mode_selection")
        self._emit_session_state("mode_selection")
        return self._say_exactly(WELCOME_PROMPT)

    def _prompt_visa_selection(self):
        self.local_set("phase", "visa_selection")
        self._emit_session_state("visa_selection")
        return self._say_exactly(VISA_PROMPT)

    def _reset_interview_state(self):
        self.local_set("phase", "mode_selection")
        self.local_set("selected_mode", None)
        self.local_set("selected_visa_type", None)
        self.local_set("current_question", None)
        self.local_set("question_index", 0)
        self.local_set("answers", [])
        self.local_set("question_payloads", {})
        self.local_set("training_scores", [])
        self.local_set("training_attempts", {})
        self.local_set("training_answered_questions", [])
        self.local_set("skipped_questions", [])
        self.local_set("training_results", [])
        self.local_set("questions", [])
        self.local_set("evaluation_done", False)

    def _current_service_type(self):
        if not self.local_get("selected_mode"):
            return "mode_selection"
        if not self.local_get("selected_visa_type"):
            return "visa_selection"
        return "training" if self.local_get("selected_mode") == "training" else "interview"

    def _missing_state_prompt(self):
        selected_mode = self.local_get("selected_mode")
        selected_visa_type = self.local_get("selected_visa_type")

        if not selected_mode:
            self.sync_service({"service_type": "mode_selection"})
            return self._prompt_mode_selection()

        if not selected_visa_type:
            self.sync_service({"service_type": "visa_selection"})
            return self._prompt_visa_selection()

        questions = self.local_get("questions") or self._questions_for_visa(selected_visa_type)
        if not self.local_get("questions"):
            self.local_set("questions", questions)

        if self.local_get("current_question") is None and questions:
            self.local_set("current_question", self._current_question())

        return None

    def _question_index(self):
        return int(self.local_get("question_index") or 0)

    def _set_current_question_from_index(self):
        questions = self.local_get("questions") or []
        if not questions:
            self.local_set("current_question", None)
            return ""

        index = self._question_index()
        if index >= len(questions):
            self.local_set("current_question", None)
            return ""

        question = questions[index]
        self.local_set("current_question", question)
        return question

    def _answer_score(self, arguments, answer):
        raw_score = arguments.get("answer_score")
        try:
            score = int(raw_score)
        except (TypeError, ValueError):
            score = self._fallback_answer_score(answer)

        return max(0, min(100, score))

    def _fallback_answer_score(self, answer):
        words = re.sub(r"[^a-z0-9]+", " ", str(answer or "").lower()).strip().split()
        if len(words) >= 18:
            return 82
        if len(words) >= 8:
            return 72
        return 55

    def _record_training_result(self, question, answer, arguments, score=None, skipped=False):
        attempts = self.local_get("training_attempts") or {}
        attempts[question] = int(attempts.get(question, 0)) + 1
        self.local_set("training_attempts", attempts)

        result = {
            "question": question,
            "answer": answer,
            "score": 0 if skipped else score,
            "skipped": skipped,
            "strengths": arguments.get("strengths") or [],
            "weaknesses": arguments.get("weaknesses") or [],
            "suggestions": arguments.get("suggestions") or [],
        }

        results = self.local_get("training_results") or []
        results.append(result)
        self.local_set("training_results", results)

        if score is not None:
            scores = self.local_get("training_scores") or []
            scores.append({"question": question, "score": score})
            self.local_set("training_scores", scores)

        if skipped:
            skipped_questions = self.local_get("skipped_questions") or []
            if question not in skipped_questions:
                skipped_questions.append(question)
                self.local_set("skipped_questions", skipped_questions)

        if score is not None and score >= 80:
            answered_questions = self.local_get("training_answered_questions") or []
            if question not in answered_questions:
                answered_questions.append(question)
                self.local_set("training_answered_questions", answered_questions)

    def _training_feedback_prompt(self, question, answer, arguments, score):
        strengths = self._list_text(arguments.get("strengths"), "You gave a direct answer.")
        weaknesses = self._list_text(arguments.get("weaknesses"), "Add more specific details and evidence.")
        suggestions = self._list_text(arguments.get("suggestions"), "Answer clearly with dates, places, people, and honest reasons.")
        message = (
            f"Score: {score}%\n"
            f"Strengths: {strengths}\n"
            f"Weaknesses: {weaknesses}\n"
            f"Improvement Suggestions: {suggestions}\n"
            f"Please answer this question again: {question}"
        )
        return self._say_exactly(message)

    def _training_completion_report(self):
        scores = self.local_get("training_scores") or []
        skipped = self.local_get("skipped_questions") or []
        average = int(sum(item.get("score", 0) for item in scores) / max(len(scores), 1)) if scores else 0
        message = (
            "Training Session Complete\n"
            f"Average Score: {average}%\n"
            f"Skipped Questions: {len(skipped)}\n"
            "What Went Well: You practiced the full question set and improved your interview readiness.\n"
            "Areas To Improve: Review any weak or skipped questions and practice clearer, more specific answers.\n"
            "Recommended Next Steps: Repeat training until your answers are consistently above 80%."
        )
        self.local_set("phase", "completed")
        self._emit_session_state("completed")
        return self._say_exactly(message)

    def _interview_completion_message(self):
        return self._say_exactly("The real interview simulation is complete. You can restart if you want more practice.")

    def _list_text(self, value, fallback):
        if isinstance(value, list):
            cleaned = [str(item).strip() for item in value if str(item).strip()]
            return "; ".join(cleaned) if cleaned else fallback

        if isinstance(value, str) and value.strip():
            return value.strip()

        return fallback

    def _infer_service_type(self, arguments):
        return self._current_service_type()

    def _normalize_mode(self, value):
        value = str(value or "").strip().lower()
        compact = re.sub(r"[^a-z0-9]+", " ", value).strip()
        if value in {"1", "one", "training", "training session", "coach", "coach mode"}:
            return "training"
        if compact in {"option 1", "number 1", "choice 1", "first option"}:
            return "training"
        if self._mentions_selection_number(compact, "one"):
            return "training"
        if "training" in compact or "coach" in compact:
            return "training"
        if value in {"2", "two", "interview", "real interview", "real interview simulation", "simulation"}:
            return "interview"
        if compact in {"option 2", "number 2", "choice 2", "second option"}:
            return "interview"
        if self._mentions_selection_number(compact, "two"):
            return "interview"
        if ("real" in compact and ("interview" in compact or "simulation" in compact)) or "simulation" in compact:
            return "interview"
        return None

    def _normalize_visa_type(self, value):
        raw_value = str(value or "").strip().lower()
        value = raw_value.replace("-", "").replace("/", "")
        compact = re.sub(r"[^a-z0-9]+", " ", raw_value).strip()
        if value in {"1", "one", "f1", "f 1", "student", "student visa", "f1 student visa"}:
            return "f1"
        if compact in {"option 1", "number 1", "choice 1", "first option"}:
            return "f1"
        if self._mentions_selection_number(compact, "one", include_visa_words=True):
            return "f1"
        if "f1" in value or "student" in compact:
            return "f1"
        if value in {"2", "two", "b1_b2", "b1b2", "b1 b2", "visitor", "visitor visa", "b1b2 visitor visa"}:
            return "b1_b2"
        if compact in {"option 2", "number 2", "choice 2", "second option"}:
            return "b1_b2"
        if self._mentions_selection_number(compact, "two", include_visa_words=True):
            return "b1_b2"
        if "b1b2" in value or "visitor" in compact or "tourist" in compact:
            return "b1_b2"
        return None

    def _mentions_selection_number(self, compact, number_word, include_visa_words=False):
        number_digit = "1" if number_word == "one" else "2"
        ordinal = "first" if number_word == "one" else "second"
        has_number = re.search(rf"\b({number_digit}|{number_word}|{ordinal})\b", compact or "") is not None
        selection_words = "select|choose|choice|option|number|pick|want"
        if include_visa_words:
            selection_words += "|visa|type"
        has_selection_word = re.search(rf"\b({selection_words})\b", compact or "") is not None
        return has_number and has_selection_word

    def _questions_for_visa(self, visa_type):
        return F1_QUESTIONS if visa_type == "f1" else B1_B2_QUESTIONS

    def _current_question(self):
        questions = self.local_get("questions") or self._questions_for_visa(self.local_get("selected_visa_type"))
        index = int(self.local_get("question_index") or 0)
        return questions[index] if index < len(questions) else questions[-1]

    def _advance_question(self):
        questions = self.local_get("questions") or []
        index = min(int(self.local_get("question_index") or 0) + 1, len(questions))
        self.local_set("question_index", index)

    def _answer_from(self, arguments):
        return str(arguments.get("user_answer") or "").strip()

    def _remember_user_message(self, message):
        self._last_user_message = str(message or "").strip()

    def _arguments_with_raw_user_answer(self, arguments):
        raw_user_answer = self._last_user_message
        if raw_user_answer is None:
            return arguments

        cleaned_arguments = dict(arguments or {})
        cleaned_arguments["user_answer"] = raw_user_answer

        if self._is_noise_transcript(raw_user_answer):
            cleaned_arguments.pop("selected_mode", None)
            cleaned_arguments.pop("selected_visa_type", None)
            cleaned_arguments.pop("extracted_payload", None)
            cleaned_arguments["answered_current_question"] = False
            cleaned_arguments["answer_is_unclear"] = True

        return cleaned_arguments

    def _is_noise_transcript(self, value):
        normalized_value = re.sub(r"[^a-z0-9:/._-]+", " ", str(value or "").lower()).strip()
        if not normalized_value:
            return True

        noise_phrases = {
            "transcribe in english only",
            "translate in english only",
            "english only",
        }
        if normalized_value in noise_phrases:
            return True

        if "http://" in normalized_value or "https://" in normalized_value or "www." in normalized_value:
            return True

        if "complete disclaimer" in normalized_value or "please see the disclaimer" in normalized_value:
            return True

        return False

    def _required_slots_for_question(self, question):
        selected_visa_type = self.local_get("selected_visa_type")
        normalized_question = re.sub(r"[^a-z0-9]+", " ", str(question or "").lower()).strip()

        if selected_visa_type == "f1" and "academic background" in normalized_question:
            return {
                "passport": "passport",
                "form_i20": "Form I-20",
                "academic_background": "academic background",
            }

        if selected_visa_type == "b1_b2" and "purpose of your visit" in normalized_question:
            return {
                "passport": "passport",
                "visit_purpose": "purpose of your visit",
            }

        return {}

    def _question_payload_key(self, question):
        return re.sub(r"[^a-z0-9]+", "_", str(question or "").lower()).strip("_")

    def _question_payload(self, question):
        payloads = self.local_get("question_payloads") or {}
        payload = payloads.get(self._question_payload_key(question), {})
        return payload if isinstance(payload, dict) else {}

    def _merge_question_payload(self, question, slots):
        if not slots:
            return

        payloads = self.local_get("question_payloads") or {}
        key = self._question_payload_key(question)
        payload = payloads.get(key, {})
        if not isinstance(payload, dict):
            payload = {}

        for slot, value in slots.items():
            if value:
                payload[slot] = str(value).strip()

        payloads[key] = payload
        self.local_set("question_payloads", payloads)

    def _missing_slots_for_question(self, question):
        required_slots = self._required_slots_for_question(question)
        if not required_slots:
            return []

        payload = self._question_payload(question)
        return [slot for slot in required_slots if not str(payload.get(slot, "")).strip()]

    def _missing_slots_prompt(self, question, missing_slots):
        required_slots = self._required_slots_for_question(question)
        labels = [required_slots.get(slot, slot.replace("_", " ")) for slot in missing_slots]

        if not labels:
            return question

        if len(labels) == 1:
            missing_text = labels[0]
        else:
            missing_text = ", ".join(labels[:-1]) + f", and {labels[-1]}"

        return f"Please provide your {missing_text}.\n{question}"

    def _extract_answer_slots(self, question, answer, arguments):
        required_slots = self._required_slots_for_question(question)
        if not required_slots:
            return {}

        answer_text = str(answer or "").strip()
        normalized_answer = re.sub(r"[^a-z0-9]+", " ", answer_text.lower()).strip()
        words = normalized_answer.split()
        slots = {}

        provided_payload = arguments.get("extracted_payload")
        if isinstance(provided_payload, dict):
            for slot in required_slots:
                value = provided_payload.get(slot)
                if value:
                    slots[slot] = value

        if "passport" in required_slots and (
            "passport" in normalized_answer
            or "pass port" in normalized_answer
        ):
            slots["passport"] = answer_text

        if "form_i20" in required_slots and (
            "i20" in normalized_answer
            or "i 20" in normalized_answer
            or "i twenty" in normalized_answer
            or "form i" in normalized_answer
            or "form 1 20" in normalized_answer
        ):
            slots["form_i20"] = answer_text

        if "academic_background" in required_slots and self._contains_academic_background(answer_text):
            slots["academic_background"] = answer_text

        if (
            "visit_purpose" in required_slots
            and not self._looks_like_document_only_answer(normalized_answer)
            and self._purpose_answer_plausible(normalized_answer, words)
        ):
            slots["visit_purpose"] = answer_text

        return slots

    def _contains_academic_background(self, answer):
        normalized_answer = re.sub(r"[^a-z0-9]+", " ", str(answer or "").lower()).strip()
        words = normalized_answer.split()
        academic_terms = {
            "school",
            "college",
            "university",
            "degree",
            "bachelor",
            "bachelors",
            "master",
            "masters",
            "phd",
            "high",
            "secondary",
            "intermediate",
            "studied",
            "study",
            "major",
            "grades",
            "gpa",
            "academic",
            "education",
            "computer",
            "science",
            "engineering",
            "business",
        }
        return any(term in words for term in academic_terms) and len(words) >= 3

    def _purpose_answer_plausible(self, normalized_answer, words):
        if not words:
            return False

        purpose_terms = {
            "visit",
            "tourism",
            "tourist",
            "vacation",
            "holiday",
            "business",
            "meeting",
            "conference",
            "family",
            "wedding",
            "medical",
            "attend",
            "travel",
            "see",
        }
        return any(term in words for term in purpose_terms)

    def _question_specific_answer_valid(self, question, answer):
        normalized_question = re.sub(r"[^a-z0-9]+", " ", str(question or "").lower()).strip()
        normalized_answer = re.sub(r"[^a-z0-9]+", " ", str(answer or "").lower()).strip()
        words = normalized_answer.split()

        if not words:
            return False

        if self._looks_like_document_only_answer(normalized_answer) and not self._required_slots_for_question(question):
            return False

        if normalized_answer in {"yes", "no"}:
            return any(
                phrase in normalized_question
                for phrase in ["have you traveled", "traveled internationally", "travel history"]
            )

        if "academic background" in normalized_question:
            return self._contains_academic_background(answer)

        if "why did you choose this university" in normalized_question:
            university_terms = {
                "university",
                "college",
                "faculty",
                "professor",
                "ranking",
                "reputation",
                "campus",
                "location",
                "research",
                "tuition",
                "scholarship",
                "admission",
                "program",
                "course",
                "courses",
                "quality",
                "affordable",
            }
            reason_terms = {"because", "choose", "chose", "selected", "good", "best", "strong", "known", "offer", "offers"}
            return self._has_min_words(words, 4) and self._has_any(words, university_terms | reason_terms)

        if "why did you choose this program" in normalized_question:
            program_terms = {
                "program",
                "course",
                "courses",
                "major",
                "degree",
                "curriculum",
                "subject",
                "field",
                "computer",
                "science",
                "business",
                "engineering",
                "career",
                "interest",
                "skills",
                "future",
            }
            return self._has_min_words(words, 4) and self._has_any(words, program_terms)

        if "why do you want to study in the united states" in normalized_question:
            study_terms = {"study", "education", "program", "university", "research", "career", "job", "opportunity", "quality"}
            return len(words) >= 4 and (
                any(term in words for term in study_terms)
                or "united states" in normalized_answer
                or "usa" in words
            )

        if "future career goals" in normalized_question:
            career_terms = {"career", "job", "work", "business", "company", "goal", "goals", "future", "return", "become", "start", "join", "position"}
            return self._has_min_words(words, 4) and self._has_any(words, career_terms)

        if "pay for your studies" in normalized_question:
            finance_terms = {"pay", "paid", "fund", "funds", "sponsor", "scholarship", "loan", "parents", "father", "mother", "family", "savings", "bank", "money"}
            return self._has_any(words, finance_terms)

        if "who is sponsoring your education" in normalized_question:
            sponsor_terms = {"father", "mother", "parents", "family", "uncle", "aunt", "brother", "sister", "self", "myself", "sponsor", "company", "scholarship", "government"}
            return self._has_any(words, sponsor_terms) and not self._looks_like_document_only_answer(normalized_answer)

        if "ties do you have to your home country" in normalized_question:
            ties_terms = {"family", "parents", "job", "business", "property", "home", "return", "country", "land", "siblings", "career"}
            return self._has_min_words(words, 3) and self._has_any(words, ties_terms)

        if "previous education" in normalized_question:
            return self._contains_academic_background(answer)

        if "traveled internationally" in normalized_question or "travel history" in normalized_question:
            travel_terms = {"yes", "no", "traveled", "travelled", "visited", "visit", "country", "countries", "before", "never", "not", "uae", "uk", "canada", "turkey", "saudi", "dubai", "qatar"}
            return normalized_answer in {"yes", "no"} or self._has_any(words, travel_terms)

        if "purpose of your visit" in normalized_question:
            return self._purpose_answer_plausible(normalized_answer, words)

        if "where will you be traveling" in normalized_question:
            location_terms = {
                "new",
                "york",
                "california",
                "los",
                "angeles",
                "florida",
                "texas",
                "chicago",
                "washington",
                "usa",
                "united",
                "states",
                "city",
                "cities",
                "state",
                "states",
                "street",
                "streets",
                "whole",
                "all",
                "several",
            }
            return self._has_any(words, location_terms) or self._contains_capitalized_place(answer)

        if "how long" in normalized_question:
            duration_terms = {"day", "days", "week", "weeks", "month", "months", "year", "years", "night", "nights"}
            number_words = {"one", "two", "three", "four", "five", "six", "seven", "ten", "fifteen", "twenty"}
            return any(word.isdigit() for word in words) or any(word in duration_terms or word in number_words for word in words)

        if "who is paying" in normalized_question:
            payer_terms = {"i", "me", "myself", "self", "father", "mother", "parents", "family", "company", "employer", "business", "sponsor", "friend", "spouse", "husband", "wife"}
            return self._has_any(words, payer_terms) and not self._looks_like_document_only_answer(normalized_answer)

        if "employment or business situation" in normalized_question:
            work_terms = {"work", "job", "employed", "employee", "business", "company", "owner", "student", "self", "profession", "manager", "teacher", "engineer", "developer", "shop", "salary"}
            return self._has_min_words(words, 3) and self._has_any(words, work_terms)

        if "family ties do you have in your home country" in normalized_question:
            family_terms = {"family", "parents", "mother", "father", "wife", "husband", "children", "child", "siblings", "brother", "sister", "home", "country", "property", "job", "business"}
            return self._has_min_words(words, 3) and self._has_any(words, family_terms)

        if "return plans" in normalized_question:
            return_terms = {"return", "back", "home", "flight", "ticket", "resume", "job", "business", "family"}
            return self._has_min_words(words, 3) and self._has_any(words, return_terms)

        return False

    def _has_any(self, words, terms):
        return bool(set(words or []) & set(terms or []))

    def _has_min_words(self, words, minimum):
        return len([word for word in words if len(word) > 1]) >= minimum

    def _contains_capitalized_place(self, answer):
        return re.search(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b", str(answer or "")) is not None

    def _interview_fallback_prompt(self, question):
        normalized_question = re.sub(r"[^a-z0-9]+", " ", str(question or "").lower()).strip()
        expected = {
            "academic background": "your passport, your Form I-20, and your academic background",
            "why did you choose this university": "why you chose this university",
            "why did you choose this program": "why you chose this program",
            "why do you want to study in the united states": "why you want to study in the United States",
            "future career goals": "your future career goals",
            "pay for your studies": "how you will pay for your studies",
            "who is sponsoring your education": "who is sponsoring your education",
            "ties do you have to your home country": "your ties to your home country",
            "previous education": "your previous education",
            "traveled internationally": "whether you have traveled internationally before",
            "purpose of your visit": "your passport and the purpose of your visit",
            "where will you be traveling": "where you will be traveling in the United States",
            "how long": "how long you plan to stay",
            "who is paying": "who is paying for your trip",
            "employment or business situation": "your current employment or business situation",
            "family ties do you have in your home country": "your family ties in your home country",
            "return plans": "your return plans",
            "travel history": "your previous travel history",
        }

        for key, value in expected.items():
            if key in normalized_question:
                return f"Please answer about {value}.\n{question}"

        return f"Please answer the question: {question}"

    def _looks_like_document_only_answer(self, normalized_answer):
        document_terms = {"passport", "i20", "i 20", "i twenty", "form i", "form 1 20"}
        if not any(term in normalized_answer for term in document_terms):
            return False

        filler_words = {"my", "is", "are", "the", "a", "an", "passport", "form", "i", "20", "one", "twenty", "provide", "here"}
        content_words = [word for word in normalized_answer.split() if word not in filler_words]
        return len(content_words) <= 4

    def _interview_answer_record(self, question, answer):
        payload = self._question_payload(question)
        if not payload:
            return {"question": question, "answer": answer}

        required_slots = self._required_slots_for_question(question)
        parts = [
            f"{required_slots.get(slot, slot.replace('_', ' '))}: {payload.get(slot)}"
            for slot in required_slots
            if payload.get(slot)
        ]
        return {
            "question": question,
            "answer": "\n".join(parts) if parts else answer,
            "payload": payload,
        }

    def _answer_is_off_context(self, current_question, answer, arguments):
        answer_text = str(answer or "").strip()
        normalized_answer = re.sub(r"[^a-z0-9]+", " ", answer_text.lower()).strip()
        normalized_question = re.sub(r"[^a-z0-9]+", " ", str(current_question or "").lower()).strip()

        if not normalized_answer:
            return True

        if self._looks_like_mode_selection(answer_text) and "practice mode" not in normalized_question:
            return True

        if self._looks_like_visa_selection(answer_text) and "visa type" not in normalized_question:
            return True

        off_context_phrases = {
            "i do not understand",
            "i dont understand",
            "repeat",
            "say again",
            "what should i say",
            "help me answer",
            "next question",
            "skip",
            "start over",
            "restart",
            "transcribe in english only",
            "translate in english only",
            "english only",
        }
        if normalized_answer in off_context_phrases:
            return True

        if arguments.get("answer_is_unclear") and not self._looks_like_plausible_answer(current_question, answer_text):
            return True

        return False

    def _looks_like_plausible_answer(self, current_question, answer):
        normalized_question = re.sub(r"[^a-z0-9]+", " ", str(current_question or "").lower()).strip()
        normalized_answer = re.sub(r"[^a-z0-9]+", " ", str(answer or "").lower()).strip()
        words = normalized_answer.split()

        if not words:
            return False

        if normalized_answer in {"yes", "no"}:
            return True

        if "where will you be traveling" in normalized_question:
            return True

        if "how long" in normalized_question and any(word.isdigit() for word in words):
            return True

        if "who is paying" in normalized_question or "who is sponsoring" in normalized_question:
            return len(words) >= 1

        if "purpose" in normalized_question:
            return len(words) >= 1

        if len(words) >= 3:
            return True

        return False

    def _is_skip_request(self, answer, arguments):
        normalized_answer = re.sub(r"[^a-z0-9]+", " ", str(answer or "").lower()).strip()
        return bool(arguments.get("wants_next_question")) or normalized_answer in {
            "skip",
            "skip this",
            "next question",
            "move on",
            "go next",
        }

    def _looks_like_mode_selection(self, value):
        value = str(value or "").strip().lower()
        compact = re.sub(r"[^a-z0-9]+", " ", value).strip()
        return value in {
            "1",
            "2",
            "training",
            "training session",
            "real interview",
            "real interview simulation",
            "simulation",
        } or compact in {
            "option 1",
            "number 1",
            "choice 1",
            "first option",
            "option 2",
            "number 2",
            "choice 2",
            "second option",
        }

    def _looks_like_visa_selection(self, value):
        raw_value = str(value or "").strip().lower()
        value = raw_value.replace("-", "").replace("/", "")
        compact = re.sub(r"[^a-z0-9]+", " ", raw_value).strip()
        return value in {
            "f1",
            "f 1",
            "f1 student visa",
            "b1b2",
            "b1 b2",
            "b1b2 visitor visa",
        } or compact in {
            "student visa",
            "visitor visa",
            "option 1",
            "number 1",
            "choice 1",
            "first option",
            "option 2",
            "number 2",
            "choice 2",
            "second option",
        }

    def _say_exactly(self, message):
        return f'[admin]: Say exactly this and nothing else:\n"{message}"'

    def _is_exact_speech(self, guidelines):
        return isinstance(guidelines, str) and guidelines.startswith("[admin]: Say exactly this and nothing else:")

    def _exact_speech_message(self, guidelines):
        if not self._is_exact_speech(guidelines):
            return str(guidelines or "")

        message = guidelines.split("\n", 1)[1].strip()
        if message.startswith('"') and message.endswith('"'):
            return message[1:-1]

        return message

    def _strict_exact_speech(self, guidelines):
        if not self._is_exact_speech(guidelines):
            return guidelines

        return (
            "Read the quoted message verbatim. Do not respond to any previous applicant sentence. "
            "Do not explain, summarize, thank the applicant, mention preparation, or add transition words. "
            "Your complete spoken response must be exactly the quoted message and nothing else.\n\n"
            f"{guidelines}"
        )

    def _send_direct_assistant_text(self, message):
        for listener in self.MESSAGE_LISTENERS.get("assistant", []):
            if callable(listener):
                try:
                    listener(message.strip())
                except Exception:
                    pass

        self.wss_send({
            "type": "direct.reply",
            "message": message,
        })

        audio = self._tts_audio(message)
        if audio:
            self.wss_send({
                "type": "direct.audio",
                "audio": b64encode(audio).decode("ascii"),
                "mime_type": "audio/mpeg",
            })

    def _tts_audio(self, message):
        if not self.api_key:
            return None

        try:
            response = requests.post(
                "https://api.openai.com/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.config.get("tts_model", "gpt-4o-mini-tts"),
                    "voice": self.config.get("voice", "ash"),
                    "input": message,
                    "instructions": "Speak as Officer Charles in a calm, professional US visa officer tone. Use English.",
                    "response_format": "mp3",
                },
                timeout=20,
            )
            response.raise_for_status()
            return response.content
        except Exception as exception:
            debug(f"[{self.CLASS_NAME}] TTS audio failed: {exception}")
            return None

    def _emit_session_state(self, phase=None):
        try:
            self.wss_send({
                "type": "session.state",
                "state": self.session_state(phase),
            })
        except Exception:
            pass

    def session_state(self, phase=None):
        selected_mode = self.local_get("selected_mode")
        selected_visa_type = self.local_get("selected_visa_type")
        questions = self.local_get("questions") or (
            self._questions_for_visa(selected_visa_type) if selected_visa_type else []
        )
        answers = self.local_get("answers") or []
        training_scores = self.local_get("training_scores") or []
        training_answered_questions = self.local_get("training_answered_questions") or []
        skipped_questions = self.local_get("skipped_questions") or []
        evaluation_done = bool(self.local_get("evaluation_done"))
        current_question = self.local_get("current_question")
        question_index = int(self.local_get("question_index") or 0)
        stored_phase = self.local_get("phase")

        if not phase:
            if evaluation_done:
                phase = "completed"
            elif stored_phase:
                phase = stored_phase
            elif not selected_mode:
                phase = "mode_selection"
            elif not selected_visa_type:
                phase = "visa_selection"
            else:
                phase = "training" if selected_mode == "training" else "interview"

        if phase in {"evaluation", "completed"}:
            current_question = None

        answered_questions = (
            training_answered_questions
            if selected_mode == "training"
            else [item.get("question") for item in answers if item.get("question")]
        )

        current_question_index = 0
        if questions:
            if phase in {"evaluation", "completed"}:
                current_question_index = len(questions)
            else:
                current_question_index = min(question_index + 1, len(questions))

        return {
            "experience": "live",
            "phase": phase,
            "selected_mode": selected_mode,
            "selected_visa_type": selected_visa_type,
            "interview_status": phase,
            "current_question": current_question,
            "current_question_index": current_question_index,
            "total_questions": len(questions),
            "answered_questions": answered_questions,
            "last_answer_quality": str(training_scores[-1].get("score")) if training_scores else None,
            "evaluation_ready": phase in {"evaluation", "completed"},
            "completed": phase == "completed" or evaluation_done,
            "training_scores": training_scores,
            "skipped_questions": skipped_questions,
        }
