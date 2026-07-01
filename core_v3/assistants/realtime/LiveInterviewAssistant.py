import json
import os
import random
import re
import sys
from base64 import b64encode

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

import requests

from core.realtime.RealtimeCoreOpenAI import RealtimeCoreOpenAI
from core.util.classes.WSC import WSC
from core.util.functions.debug import d, debug
from core.util.functions.env import env


INTERVIEW_MIN_QUESTIONS = 3
INTERVIEW_MAX_QUESTIONS = 10

VISA_TOPICS = {
    "f1": {
        "documents_identity": "Passport, Form I-20, identity, and eligibility details",
        "academic_history": "Previous education, performance, and academic progression",
        "university_research": "Why this university was selected and what was researched",
        "program_fit": "Selected program, curriculum, and fit with prior experience",
        "us_study_purpose": "Why study in the United States rather than another option",
        "funding_sponsor": "Education costs, funding source, sponsor, and financial capacity",
        "career_plan": "Specific post-study career direction",
        "home_ties": "Family, professional, financial, and social ties to the home country",
        "nonimmigrant_intent": "Concrete plan and reasons to leave the United States after study",
        "travel_immigration_history": "Prior travel, visas, refusals, compliance, and immigration history",
    },
    "b1_b2": {
        "documents_identity": "Passport, identity, and eligibility details",
        "visit_purpose": "Specific temporary purpose of the United States visit",
        "itinerary_accommodation": "Destinations, activities, contacts, and accommodation",
        "duration_timing": "Trip dates, duration, and timing",
        "funding_payer": "Trip costs, payer, and financial capacity",
        "employment_economic_position": "Employment, business, income, and economic circumstances",
        "us_contacts": "Hosts, relatives, friends, organizations, or other United States contacts",
        "family_home_ties": "Family, property, responsibilities, and other home-country ties",
        "return_plan": "Specific departure and return obligations",
        "travel_immigration_history": "Prior travel, visas, refusals, compliance, and immigration history",
    },
}

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
        self.text_only = bool(text_only)
        self.experience = "chat" if self.text_only else "live"
        self.post_reply = False
        self.text_call = False
        self.modalities = ["text"] if self.text_only else ["text", "audio"]
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
        self._all_tools = None
        self._pending_candidate_response = None

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
            "rubric_hits": None,
            "rubric_evaluation": None,
            "wants_next_question": None,
            "answer_quality": None,
            "needs_follow_up": None,
            "interview_can_end": None,
            "completion_reason": None,
            "topic_updates": None,
            "introduced_facts": None,
            "unresolved_concerns": None,
            "next_question_candidates": None,
            "setup_question": None,
            "cancel_current_request": None,
        })

        self.set_default_local_storage({
            "phase": "mode_selection",
            "selected_mode": None,
            "selected_visa_type": None,
            "current_question": None,
            "answers": [],
            "training_scores": [],
            "training_attempts": {},
            "training_answered_questions": [],
            "skipped_questions": [],
            "training_results": [],
            "interview_completion_reason": None,
            "current_topic": None,
            "current_focus": None,
            "active_rubric": [],
            "asked_questions": [],
            "topic_coverage": {},
            "topic_order": [],
            "introduced_facts": [],
            "unresolved_concerns": [],
            "setup_stage": "mode_selection",
            "setup_answers": [],
            "setup_completed": False,
            "current_question_skippable": False,
            "document_question_skipped": False,
            "accepted_dynamic_questions": 0,
            "evaluation_done": False,
        })

        if setup:
            self.setup()

    def setup(self):
        is_setup = super().setup()
        self._append_training_rubric_instructions()
        self.tools_map["process_admin"] = self.handle_process_admin
        self.tools_map["generate_question_set"] = self.handle_generate_question_set
        self._all_tools = list(self.tools)
        return is_setup

    def _append_training_rubric_instructions(self):
        try:
            instructions = json.loads(self.instructions)
        except Exception:
            instructions = str(self.instructions or "")

        rubric_instructions = self._training_rubric_instructions()
        if rubric_instructions in instructions:
            return

        self.instructions = json.dumps(f"{instructions}\n\n{rubric_instructions}")

    def _training_rubric_instructions(self):
        lines = [
            "Dynamic Training Session Rubrics:",
            "For each generated training question, include a rubric in every next_question_candidate.",
            "Use 3 to 8 unique criteria whose points total exactly 100.",
            "Each criterion requires key, label, evidence, points, and suggestion.",
            "Make criteria specific to that generated question and its visa topic.",
            "For the applicant's answer, return rubric_evaluation against the active rubric from the prior turn.",
            "Each item must include `key`, `met`, `points_awarded`, and `reason`.",
            "Also return applicant-facing `strengths`, `weaknesses`, and `suggestions` arrays in clear coaching language.",
            "Award full points only when the answer clearly and specifically provides the required evidence.",
            "Award partial points when the answer mentions a criterion but lacks important detail.",
            "Award 0 when the criterion is missing, vague, generic, or not supported by the answer.",
            "A score of 100 should be rare. Use 100 only when there are no meaningful weaknesses or improvement suggestions.",
            "Do not invent facts. Do not award points because an answer is long.",
            "F-1 topics: " + ", ".join(VISA_TOPICS["f1"]),
            "B1/B2 topics: " + ", ".join(VISA_TOPICS["b1_b2"]),
        ]

        return "\n".join(lines)

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
        transcription = {
            "model": self.config.get("stt", "whisper-1"),
            "language": self.config.get("stt_language", "en"),
        }
        stt_prompt = str(self.config.get("stt_prompt") or "").strip()
        if stt_prompt:
            transcription["prompt"] = stt_prompt

        session = {
            "type": "session.update",
            "session": {
                "type": "realtime",
                "instructions": self.instructions,
                "tools": self.tools or [],
                "tool_choice": "auto" if self.tools else "none",
                "output_modalities": ["text"] if self.text_only else ["audio"],
            },
        }

        if not self.text_only:
            session["session"]["audio"] = {
                "input": {
                    "transcription": transcription,
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
            }

        self.wsc_send(session)

    def rt_request_reply(self, guidelines=None, reply=True):
        output_modalities = ["text"] if self.text_only else ["audio"]
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
        debug(f"[{self.CLASS_NAME}] process_admin raw arguments: {json.dumps(arguments)}")

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
        transcript = str(payload.get("transcript") or "").strip()
        debug(f"[{self.CLASS_NAME}] OpenAI raw transcript: {transcript}")

        if not transcript:
            debug(f"[{self.CLASS_NAME}] Ignoring empty transcription.")
            self._last_user_message = None
            return

        if self._is_noise_transcript(transcript):
            debug(f"[{self.CLASS_NAME}] Ignoring noisy frontend transcript: {transcript}")
            self._last_user_message = None
            return

        debug(f"[{self.CLASS_NAME}] Emitting frontend transcript: {transcript}")
        super().rt_transcription_handler(payload)

    def start_conversation(self):
        self.function_call_enabled = True
        question = self._activate_setup_question("mode_selection")
        self._emit_session_state("mode_selection")
        self._send_direct_assistant_text(question)

    def handle_process_admin(self, arguments):
        arguments = self._arguments_with_raw_user_answer(arguments)

        if arguments.get("cancel_current_request"):
            self._reset_interview_state()
            self.sync_service({"service_type": "mode_selection"})
            return self._prompt_setup_question("mode_selection", arguments)

        self.sync_payload(arguments)
        service_type = self._current_service_type()
        debug(f"[{self.CLASS_NAME}] Selected live service: {service_type}")
        self.sync_service({"service_type": service_type})
        return self.call_service(arguments)

    def handle_generate_question_set(self, arguments):
        pending = self._pending_candidate_response or {"kind": "next_question"}
        mode = self.local_get("selected_mode")
        candidate = self._candidate_from_arguments(
            arguments,
            require_rubric=mode == "training",
        )
        if not candidate:
            candidate = self._fallback_dynamic_candidate(mode == "training")

        self.tools = list(self._all_tools or self.tools or [])
        self._pending_candidate_response = None
        self.next_pre_reply = True
        self._activate_dynamic_candidate(candidate)

        phase = "training" if mode == "training" else "interview"
        self._emit_session_state(phase)
        if pending.get("kind") == "training_feedback":
            return self._training_feedback_prompt(
                pending["question"],
                pending["answer"],
                pending["arguments"],
                pending["score"],
                next_question=candidate["question"],
            )
        return self._say_exactly(candidate["question"])

    def service_start(self, arguments):
        self._reset_interview_state()
        return self._prompt_setup_question("mode_selection", arguments)

    def service_mode_selection(self, arguments):
        selected_mode = arguments.get("selected_mode")
        if selected_mode not in {"training", "interview"}:
            selected_mode = self._normalize_mode(arguments.get("user_answer"))
        if not selected_mode:
            return self._prompt_setup_question("mode_selection", arguments)

        self.local_set("selected_mode", selected_mode)
        self.local_set("phase", "visa_selection")
        self.sync_service({"service_type": "visa_selection"})
        self.set_sub_category("choose visa")
        return self._prompt_setup_question("visa_selection", arguments)

    def service_visa_selection(self, arguments):
        selected_visa_type = arguments.get("selected_visa_type")
        if selected_visa_type not in {"f1", "b1_b2"}:
            selected_visa_type = self._normalize_visa_type(arguments.get("user_answer"))
        if not selected_visa_type:
            return self._prompt_setup_question("visa_selection", arguments)

        self.local_set("selected_visa_type", selected_visa_type)
        self.local_set("answers", [])
        self.local_set("training_scores", [])
        self.local_set("training_attempts", {})
        self.local_set("training_answered_questions", [])
        self.local_set("skipped_questions", [])
        self.local_set("training_results", [])
        self.local_set("interview_completion_reason", None)
        self.local_set("asked_questions", [])
        self.local_set("topic_coverage", self._initial_topic_coverage(selected_visa_type))
        self.local_set("topic_order", self._shuffled_topic_order(selected_visa_type))
        self.local_set("introduced_facts", [])
        self.local_set("unresolved_concerns", [])
        self.local_set("active_rubric", [])
        self.local_set("setup_answers", [])
        self.local_set("setup_completed", False)
        self.local_set("document_question_skipped", False)
        self.local_set("accepted_dynamic_questions", 0)
        self.local_set("evaluation_done", False)

        selected_mode = self.local_get("selected_mode")
        next_service = "training" if selected_mode == "training" else "interview"
        self.local_set("phase", next_service)
        self.sync_service({"service_type": next_service})
        self.set_sub_category("active")

        self._activate_setup_question("documents", arguments)
        self._emit_session_state(next_service)
        return self._say_exactly(self.local_get("current_question"))

    def service_training(self, arguments):
        missing_prompt = self._missing_state_prompt()
        if missing_prompt:
            return missing_prompt

        answer = self._answer_from(arguments)
        current_question = self.local_get("current_question")
        self.local_set("current_question", current_question)

        if not answer:
            self._emit_session_state("training")
            return self._say_exactly(current_question)

        if self.local_get("setup_stage") == "documents":
            return self._handle_document_setup(arguments, answer, training=True)

        if self._is_skip_request(answer, arguments):
            self._emit_session_state("training")
            return self._say_exactly(f"Please answer the question: {current_question}")

        arguments = self._enrich_dynamic_turn(arguments, answer, training=True)
        extracted_slots = self._extract_answer_slots(current_question, answer, arguments)
        self._merge_question_payload(current_question, extracted_slots)

        if self._dynamic_answer_is_unusable(arguments):
            self._emit_session_state("training")
            return self._say_exactly(f"Please answer the question: {current_question}")

        score, arguments = self._score_training_answer(current_question, answer, arguments)
        self._record_training_result(current_question, answer, arguments, score=score)

        if score >= 80:
            self._merge_dynamic_context(arguments)
            self._mark_training_topic_passed(arguments)
            accepted_count = self._increment_accepted_dynamic_questions()
            if self._training_should_end(accepted_count):
                self.local_set("evaluation_done", True)
                self.local_set("phase", "evaluation")
                self._emit_session_state("evaluation")
                completion_report = self._training_completion_report(emit_state=False)
                self._emit_session_state("completed")
                return self._training_feedback_prompt(
                    current_question,
                    answer,
                    arguments,
                    score,
                    completion_message=completion_report,
                )

            candidate = self._candidate_from_arguments(arguments, require_rubric=True)
            if not candidate:
                return self._defer_for_candidate_generation(
                    "training",
                    {
                        "kind": "training_feedback",
                        "question": current_question,
                        "answer": answer,
                        "arguments": arguments,
                        "score": score,
                    },
                )
            self._activate_dynamic_candidate(candidate)
            self._emit_session_state("training")
            return self._training_feedback_prompt(
                current_question,
                answer,
                arguments,
                score,
                next_question=candidate["question"],
            )

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
        if not answer:
            self._emit_session_state("interview")
            return self._say_exactly(self.local_get("current_question"))

        current_question = self.local_get("current_question")

        if self.local_get("setup_stage") == "documents":
            return self._handle_document_setup(arguments, answer, training=False)

        arguments = self._enrich_dynamic_turn(arguments, answer, training=False)
        extracted_slots = self._extract_answer_slots(current_question, answer, arguments)
        self._merge_question_payload(current_question, extracted_slots)
        quality = self._normalize_answer_quality(arguments.get("answer_quality"))

        answers = self.local_get("answers") or []
        answer_record = {
            "question": current_question,
            "answer": answer,
            "topic": self.local_get("current_topic"),
            "focus": self.local_get("current_focus"),
            "quality": quality,
        }
        answers.append(answer_record)
        self.local_set("answers", answers)

        self._merge_dynamic_context(arguments)
        accepted_count = self._increment_accepted_dynamic_questions()
        if self._dynamic_interview_should_end(arguments, accepted_count):
            self.local_set("evaluation_done", True)
            self.local_set("phase", "evaluation")
            self.local_set(
                "interview_completion_reason",
                str(arguments.get("completion_reason") or "Required interview topics were covered."),
            )
            self._emit_session_state("evaluation")
            return self._evaluation_prompt(answers)

        candidate = self._candidate_from_arguments(arguments, require_rubric=False)
        if not candidate:
            return self._defer_for_candidate_generation(
                "interview",
                {"kind": "next_question"},
            )
        self._activate_dynamic_candidate(candidate)
        self._emit_session_state("interview")
        return self._say_exactly(candidate["question"])

    def _evaluation_prompt(self, answers):
        answered_count = len(answers or [])
        quality_scores = {
            "insufficient": 45,
            "partial": 65,
            "complete": 88,
            "concerning": 55,
        }
        score = int(sum(
            quality_scores.get(str(item.get("quality")), 70)
            for item in (answers or [])
        ) / max(answered_count, 1))
        score = min(95, max(45, score))
        lines = [
            "Interview Performance Report",
            f"Overall Performance Score: {score}%",
            f"Accepted Dynamic Questions: {self.local_get('accepted_dynamic_questions') or 0}",
            (
                "Document Request: Skipped by applicant."
                if self.local_get("document_question_skipped")
                else "Document Request: Completed."
            ),
            f"Incomplete Topics: {self._incomplete_topics_text()}",
            "Communication: Review clarity and organization in each answer.",
            "Confidence: Review calmness and delivery during the interview.",
            "Purpose of Travel: Review whether your purpose and explanation were clear.",
            "Financial Explanation: Review whether funding or payment details were easy to understand.",
            "Consistency: Review whether your answers matched each other.",
            "What Went Well: You completed the interview questions and gave answers for the officer to review.",
            "Areas To Improve: Make weak answers more specific, add missing details, and clarify unclear explanations.",
            "Recommended Next Steps: Practice weak questions, improve explanations, repeat the simulation, and build confidence.",
            "Your preparation matters. Every practice session helps you communicate your story more clearly. Continue improving, stay honest, and keep building confidence.",
            "This practice result does not guarantee visa approval or denial.",
        ]
        self.local_set("phase", "completed")
        self._emit_session_state("completed")
        return self._say_exactly("\n".join(lines))

    def _prompt_setup_question(self, stage, arguments=None):
        question = self._activate_setup_question(stage, arguments)
        phase = stage if stage in {"mode_selection", "visa_selection"} else self.local_get("phase")
        self._emit_session_state(phase)
        return self._say_exactly(question)

    def _activate_setup_question(self, stage, arguments=None):
        question = self._validated_setup_question(arguments, stage)
        if not question:
            context_stage = stage
            if stage == "documents":
                context_stage = f"documents_{self.local_get('selected_visa_type') or 'f1'}"
            question = self._context_setup_question(context_stage)
        if not question:
            raise RuntimeError(f"Missing context/tool setup question for stage: {stage}")

        self.local_set("setup_stage", stage)
        self.local_set("current_question", question)
        self.local_set("current_question_skippable", stage == "documents")
        self.local_set("current_topic", None)
        self.local_set("current_focus", None)
        self.local_set("active_rubric", [])
        return question

    def _validated_setup_question(self, arguments, expected_stage):
        if not isinstance(arguments, dict):
            return None
        value = arguments.get("setup_question")
        if not isinstance(value, dict) or value.get("stage") != expected_stage:
            return None
        text = re.sub(r"\s+", " ", str(value.get("text") or "")).strip()
        if not text or len(text) > 500:
            return None
        if bool(value.get("skippable")) != (expected_stage == "documents"):
            return None
        return text

    def _context_setup_question(self, stage):
        try:
            instructions = json.loads(self.instructions)
        except Exception:
            instructions = str(self.instructions or "")
        match = re.search(
            rf"\[setup_question:{re.escape(stage)}\]\s*(.*?)\s*\[/setup_question\]",
            instructions,
            flags=re.DOTALL,
        )
        return match.group(1).strip() if match else None

    def _reset_interview_state(self):
        self.local_set("phase", "mode_selection")
        self.local_set("selected_mode", None)
        self.local_set("selected_visa_type", None)
        self.local_set("current_question", None)
        self.local_set("answers", [])
        self.local_set("training_scores", [])
        self.local_set("training_attempts", {})
        self.local_set("training_answered_questions", [])
        self.local_set("skipped_questions", [])
        self.local_set("training_results", [])
        self.local_set("interview_completion_reason", None)
        self.local_set("current_topic", None)
        self.local_set("current_focus", None)
        self.local_set("active_rubric", [])
        self.local_set("asked_questions", [])
        self.local_set("topic_coverage", {})
        self.local_set("topic_order", [])
        self.local_set("introduced_facts", [])
        self.local_set("unresolved_concerns", [])
        self.local_set("setup_stage", "mode_selection")
        self.local_set("setup_answers", [])
        self.local_set("setup_completed", False)
        self.local_set("current_question_skippable", False)
        self.local_set("document_question_skipped", False)
        self.local_set("accepted_dynamic_questions", 0)
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
            return self._prompt_setup_question("mode_selection")

        if not selected_visa_type:
            self.sync_service({"service_type": "visa_selection"})
            return self._prompt_setup_question("visa_selection")

        if self.local_get("current_question") is None:
            return self._say_exactly("Please select your visa type again so I can begin the interview.")

        return None

    def _answer_score(self, arguments, answer):
        raw_score = arguments.get("answer_score")
        try:
            score = int(raw_score)
        except (TypeError, ValueError):
            score = self._fallback_answer_score(answer)

        return max(0, min(100, score))

    def _score_training_answer(self, question, answer, arguments):
        rubric = self.local_get("active_rubric") or []
        if not rubric:
            return self._fallback_training_score(answer, arguments)

        evaluation = arguments.get("rubric_evaluation")
        if not isinstance(evaluation, list) or not evaluation:
            return self._missing_rubric_evaluation_score(arguments)

        return self._score_from_rubric_evaluation(rubric, evaluation, arguments, answer)

    def _score_from_rubric_evaluation(self, rubric, evaluation, arguments, answer):
        criteria = {criterion["key"]: criterion for criterion in rubric}
        seen = {}
        score = 0

        for item in evaluation:
            if not isinstance(item, dict):
                continue

            key = str(item.get("key") or "").strip()
            criterion = criteria.get(key)
            if not criterion or key in seen:
                continue

            max_points = int(criterion["points"])
            met = bool(item.get("met"))
            try:
                requested_points = int(item.get("points_awarded") or 0)
            except (TypeError, ValueError):
                requested_points = max_points if met else 0

            awarded = max(0, min(max_points, requested_points if met else 0))
            awarded, validation_note = self._validated_criterion_points(key, awarded, max_points, answer)
            seen[key] = {
                "met": awarded > 0,
                "points_awarded": awarded,
                "reason": self._join_reason(str(item.get("reason") or "").strip(), validation_note),
            }

        hits = {}
        strengths = []
        weaknesses = []
        suggestions = []

        for criterion in rubric:
            key = criterion["key"]
            result = seen.get(key)
            max_points = int(criterion["points"])
            awarded_points = int(result["points_awarded"]) if result else 0
            met = awarded_points > 0
            hits[key] = met

            if awarded_points >= max_points:
                score += awarded_points
                reason = f" {result['reason']}" if result.get("reason") else ""
                strengths.append(f"Covered {criterion['label']}.{reason}")
            elif awarded_points > 0:
                score += awarded_points
                reason = f" {result['reason']}" if result.get("reason") else ""
                strengths.append(f"Partially covered {criterion['label']}.{reason}")
                weaknesses.append(f"Needs more detail: {criterion['label']}.{reason}")
                suggestions.append(str(criterion["suggestion"]))
            else:
                reason = f" {result['reason']}" if result and result.get("reason") else ""
                weaknesses.append(f"Missing or unclear: {criterion['label']}.{reason}")
                suggestions.append(str(criterion["suggestion"]))

        scored_arguments = dict(arguments)
        scored_arguments["answer_score"] = max(0, min(100, score))
        scored_arguments["strengths"] = strengths or ["You gave a relevant answer."]
        scored_arguments["weaknesses"] = weaknesses or ["No major required rubric item was missing."]
        scored_arguments["suggestions"] = suggestions or ["You can still make the answer more concise and confident."]
        scored_arguments["rubric_hits"] = hits

        return scored_arguments["answer_score"], scored_arguments

    def _validated_criterion_points(self, key, awarded, max_points, answer):
        if awarded <= 0:
            return awarded, ""

        normalized_answer = str(answer or "").lower()
        if key == "passport" and not self._has_passport_identifier(normalized_answer):
            return min(awarded, max_points // 2), "Passport was mentioned, but no passport number or identifying detail was provided."

        if key == "form_i20" and not self._has_i20_identifier(normalized_answer):
            return min(awarded, max_points // 2), "Form I-20 was mentioned, but no SEVIS ID, school, program, or I-20 detail was provided."

        return awarded, ""

    def _join_reason(self, reason, validation_note):
        parts = [part for part in [reason, validation_note] if part]
        return " ".join(parts)

    def _has_passport_identifier(self, normalized_answer):
        return bool(re.search(r"\bpassport\s*(?:number|no\.?|#)?\s*(?:is|:)?[^a-z0-9]{0,10}[a-z]{1,3}\d{5,}\b", normalized_answer))

    def _has_i20_identifier(self, normalized_answer):
        return (
            bool(re.search(r"\b(?:sevis|n00)\s*(?:id|number|no\.?|#)?\s*(?:is|:)?[^a-z0-9]{0,10}[a-z]?\d{6,}\b", normalized_answer))
            or bool(re.search(r"\b(?:form\s*)?i[\s-]?20\b\s*(?:shows|lists|states|for|from|issued\s+by|school|program|university)\b", normalized_answer))
        )

    def _missing_rubric_evaluation_score(self, arguments):
        scored_arguments = dict(arguments)
        scored_arguments["answer_score"] = 0
        scored_arguments["strengths"] = self._feedback_items(
            arguments.get("strengths"),
            ["Your answer was received."],
        )
        scored_arguments["weaknesses"] = self._feedback_items(
            arguments.get("weaknesses"),
            ["The answer was not evaluated against the required rubric items."],
        )
        scored_arguments["suggestions"] = self._feedback_items(
            arguments.get("suggestions"),
            ["Please answer again with clear details for the current question."],
        )
        scored_arguments["rubric_hits"] = {}
        return 0, scored_arguments

    def _feedback_items(self, value, fallback):
        if isinstance(value, list):
            cleaned = [str(item).strip() for item in value if str(item).strip()]
            return cleaned or fallback

        if isinstance(value, str) and value.strip():
            return [value.strip()]

        return fallback

    def _normalize_for_match(self, value):
        return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()

    def _criterion_not_applicable_but_answered(self, key, no_previous_travel):
        if no_previous_travel and key in {"destinations", "travel_dates", "travel_purpose", "compliance"}:
            return True

        return False

    def _fallback_training_score(self, answer, arguments):
        words = re.sub(r"[^a-z0-9]+", " ", str(answer or "").lower()).strip().split()
        if len(words) >= 18:
            score = 65
        elif len(words) >= 8:
            score = 55
        else:
            score = 35

        scored_arguments = dict(arguments)
        scored_arguments["answer_score"] = score
        scored_arguments["strengths"] = ["You gave an answer, but it could not be matched to a question rubric."]
        scored_arguments["weaknesses"] = ["The active question was not recognized, so the answer cannot pass training automatically."]
        scored_arguments["suggestions"] = ["Please answer the current question directly with specific required details."]
        scored_arguments["rubric_hits"] = {}
        return score, scored_arguments

    def _fallback_answer_score(self, answer):
        words = re.sub(r"[^a-z0-9]+", " ", str(answer or "").lower()).strip().split()
        if len(words) >= 18:
            return 82
        if len(words) >= 8:
            return 72
        return 55

    def _criterion_met(self, key, question, answer, normalized_answer, words):
        word_set = set(words)

        if key == "passport":
            return "passport" in word_set or "pass port" in normalized_answer
        if key == "form_i20":
            return any(value in normalized_answer for value in {"i20", "i 20", "i twenty", "form i", "form 1 20"})
        if key == "degree":
            return self._has_any(word_set, {"degree", "bachelor", "bachelors", "master", "masters", "phd", "diploma", "intermediate", "secondary", "high"})
        if key in {"field", "program_name_or_field"}:
            field_terms = {"computer", "science", "engineering", "business", "finance", "medical", "medicine", "arts", "major", "software", "data", "technology", "accounting", "marketing"}
            return self._has_any(word_set, field_terms)
        if key == "institution":
            return self._has_any(word_set, {"university", "college", "school", "institute", "academy", "campus"})
        if key == "gpa_or_performance":
            return (
                self._has_any(word_set, {"gpa", "cgpa", "grade", "grades", "percentage", "percent", "marks", "score", "distinction"})
                or bool(re.search(r"\b\d(?:\.\d{1,2})?\s*(?:gpa|cgpa)\b", normalized_answer))
                or bool(re.search(r"\b\d{2,3}\s*%", normalized_answer))
            )
        if key in {"dates", "travel_dates", "arrival_or_departure", "return_date_or_timing"}:
            return self._has_any(word_set, {"year", "month", "week", "weeks", "day", "days", "date", "dates", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"}) or bool(re.search(r"\b(?:19|20)\d{2}\b", normalized_answer))
        if key == "clarity":
            return len(words) >= 8 and not self._looks_like_document_only_answer(normalized_answer)
        if key == "relevance":
            return self._question_specific_answer_valid(question, answer)

        if key == "university_reason":
            return self._has_any(word_set, {"because", "choose", "chose", "selected", "reason", "good", "best", "strong", "known", "reputation"})
        if key == "academic_fit":
            return self._has_any(word_set, {"academic", "faculty", "professor", "research", "course", "courses", "curriculum", "program", "quality"})
        if key == "evidence":
            return self._has_any(word_set, {"ranking", "ranked", "faculty", "professor", "research", "lab", "labs", "facility", "facilities", "tuition", "scholarship", "affordable", "accredited", "reputation"})
        if key == "personal_fit":
            return self._has_any(word_set, {"affordable", "location", "safe", "support", "community", "campus", "practical", "fits", "match", "matches"})
        if key == "program_reason":
            return self._has_any(word_set, {"because", "interest", "interested", "passion", "goal", "goals", "career", "skills", "future", "matches", "related"})
        if key == "curriculum_or_skills":
            return self._has_any(word_set, {"curriculum", "course", "courses", "skills", "practical", "project", "projects", "research", "training", "specialization"})
        if key in {"career_connection", "program_connection"}:
            return self._has_any(word_set, {"career", "job", "work", "future", "goal", "goals", "profession", "industry", "return"})
        if key == "us_education_reason":
            return "united states" in normalized_answer or "usa" in word_set or self._has_any(word_set, {"american", "education", "quality", "research", "opportunity"})
        if key == "academic_quality":
            return self._has_any(word_set, {"quality", "research", "practical", "advanced", "modern", "faculty", "labs", "technology", "education"})
        if key == "home_country_contrast":
            return self._has_any(word_set, {"home", "country", "available", "better", "advanced", "opportunity", "exposure", "international"})
        if key == "career_goal":
            return self._has_any(word_set, {"career", "goal", "goals", "become", "work", "job", "engineer", "manager", "developer", "analyst", "business"})
        if key == "role_or_industry":
            return self._has_any(word_set, {"engineer", "developer", "manager", "analyst", "doctor", "teacher", "business", "company", "industry", "software", "data"})

        if key in {"funding_source", "payer_identity"}:
            return self._has_any(word_set, {"parents", "father", "mother", "family", "self", "myself", "sponsor", "scholarship", "loan", "company", "government"})
        if key in {"amount_or_capacity", "financial_capacity", "sponsor_capacity", "income_or_stability"}:
            return self._has_any(word_set, {"savings", "bank", "income", "salary", "funds", "money", "statement", "statements", "afford", "business", "scholarship", "loan"}) or bool(re.search(r"\b\d+[,\d]*(?:\s*(?:usd|dollars|rupees|pkr))?\b", normalized_answer))
        if key == "expense_coverage":
            return self._has_any(word_set, {"tuition", "fees", "living", "expenses", "accommodation", "books", "insurance", "study"})
        if key == "documents":
            return self._has_any(word_set, {"document", "documents", "statement", "statements", "bank", "letter", "proof", "tax", "salary", "slip", "i20", "i 20"})
        if key == "sponsor_identity":
            return self._has_any(word_set, {"father", "mother", "parents", "family", "uncle", "aunt", "brother", "sister", "self", "myself", "company", "government", "scholarship"})
        if key in {"sponsor_relationship", "payer_relationship"}:
            return self._has_any(word_set, {"father", "mother", "parent", "parents", "uncle", "aunt", "brother", "sister", "family", "relative", "employer", "self", "myself"})
        if key == "sponsor_occupation":
            return self._has_any(word_set, {"job", "business", "employed", "salary", "income", "owner", "manager", "engineer", "doctor", "teacher", "government", "company"})

        if key == "family_ties":
            return self._has_any(word_set, {"family", "parents", "mother", "father", "siblings", "brother", "sister", "wife", "husband", "children"})
        if key in {"career_or_job_ties", "home_obligations", "return_obligation"}:
            return self._has_any(word_set, {"job", "work", "career", "business", "company", "employment", "study", "school", "family", "responsibility", "responsibilities"})
        if key == "property_or_assets":
            return self._has_any(word_set, {"property", "land", "house", "home", "assets", "business", "farm", "investment"})
        if key in {"return_plan", "temporary_intent"}:
            return self._has_any(word_set, {"return", "back", "home", "temporary", "after", "resume", "finish", "complete"})
        if key == "home_country":
            return self._has_any(word_set, {"home", "country", "pakistan", "india", "family", "city", "hometown"})
        if key == "responsibilities":
            return self._has_any(word_set, {"responsibility", "responsibilities", "care", "support", "family", "parents", "children", "business", "job"})

        if key in {"travel_status", "previous travel status"}:
            return self._has_any(word_set, {"yes", "no", "traveled", "travelled", "visited", "never", "before", "internationally"})
        if key in {"destinations", "destination"}:
            return self._has_any(word_set, {"new", "york", "california", "los", "angeles", "florida", "texas", "chicago", "washington", "usa", "united", "states", "city", "cities", "dubai", "turkey", "uk", "canada", "qatar", "saudi"}) or self._has_capitalized_place(answer)
        if key == "travel_purpose":
            return self._has_any(word_set, {"tourism", "tourist", "vacation", "holiday", "business", "meeting", "conference", "family", "medical", "study", "visit"})
        if key == "visit_purpose":
            return self._purpose_answer_plausible(normalized_answer, words)
        if key == "activities":
            return self._has_any(word_set, {"visit", "see", "tour", "tourism", "meeting", "conference", "shopping", "family", "vacation", "holiday", "attend"})
        if key == "itinerary_logic":
            return self._has_any(word_set, {"because", "plan", "planned", "itinerary", "days", "week", "visit", "first", "then"})
        if key == "duration":
            return self._has_any(word_set, {"day", "days", "week", "weeks", "month", "months"}) or bool(re.search(r"\b\d+\s*(?:day|days|week|weeks|month|months)\b", normalized_answer))
        if key == "employment_status":
            return self._has_any(word_set, {"employed", "employee", "job", "work", "working", "business", "student", "self", "company", "owner"})
        if key == "role_or_business":
            return self._has_any(word_set, {"engineer", "developer", "manager", "analyst", "teacher", "doctor", "owner", "business", "company", "shop", "role", "position"})
        if key == "compliance":
            return self._has_any(word_set, {"returned", "return", "back", "complied", "overstay", "never", "time", "before"})

        return False

    def _has_capitalized_place(self, answer):
        return bool(re.search(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b", str(answer or "")))

    def _is_no_previous_travel_answer(self, normalized_answer, words):
        if not words:
            return False

        no_terms = {"no", "not", "never"}
        travel_terms = {"travel", "traveled", "travelled", "visited", "internationally", "abroad", "outside"}
        return self._has_any(words, no_terms) and self._has_any(words, travel_terms)

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

    def _training_feedback_prompt(self, question, answer, arguments, score, next_question=None, completion_message=None):
        strengths = self._list_text(arguments.get("strengths"), "You gave a direct answer.")
        weaknesses = self._list_text(arguments.get("weaknesses"), "Add more specific details and evidence.")
        suggestions = self._list_text(arguments.get("suggestions"), "Answer clearly with dates, places, people, and honest reasons.")

        if completion_message:
            next_step = f"You reached 80% or higher on this answer. Training is complete.\n{completion_message}"
        elif next_question:
            next_step = f"You reached 80% or higher on this answer. Please answer the next question: {next_question}"
        else:
            next_step = f"Please answer this question again: {question}"

        message = (
            f"Score: {score}%\n"
            f"1. Strengths: {strengths}\n"
            f"2. Weaknesses: {weaknesses}\n"
            f"3. Improvement Suggestions: {suggestions}\n"
            f"4. Retry / Next Step: {next_step}"
        )
        return self._say_exactly(message)

    def _training_completion_report(self, emit_state=True):
        scores = self.local_get("training_scores") or []
        skipped = self.local_get("skipped_questions") or []
        document_status = (
            "Document request: skipped by applicant.\n"
            if self.local_get("document_question_skipped")
            else ""
        )
        incomplete_topics = self._incomplete_topics_text()
        average = int(sum(item.get("score", 0) for item in scores) / max(len(scores), 1)) if scores else 0
        message = (
            "Training Session Complete\n"
            f"Average Score: {average}%\n"
            f"Accepted Dynamic Questions: {self.local_get('accepted_dynamic_questions') or 0}\n"
            f"Skipped Questions: {len(skipped)}\n"
            f"{document_status}"
            f"Incomplete Topics: {incomplete_topics}\n"
            "What Went Well: You completed the available training questions and improved your interview readiness.\n"
            "Areas To Improve: Review any weak or skipped questions and practice clearer, more specific answers.\n"
            "Recommended Next Steps: Repeat training until your answers are consistently above 80%."
        )
        self.local_set("phase", "completed")
        if emit_state:
            self._emit_session_state("completed")
            return self._say_exactly(message)

        return message

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

    def _visa_topics(self):
        visa_type = self.local_get("selected_visa_type")
        return VISA_TOPICS.get(visa_type, {})

    def _shuffled_topic_order(self, visa_type):
        topics = list(VISA_TOPICS.get(visa_type, {}))
        random.SystemRandom().shuffle(topics)
        return topics

    def _ordered_visa_topic_keys(self):
        available = list(self._visa_topics())
        stored = self.local_get("topic_order") or []
        ordered = [topic for topic in stored if topic in self._visa_topics()]
        ordered.extend(topic for topic in available if topic not in ordered)
        return ordered

    def _handle_document_setup(self, arguments, answer, training):
        question = self.local_get("current_question")
        extracted_slots = self._extract_answer_slots(question, answer, arguments)
        required_documents = {
            slot for slot in self._required_slots_for_question(question)
            if slot in {"passport", "form_i20"}
        }
        documents_provided = bool(required_documents) and required_documents.issubset(
            extracted_slots
        )
        skipped = self._is_skip_request(answer, arguments) or not documents_provided
        if documents_provided:
            self._merge_question_payload(question, extracted_slots)

        records = self.local_get("setup_answers") or []
        records.append({
            "stage": "documents",
            "question": question,
            "answer": str(answer or ""),
            "skipped": skipped,
            "extracted_payload": extracted_slots if documents_provided else {},
        })
        self.local_set("setup_answers", records)
        self.local_set("document_question_skipped", skipped)
        self.local_set("setup_completed", True)
        self.local_set("setup_stage", "complete")
        self.local_set("current_question_skippable", False)

        if not skipped:
            self._merge_dynamic_context(arguments)

        candidate = self._candidate_from_arguments(arguments, require_rubric=training)
        if not candidate:
            candidate = self._fallback_dynamic_candidate(training)
        self._activate_dynamic_candidate(candidate)

        phase = "training" if training else "interview"
        self._emit_session_state(phase)
        return self._say_exactly(candidate["question"])

    def _increment_accepted_dynamic_questions(self):
        count = int(self.local_get("accepted_dynamic_questions") or 0) + 1
        self.local_set("accepted_dynamic_questions", min(count, INTERVIEW_MAX_QUESTIONS))
        return min(count, INTERVIEW_MAX_QUESTIONS)

    def _training_should_end(self, accepted_count):
        if accepted_count >= INTERVIEW_MAX_QUESTIONS:
            return True
        return (
            accepted_count >= INTERVIEW_MIN_QUESTIONS
            and self._all_required_topics_covered()
        )

    def _initial_topic_coverage(self, visa_type):
        return {
            topic: {
                "status": "uncovered",
                "evidence": "",
                "concern": "",
            }
            for topic in VISA_TOPICS.get(visa_type, {})
        }

    def _dynamic_answer_is_unusable(self, arguments):
        return (
            arguments.get("answered_current_question") is not True
            or bool(arguments.get("answer_is_unclear"))
        )

    def _enrich_dynamic_turn(self, arguments, answer, training):
        required_values = [
            arguments.get("answer_quality"),
            arguments.get("topic_updates"),
            arguments.get("next_question_candidates"),
        ]
        if training:
            required_values.append(arguments.get("rubric_evaluation"))
        if all(value is not None for value in required_values):
            return arguments

        process_tool = next(
            (
                tool for tool in (self._all_tools or self.tools or [])
                if tool.get("name") == "process_admin"
            ),
            None,
        )
        if not process_tool:
            return arguments

        prompt = {
            "task": "Analyze the applicant answer and produce the complete process_admin JSON payload.",
            "mode": "training" if training else "real_interview",
            "visa_type": self.local_get("selected_visa_type"),
            "current_question": self.local_get("current_question"),
            "current_topic": self.local_get("current_topic"),
            "current_focus": self.local_get("current_focus"),
            "applicant_answer": answer,
            "active_training_rubric": self.local_get("active_rubric") or [],
            "required_topics": self._visa_topics(),
            "session_topic_order": self._ordered_visa_topic_keys(),
            "topic_coverage": self.local_get("topic_coverage") or {},
            "asked_questions": self.local_get("asked_questions") or [],
            "accepted_dynamic_questions": self.local_get("accepted_dynamic_questions") or 0,
            "document_question_skipped": bool(self.local_get("document_question_skipped")),
            "introduced_facts": self.local_get("introduced_facts") or [],
            "unresolved_concerns": self.local_get("unresolved_concerns") or [],
            "instructions": (
                "Evaluate only facts in the answer. Never mark a vague or unanswered topic covered. "
                "Covered topics are permanently closed and must not receive another candidate. "
                "Use session_topic_order to vary topic sequence between sessions while following relevant applicant facts. "
                "Return exactly three fresh next_question_candidates. In training, evaluate every active "
                "rubric key and give every candidate a 3-8 criterion rubric totaling exactly 100. "
                "Reject questions with the same answer target as any asked question, even when paraphrased. "
                "If the document setup was skipped, never request passport or Form I-20 evidence. "
                "In real interview mode, do not include applicant-facing coaching."
            ),
        }
        schema = json.loads(json.dumps(process_tool["parameters"]))
        required = [
            "service_type",
            "user_answer",
            "answered_current_question",
            "answer_is_unclear",
            "answer_quality",
            "topic_updates",
            "introduced_facts",
            "unresolved_concerns",
            "needs_follow_up",
            "interview_can_end",
            "next_question_candidates",
        ]
        if training:
            required.extend([
                "rubric_evaluation",
                "strengths",
                "weaknesses",
                "suggestions",
            ])
            candidate_schema = schema["properties"]["next_question_candidates"]["items"]
            candidate_schema["required"] = list(candidate_schema["required"]) + ["rubric"]
        schema["required"] = required

        generated = self._openai_structured_json(
            schema,
            "visa_interview_turn",
            prompt,
        )
        if not generated:
            return arguments

        enriched = dict(arguments)
        enriched.update(generated)
        enriched["user_answer"] = answer
        return enriched

    def _defer_for_candidate_generation(self, phase, pending):
        generated = self._generate_candidates_with_openai(phase == "training")
        candidate = self._candidate_from_arguments(
            {"next_question_candidates": generated},
            require_rubric=phase == "training",
        )
        if not candidate:
            candidate = self._fallback_dynamic_candidate(phase == "training")

        self._activate_dynamic_candidate(candidate)
        self._emit_session_state(phase)
        if pending.get("kind") == "training_feedback":
            return self._training_feedback_prompt(
                pending["question"],
                pending["answer"],
                pending["arguments"],
                pending["score"],
                next_question=candidate["question"],
            )
        return self._say_exactly(candidate["question"])

    def _generate_candidates_with_openai(self, require_rubric):
        generation_tool = next(
            (
                tool for tool in (self._all_tools or self.tools or [])
                if tool.get("name") == "generate_question_set"
            ),
            None,
        )
        if not generation_tool or not self.api_key:
            return []

        schema = json.loads(json.dumps(generation_tool["parameters"]))
        if require_rubric:
            candidate_schema = schema["properties"]["next_question_candidates"]["items"]
            candidate_schema["required"] = list(candidate_schema["required"]) + ["rubric"]

        prompt = {
            "mode": "training" if require_rubric else "real_interview",
            "visa_type": self.local_get("selected_visa_type"),
            "required_topics": self._visa_topics(),
            "session_topic_order": self._ordered_visa_topic_keys(),
            "topic_coverage": self.local_get("topic_coverage") or {},
            "asked_questions": self.local_get("asked_questions") or [],
            "accepted_dynamic_questions": self.local_get("accepted_dynamic_questions") or 0,
            "document_question_skipped": bool(self.local_get("document_question_skipped")),
            "introduced_facts": self.local_get("introduced_facts") or [],
            "unresolved_concerns": self.local_get("unresolved_concerns") or [],
            "requirements": (
                "Generate exactly three ranked, distinct, concise visa interview questions. "
                "Use session_topic_order to avoid a fixed topic sequence across interviews. "
                "Use only uncovered or partial topics; covered topics are permanently forbidden. "
                "Explore relevant introduced facts when useful. Do not repeat the intent or answer target "
                "of any prior question, even with different wording. "
                "If the document setup was skipped, never request passport or Form I-20 evidence. "
                "For training, every rubric must contain 3-8 unique criteria totaling exactly 100 points."
            ),
        }

        parsed = self._openai_structured_json(
            schema,
            "visa_question_candidates",
            prompt,
        )
        candidates = parsed.get("next_question_candidates") if parsed else None
        return candidates if isinstance(candidates, list) else []

    def _openai_structured_json(self, schema, name, prompt):
        if not self.api_key:
            return {}
        try:
            response = requests.post(
                "https://api.openai.com/v1/responses",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": env("OPENAI_QUESTION_MODEL", "gpt-5.4-mini"),
                    "input": json.dumps(prompt),
                    "text": {
                        "format": {
                            "type": "json_schema",
                            "name": name,
                            "strict": False,
                            "schema": schema,
                        }
                    },
                },
                timeout=60,
            )
            response.raise_for_status()
            payload = response.json()
            output_text = "".join(
                str(content.get("text") or "")
                for item in payload.get("output", [])
                for content in item.get("content", [])
                if content.get("type") == "output_text"
            )
            parsed = json.loads(output_text)
            return parsed if isinstance(parsed, dict) else {}
        except Exception as exception:
            detail = ""
            if "response" in locals():
                detail = f" {response.text[:500]}"
            debug(f"[{self.CLASS_NAME}] Structured OpenAI request failed: {exception}.{detail}")
            return {}

    def _candidate_from_arguments(self, arguments, require_rubric):
        candidates = arguments.get("next_question_candidates")
        if not isinstance(candidates, list):
            return None

        valid_candidates = []
        for index, raw_candidate in enumerate(candidates[:3]):
            candidate = self._validated_dynamic_candidate(raw_candidate, require_rubric)
            if (
                candidate
                and not self._candidate_targets_completed_topic(candidate)
                and not self._candidate_repeats_skipped_documents(candidate)
                and not self._question_is_repetitive(candidate["question"])
                and not self._candidate_focus_is_repetitive(candidate)
            ):
                valid_candidates.append((index, candidate))

        if not valid_candidates:
            return None

        topic_priority = {
            topic: index
            for index, topic in enumerate(self._ordered_visa_topic_keys())
        }
        return min(
            valid_candidates,
            key=lambda item: (
                topic_priority.get(item[1]["topic"], len(topic_priority)),
                item[0],
            ),
        )[1]

    def _select_dynamic_candidate(self, arguments, require_rubric):
        return (
            self._candidate_from_arguments(arguments, require_rubric)
            or self._fallback_dynamic_candidate(require_rubric)
        )

    def _validated_dynamic_candidate(self, value, require_rubric):
        if not isinstance(value, dict):
            return None

        topic = str(value.get("topic") or "").strip()
        if topic not in self._visa_topics():
            return None

        question = self._safe_interview_question(value.get("question"))
        focus = re.sub(r"\s+", " ", str(value.get("focus") or "")).strip()[:120]
        purpose = str(value.get("purpose") or "").strip()
        if not question or not focus or purpose not in {
            "new_topic",
            "deepen",
            "clarify",
            "verify_consistency",
        }:
            return None

        rubric = self._validated_dynamic_rubric(value.get("rubric"))
        if require_rubric and not rubric:
            return None

        return {
            "question": question,
            "topic": topic,
            "focus": focus,
            "purpose": purpose,
            "rubric": rubric,
        }

    def _validated_dynamic_rubric(self, value):
        if not isinstance(value, list) or not 3 <= len(value) <= 8:
            return []

        rubric = []
        seen_keys = set()
        total_points = 0
        for item in value:
            if not isinstance(item, dict):
                return []

            key = re.sub(r"[^a-z0-9_]+", "_", str(item.get("key") or "").lower()).strip("_")
            label = str(item.get("label") or "").strip()
            evidence = str(item.get("evidence") or "").strip()
            suggestion = str(item.get("suggestion") or "").strip()
            try:
                points = int(item.get("points"))
            except (TypeError, ValueError):
                return []

            if (
                not key
                or key in seen_keys
                or not label
                or not evidence
                or not suggestion
                or points <= 0
                or points > 50
            ):
                return []

            seen_keys.add(key)
            total_points += points
            rubric.append({
                "key": key,
                "label": label[:160],
                "evidence": evidence[:240],
                "points": points,
                "suggestion": suggestion[:240],
            })

        return rubric if total_points == 100 else []

    def _fallback_dynamic_candidate(self, require_rubric):
        coverage = self.local_get("topic_coverage") or {}
        asked_topics = {
            item.get("topic")
            for item in (self.local_get("asked_questions") or [])
            if item.get("topic")
        }
        eligible_topics = [
            key for key in self._ordered_visa_topic_keys()
            if coverage.get(key, {}).get("status") != "covered"
            and not (
                self.local_get("document_question_skipped")
                and key == "documents_identity"
            )
        ]
        topic = next(
            (key for key in eligible_topics if key not in asked_topics),
            next(
                iter(eligible_topics),
                next(iter(self._visa_topics()), "documents_identity"),
            ),
        )
        description = self._visa_topics().get(topic, topic.replace("_", " "))
        question = f"Please explain your {description.lower()}?"
        rubric = []
        if require_rubric:
            rubric = [
                {"key": "direct_answer", "label": "direct answer", "evidence": "Directly answers the question", "points": 30, "suggestion": "Answer the exact question directly."},
                {"key": "specific_details", "label": "specific details", "evidence": "Provides concrete names, dates, amounts, places, or reasons", "points": 30, "suggestion": "Add truthful, concrete supporting details."},
                {"key": "complete_explanation", "label": "complete explanation", "evidence": "Explains the important parts of the topic", "points": 25, "suggestion": "Complete the explanation without leaving important gaps."},
                {"key": "clarity", "label": "clear organization", "evidence": "Uses a clear and understandable structure", "points": 15, "suggestion": "Organize the answer clearly and concisely."},
            ]
        return {
            "question": question,
            "topic": topic,
            "focus": topic,
            "purpose": "new_topic",
            "rubric": rubric,
        }

    def _activate_dynamic_candidate(self, candidate):
        self.local_set("setup_stage", "complete")
        self.local_set("setup_completed", True)
        self.local_set("current_question_skippable", False)
        self.local_set("current_question", candidate["question"])
        self.local_set("current_topic", candidate["topic"])
        self.local_set("current_focus", candidate["focus"])
        self.local_set("active_rubric", candidate.get("rubric") or [])
        asked_questions = self.local_get("asked_questions") or []
        asked_questions.append({
            "question": candidate["question"],
            "topic": candidate["topic"],
            "focus": candidate["focus"],
            "purpose": candidate["purpose"],
        })
        self.local_set("asked_questions", asked_questions)

    def _question_is_repetitive(self, question):
        normalized = self._normalize_for_match(question)
        candidate_words = self._semantic_question_words(question)
        for item in self.local_get("asked_questions") or []:
            previous = self._normalize_for_match(item.get("question"))
            if not previous:
                continue
            if normalized == previous or normalized in previous or previous in normalized:
                return True
            previous_words = self._semantic_question_words(item.get("question"))
            union = candidate_words | previous_words
            if union and len(candidate_words & previous_words) / len(union) >= 0.5:
                return True
        return False

    def _candidate_targets_completed_topic(self, candidate):
        coverage = self.local_get("topic_coverage") or {}
        return coverage.get(candidate.get("topic"), {}).get("status") == "covered"

    def _candidate_repeats_skipped_documents(self, candidate):
        if not self.local_get("document_question_skipped"):
            return False
        if candidate.get("topic") != "documents_identity":
            return False
        normalized = self._normalize_for_match(
            f"{candidate.get('question', '')} {candidate.get('focus', '')}"
        )
        return any(term in normalized for term in {"passport", "form i 20", "i20", "document"})

    def _semantic_question_words(self, value):
        stop_words = {
            "a", "an", "and", "are", "at", "do", "does", "did", "for", "from",
            "how", "in", "is", "it", "of", "on", "or", "that", "the", "this",
            "to", "us", "u", "s", "what", "when", "where", "which", "who",
            "why", "will", "with", "you", "your",
        }
        synonyms = {
            "chose": "choose",
            "chosen": "choose",
            "choosing": "choose",
            "selected": "choose",
            "select": "choose",
            "plans": "plan",
            "planned": "plan",
            "planning": "plan",
            "career": "career",
            "careers": "career",
            "completing": "complete",
            "completed": "complete",
            "graduation": "graduate",
            "graduating": "graduate",
            "studies": "study",
            "studying": "study",
            "schools": "university",
            "school": "university",
            "college": "university",
            "universities": "university",
            "returning": "return",
            "returned": "return",
            "responsibilities": "responsibility",
            "relatives": "family",
        }
        words = self._normalize_for_match(value).split()
        return {
            synonyms.get(word, word)
            for word in words
            if word not in stop_words and len(word) > 1
        }

    def _candidate_focus_is_repetitive(self, candidate):
        focus = self._semantic_question_words(candidate.get("focus"))
        for item in self.local_get("asked_questions") or []:
            if item.get("topic") != candidate.get("topic"):
                continue
            previous_focus = self._semantic_question_words(item.get("focus"))
            union = focus | previous_focus
            overlap = len(focus & previous_focus) / len(union) if union else 0
            if overlap < 0.5:
                continue
            return not (
                candidate.get("purpose") in {"clarify", "verify_consistency"}
                and bool(self.local_get("unresolved_concerns"))
            )
        return False

    def _merge_dynamic_context(self, arguments):
        coverage = self.local_get("topic_coverage") or self._initial_topic_coverage(
            self.local_get("selected_visa_type")
        )
        updates = arguments.get("topic_updates")
        if not isinstance(updates, list):
            updates = []

        for update in updates:
            if not isinstance(update, dict):
                continue
            topic = str(update.get("topic") or "")
            status = str(update.get("status") or "")
            if topic not in coverage or status not in {
                "uncovered",
                "partial",
                "covered",
                "concerning",
            }:
                continue
            if coverage[topic].get("status") == "covered":
                continue
            coverage[topic] = {
                "status": status,
                "evidence": str(update.get("evidence") or "")[:500],
                "concern": str(update.get("concern") or "")[:500],
            }

        current_topic = self.local_get("current_topic")
        quality = self._normalize_answer_quality(arguments.get("answer_quality"))
        if current_topic in coverage and not updates and arguments.get("answer_quality") is not None:
            status = {
                "complete": "covered",
                "partial": "partial",
                "insufficient": "uncovered",
                "concerning": "concerning",
            }[quality]
            coverage[current_topic]["status"] = status

        self.local_set("topic_coverage", coverage)

        facts = self.local_get("introduced_facts") or []
        for fact in arguments.get("introduced_facts") or []:
            cleaned = str(fact).strip()
            if cleaned and cleaned not in facts:
                facts.append(cleaned[:300])
        self.local_set("introduced_facts", facts[-50:])

        concerns = arguments.get("unresolved_concerns")
        if isinstance(concerns, list):
            self.local_set(
                "unresolved_concerns",
                [str(item).strip()[:300] for item in concerns if str(item).strip()],
            )

    def _mark_training_topic_passed(self, arguments):
        topic = self.local_get("current_topic")
        coverage = self.local_get("topic_coverage") or {}
        if topic in coverage:
            coverage[topic] = {
                "status": "covered",
                "evidence": str(arguments.get("user_answer") or "")[:500],
                "concern": "",
            }
            self.local_set("topic_coverage", coverage)

    def _all_required_topics_covered(self):
        coverage = self.local_get("topic_coverage") or {}
        return bool(coverage) and all(
            item.get("status") == "covered"
            for item in coverage.values()
        )

    def _incomplete_topics_text(self):
        coverage = self.local_get("topic_coverage") or {}
        incomplete = [
            topic.replace("_", " ")
            for topic, item in coverage.items()
            if item.get("status") != "covered"
        ]
        return ", ".join(incomplete) if incomplete else "None"

    def _dynamic_interview_should_end(self, arguments, answered_count):
        if answered_count >= INTERVIEW_MAX_QUESTIONS:
            return True
        return (
            answered_count >= INTERVIEW_MIN_QUESTIONS
            and bool(self.local_get("setup_completed"))
            and self._all_required_topics_covered()
            and not (self.local_get("unresolved_concerns") or [])
            and not bool(arguments.get("needs_follow_up"))
            and bool(arguments.get("interview_can_end"))
        )

    def _normalize_answer_quality(self, value):
        quality = str(value or "").strip().lower()
        if quality in {"insufficient", "partial", "complete", "concerning"}:
            return quality
        return "insufficient"

    def _safe_interview_question(self, value):
        question = re.sub(r"\s+", " ", str(value or "")).strip()
        if not question or len(question) > 220:
            return None
        if not question.endswith("?"):
            question += "?"
        return question

    def _answer_from(self, arguments):
        return str(arguments.get("user_answer") or "").strip()

    def _remember_user_message(self, message):
        self._last_user_message = str(message or "").strip()

    def _arguments_with_raw_user_answer(self, arguments):
        raw_user_answer = self._last_user_message
        if raw_user_answer is None:
            return arguments

        if self._is_noise_transcript(raw_user_answer):
            return arguments

        cleaned_arguments = dict(arguments or {})
        cleaned_arguments["user_answer"] = raw_user_answer

        return cleaned_arguments

    def _is_noise_transcript(self, value):
        normalized_value = re.sub(r"[^a-z0-9:/._-]+", " ", str(value or "").lower()).strip()
        if not normalized_value:
            return True

        if normalized_value.startswith("transcribe") or normalized_value.startswith("translate"):
            return True

        noise_phrases = {
            "transcribe in english only",
            "transcribe in english only.",
            "translate in english only",
            "translate in english only.",
            "english only",
            "this is the applicant speaking english during a us visa interview practice session",
            "this is the applicant speaking english during a us visa interview practice session.",
            "return only the applicant s spoken words in english",
            "return only the applicant s spoken words in english.",
            "return only the applicant's spoken words in english",
            "return only the applicant's spoken words in english.",
        }
        if normalized_value in noise_phrases:
            return True

        if (
            "http://" in normalized_value
            or "https://" in normalized_value
            or "www." in normalized_value
            or "otter.ai" in normalized_value
            or "transcribed by" in normalized_value
            or "msworddoc" in normalized_value
            or "word.document" in normalized_value
            or "word document" in normalized_value
            or "microsoft word" in normalized_value
            or "applicant speaking english during a us visa interview practice session" in normalized_value
            or "return only the applicant" in normalized_value
            or "spoken words in english" in normalized_value
            or "video description" in normalized_value
        ):
            return True

        if "complete disclaimer" in normalized_value or "please see the disclaimer" in normalized_value:
            return True

        return False

    def _required_slots_for_question(self, question):
        selected_visa_type = self.local_get("selected_visa_type")
        normalized_question = re.sub(r"[^a-z0-9]+", " ", str(question or "").lower()).strip()

        if self.local_get("setup_stage") == "documents":
            if selected_visa_type == "f1":
                return {
                    "passport": "passport",
                    "form_i20": "Form I-20",
                }
            return {
                "passport": "passport",
            }

        if selected_visa_type == "f1" and "academic background" in normalized_question:
            return {
                "passport": "passport",
                "form_i20": "Form I-20",
                "academic_background": "academic background",
            }

        if "good morning" in normalized_question and "passport and your form i 20" in normalized_question:
            return {
                "passport": "passport",
                "form_i20": "Form I-20",
            }

        if "good morning" in normalized_question and "provide your passport" in normalized_question:
            return {
                "passport": "passport",
            }

        if "full name exactly as it appears in your passport" in normalized_question:
            return {
                "full_name": "full name",
            }

        if "full official name" in normalized_question and "university" in normalized_question and "form i 20" in normalized_question:
            return {
                "university_name": "university name",
            }

        if "which university admitted you" in normalized_question or "listed on your form i 20" in normalized_question:
            return {
                "university_name": "university name",
            }

        if "what is your major or program of study" in normalized_question or "major or program of study" in normalized_question:
            return {
                "major": "major or program",
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

        if "full_name" in required_slots and not self._looks_like_document_only_answer(normalized_answer):
            slots["full_name"] = answer_text

        if "university_name" in required_slots and not self._looks_like_document_only_answer(normalized_answer):
            slots["university_name"] = answer_text

        if "major" in required_slots and not self._looks_like_document_only_answer(normalized_answer):
            slots["major"] = answer_text

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
            if "exact name" in normalized_question and "major" in normalized_question:
                return True
            if "exact name" in normalized_question and "university" in normalized_question:
                return True
            return any(
                phrase in normalized_question
                for phrase in ["have you traveled", "traveled internationally", "travel history"]
            )

        if "full official name" in normalized_question and "university" in normalized_question:
            return len(words) >= 1 and not self._looks_like_document_only_answer(normalized_answer)

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

        if "full name" in normalized_question and "passport" in normalized_question:
            filler_words = {
                "my",
                "name",
                "is",
                "the",
                "a",
                "an",
                "exactly",
                "as",
                "it",
                "appears",
                "in",
                "your",
                "passport",
                "that",
                "on",
            }
            content_words = [word for word in words if word not in filler_words]
            return len(content_words) >= 1

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
        self.send_assistant_message(message)

        if self.text_only:
            return

        audio = self._tts_audio(message)
        if audio:
            self.wss_send({
                "type": "direct.audio",
                "audio": b64encode(audio).decode("ascii"),
                "mime_type": "audio/mpeg",
            })

    def send_assistant_message(self, message):
        message = str(message or "").strip()

        if not message:
            return

        for listener in self.MESSAGE_LISTENERS.get("assistant", []):
            if callable(listener):
                try:
                    listener(message)
                except Exception:
                    pass

        debug(f"[{self.CLASS_NAME}] Final assistant response: {message}")
        self.wss_send({
            "type": "text.delta",
            "delta": message,
        })
        self.wss_send({"type": "text.completed"})

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
            debug(f"[{self.CLASS_NAME}] Emitting session state for phase: {phase or self.local_get('phase')}")
            self.wss_send({
                "type": "session.state",
                "state": self.session_state(phase),
            })
        except Exception:
            pass

    def session_state(self, phase=None):
        selected_mode = self.local_get("selected_mode")
        selected_visa_type = self.local_get("selected_visa_type")
        asked_question_records = self.local_get("asked_questions") or []
        answers = self.local_get("answers") or []
        training_scores = self.local_get("training_scores") or []
        training_answered_questions = self.local_get("training_answered_questions") or []
        skipped_questions = self.local_get("skipped_questions") or []
        evaluation_done = bool(self.local_get("evaluation_done"))
        topic_coverage = self.local_get("topic_coverage") or {}
        covered_topics = [
            topic for topic, item in topic_coverage.items()
            if item.get("status") == "covered"
        ]
        required_topics = list(VISA_TOPICS.get(selected_visa_type, {}))
        interview_completion_reason = self.local_get("interview_completion_reason")
        current_question = self.local_get("current_question")
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

        current_question_index = len(asked_question_records)

        return {
            "experience": self.experience,
            "phase": phase,
            "selected_mode": selected_mode,
            "selected_visa_type": selected_visa_type,
            "interview_status": phase,
            "current_question": current_question,
            "current_question_index": current_question_index,
            "total_questions": INTERVIEW_MAX_QUESTIONS,
            "answered_questions": answered_questions,
            "last_answer_quality": str(training_scores[-1].get("score")) if training_scores else None,
            "evaluation_ready": phase in {"evaluation", "completed"},
            "completed": phase == "completed" or evaluation_done,
            "training_scores": training_scores,
            "skipped_questions": skipped_questions,
            "covered_topics": covered_topics,
            "required_topics": required_topics,
            "topic_coverage": topic_coverage,
            "setup_stage": self.local_get("setup_stage"),
            "setup_completed": bool(self.local_get("setup_completed")),
            "setup_answers": self.local_get("setup_answers") or [],
            "current_question_skippable": bool(self.local_get("current_question_skippable")),
            "document_question_skipped": bool(self.local_get("document_question_skipped")),
            "accepted_dynamic_questions": int(self.local_get("accepted_dynamic_questions") or 0),
            "minimum_questions": INTERVIEW_MIN_QUESTIONS,
            "maximum_questions": INTERVIEW_MAX_QUESTIONS,
            "completion_reason": interview_completion_reason,
        }
