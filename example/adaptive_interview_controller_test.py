from core_v3.assistants.realtime.LiveInterviewAssistant import (
    INTERVIEW_MAX_QUESTIONS,
    INTERVIEW_MIN_QUESTIONS,
    LiveInterviewAssistant,
    VISA_TOPICS,
)


def rubric():
    return [
        {"key": "direct", "label": "direct answer", "evidence": "Answers directly", "points": 30, "suggestion": "Answer directly."},
        {"key": "details", "label": "specific details", "evidence": "Provides evidence", "points": 30, "suggestion": "Add details."},
        {"key": "complete", "label": "complete explanation", "evidence": "Covers important points", "points": 25, "suggestion": "Complete the explanation."},
        {"key": "clarity", "label": "clarity", "evidence": "Is organized", "points": 15, "suggestion": "Be clear."},
    ]


def candidate(question, topic="documents_identity", focus="identity", purpose="new_topic", training=False):
    value = {
        "question": question,
        "topic": topic,
        "focus": focus,
        "purpose": purpose,
    }
    if training:
        value["rubric"] = rubric()
    return value


def assistant(mode="interview", visa_type="f1"):
    instance = LiveInterviewAssistant(setup=False, text_only=True)
    instance.local_set("selected_mode", mode)
    instance.local_set("selected_visa_type", visa_type)
    instance.local_set("topic_coverage", instance._initial_topic_coverage(visa_type))
    instance.local_set("asked_questions", [])
    instance.local_set("answers", [])
    instance.local_set("setup_completed", True)
    instance.local_set("setup_stage", "complete")
    return instance


def setup_question(stage, text, skippable=False):
    return {
        "stage": stage,
        "text": text,
        "skippable": skippable,
    }


def test_f1_document_setup_comes_from_tool_payload():
    instance = LiveInterviewAssistant(setup=False, text_only=True)
    instance.local_set("selected_mode", "interview")
    reply = instance.service_visa_selection({
        "user_answer": "F-1 student visa",
        "setup_question": setup_question(
            "documents",
            "Please provide the F-1 documents from the tool.",
            True,
        ),
    })

    assert instance.local_get("current_question") == "Please provide the F-1 documents from the tool."
    assert instance.local_get("current_question_skippable")
    assert "F-1 documents from the tool" in reply
    assert set(instance.local_get("topic_order")) == set(VISA_TOPICS["f1"])


def test_document_skip_does_not_count_and_blocks_later_document_request():
    instance = assistant(mode="interview", visa_type="f1")
    instance.local_set("setup_completed", False)
    instance.local_set("setup_stage", "documents")
    instance.local_set("current_question", "Please provide your documents.")
    instance.local_set("current_question_skippable", True)

    next_question = candidate(
        "Why did you choose your university?",
        "university_research",
        "university_choice",
    )
    reply = instance._handle_document_setup(
        {"wants_next_question": True, "next_question_candidates": [next_question]},
        "Skip",
        training=False,
    )

    assert instance.local_get("document_question_skipped")
    assert instance.local_get("accepted_dynamic_questions") == 0
    assert "Why did you choose your university" in reply
    assert instance._candidate_repeats_skipped_documents(
        candidate("Please show your passport", "documents_identity", "passport")
    )


def test_document_answer_does_not_increment_dynamic_count():
    instance = assistant(mode="interview", visa_type="b1_b2")
    instance.local_set("setup_completed", False)
    instance.local_set("setup_stage", "documents")
    instance.local_set("current_question", "Please provide your passport.")
    instance.local_set("current_question_skippable", True)

    next_question = candidate(
        "What is the purpose of your visit?",
        "visit_purpose",
        "visit_purpose",
    )
    instance._handle_document_setup(
        {
            "next_question_candidates": [next_question],
            "topic_updates": [],
            "introduced_facts": [],
            "unresolved_concerns": [],
        },
        "Here is my passport.",
        training=False,
    )

    assert instance.local_get("accepted_dynamic_questions") == 0
    assert not instance.local_get("document_question_skipped")


def test_non_document_response_auto_skips_optional_documents_in_both_modes_and_visas():
    for mode in ("training", "interview"):
        for visa_type in ("f1", "b1_b2"):
            instance = assistant(mode=mode, visa_type=visa_type)
            instance.local_set("setup_completed", False)
            instance.local_set("setup_stage", "documents")
            instance.local_set(
                "current_question",
                (
                    "Good morning. Please provide your passport and your Form I-20."
                    if visa_type == "f1"
                    else "Good morning. Please provide your passport."
                ),
            )
            topic = "academic_history" if visa_type == "f1" else "visit_purpose"
            next_question = candidate(
                "Please continue with the interview",
                topic,
                f"{topic}_next",
                training=mode == "training",
            )

            instance._handle_document_setup(
                {"next_question_candidates": [next_question]},
                "I would like to continue with the interview.",
                training=mode == "training",
            )

            assert instance.local_get("document_question_skipped")
            assert instance.local_get("setup_completed")
            assert instance.local_get("accepted_dynamic_questions") == 0
            assert instance.local_get("current_question") == "Please continue with the interview?"


def test_duplicate_candidate_is_rejected():
    instance = assistant()
    instance._activate_dynamic_candidate(candidate("Why did you select this university", "university_research", "selection"))

    selected = instance._select_dynamic_candidate({
        "next_question_candidates": [
            candidate("Why did you select this university", "university_research", "selection"),
            candidate("Which university resources are most relevant to your goals", "university_research", "resources", "deepen"),
            candidate("How did you compare this university with alternatives", "university_research", "comparison", "deepen"),
        ],
    }, require_rubric=False)

    assert selected["focus"] == "resources"


def test_session_topic_order_controls_candidate_selection():
    instance = assistant()
    instance.local_set("topic_order", [
        "career_plan",
        "funding_sponsor",
        *[
            topic for topic in VISA_TOPICS["f1"]
            if topic not in {"career_plan", "funding_sponsor"}
        ],
    ])

    selected = instance._select_dynamic_candidate({
        "next_question_candidates": [
            candidate("Who will fund your studies?", "funding_sponsor", "funding"),
            candidate("What is your career plan?", "career_plan", "career"),
            candidate("Why this university?", "university_research", "choice"),
        ],
    }, require_rubric=False)

    assert selected["topic"] == "career_plan"


def test_paraphrased_career_question_is_rejected():
    instance = assistant()
    instance._activate_dynamic_candidate(candidate(
        "What are your specific career plans after completing your IT degree in the Philippines",
        "career_plan",
        "post_graduation_career_plan",
    ))

    assert instance._question_is_repetitive(
        "What specific career do you plan to pursue after completing your IT degree in the Philippines?"
    )


def test_completed_topic_candidate_is_rejected():
    instance = assistant()
    coverage = instance.local_get("topic_coverage")
    coverage["university_research"]["status"] = "covered"
    instance.local_set("topic_coverage", coverage)

    selected = instance._select_dynamic_candidate({
        "next_question_candidates": [
            candidate("Why did you choose this university", "university_research", "university_choice"),
            candidate("Who will pay for your studies", "funding_sponsor", "funding_source"),
            candidate("What are your plans after graduation", "career_plan", "career_plan"),
        ],
    }, require_rubric=False)

    assert selected["topic"] == "funding_sponsor"


def test_completed_topic_cannot_be_reopened():
    instance = assistant()
    coverage = instance.local_get("topic_coverage")
    coverage["home_ties"] = {"status": "covered", "evidence": "Family and job", "concern": ""}
    instance.local_set("topic_coverage", coverage)

    instance._merge_dynamic_context({
        "topic_updates": [{
            "topic": "home_ties",
            "status": "partial",
            "evidence": "Less detail in a later answer",
            "concern": "Model attempted to reopen it",
        }],
        "introduced_facts": [],
        "unresolved_concerns": [],
        "answer_quality": "partial",
    })

    assert instance.local_get("topic_coverage")["home_ties"]["status"] == "covered"


def test_dynamic_rubric_must_total_100():
    instance = assistant(mode="training")
    valid = candidate("Tell me about your academic preparation", "academic_history", "preparation", training=True)
    invalid = candidate("Tell me about your grades", "academic_history", "grades", training=True)
    invalid["rubric"][0]["points"] = 29

    assert instance._validated_dynamic_candidate(valid, require_rubric=True)
    assert instance._validated_dynamic_candidate(invalid, require_rubric=True) is None


def test_real_interview_requires_minimum_and_all_topics_with_no_concerns():
    instance = assistant()
    instance.local_set("topic_coverage", {
        topic: {"status": "covered", "evidence": "answer", "concern": ""}
        for topic in VISA_TOPICS["f1"]
    })

    assert not instance._dynamic_interview_should_end(
        {"interview_can_end": True, "needs_follow_up": False},
        INTERVIEW_MIN_QUESTIONS - 1,
    )
    assert instance._dynamic_interview_should_end(
        {"interview_can_end": True, "needs_follow_up": False},
        INTERVIEW_MIN_QUESTIONS,
    )
    instance.local_set("unresolved_concerns", ["Funding amount is inconsistent."])
    assert not instance._dynamic_interview_should_end(
        {"interview_can_end": True, "needs_follow_up": False},
        INTERVIEW_MIN_QUESTIONS,
    )


def test_maximum_always_ends_both_modes():
    instance = assistant()
    assert instance._dynamic_interview_should_end({}, INTERVIEW_MAX_QUESTIONS)

    training = assistant(mode="training")
    assert training._training_should_end(INTERVIEW_MAX_QUESTIONS)
    assert not training._training_should_end(INTERVIEW_MIN_QUESTIONS - 1)


def test_only_accepted_dynamic_answers_increment_counter():
    instance = assistant()
    assert instance.local_get("accepted_dynamic_questions") == 0
    assert instance._increment_accepted_dynamic_questions() == 1
    assert instance.local_get("accepted_dynamic_questions") == 1


def test_insufficient_interview_answer_advances_and_increments_counter():
    instance = assistant()
    original_question = "Why did you choose this university?"
    instance._activate_dynamic_candidate(
        candidate(original_question, "university_research", "choice")
    )

    instance.service_interview({
        "user_answer": "I do not know.",
        "answered_current_question": True,
        "answer_is_unclear": False,
        "answer_quality": "insufficient",
        "topic_updates": [],
        "introduced_facts": [],
        "unresolved_concerns": [],
        "next_question_candidates": [],
    })

    assert instance.local_get("accepted_dynamic_questions") == 1
    assert instance.local_get("current_question") != original_question


def test_missing_real_interview_analysis_payload_still_advances():
    instance = assistant()
    original_question = "Please explain your previous education and academic progression?"
    instance._activate_dynamic_candidate(
        candidate(original_question, "academic_history", "academic_progression")
    )

    instance.service_interview({
        "user_answer": "I finished secondary school, higher secondary school, and a BBA.",
        "answered_current_question": True,
        "answer_is_unclear": False,
    })

    assert instance.local_get("accepted_dynamic_questions") == 1
    assert instance.local_get("answers")[0]["quality"] == "insufficient"
    assert instance.local_get("current_question") != original_question


def test_training_answer_below_eighty_does_not_increment_counter():
    instance = assistant(mode="training")
    active = candidate(
        "Explain your academic preparation.",
        "academic_history",
        "academic_preparation",
        training=True,
    )
    instance._activate_dynamic_candidate(active)

    instance.service_training({
        "user_answer": "I studied.",
        "answered_current_question": True,
        "answer_is_unclear": False,
        "answer_quality": "partial",
        "topic_updates": [],
        "introduced_facts": [],
        "unresolved_concerns": [],
        "next_question_candidates": [],
        "rubric_evaluation": [
            {
                "key": item["key"],
                "met": False,
                "points_awarded": 0,
                "reason": "Missing detail.",
            }
            for item in active["rubric"]
        ],
        "strengths": [],
        "weaknesses": ["Missing detail."],
        "suggestions": ["Add detail."],
    })

    assert instance.local_get("accepted_dynamic_questions") == 0
    assert instance.local_get("current_question") == active["question"]


def test_tenth_accepted_interview_answer_forces_report():
    instance = assistant()
    instance.local_set("accepted_dynamic_questions", INTERVIEW_MAX_QUESTIONS - 1)
    instance._activate_dynamic_candidate(
        candidate("Why did you choose this university?", "university_research", "choice")
    )

    reply = instance.service_interview({
        "user_answer": "It has the curriculum and faculty that fit my goals.",
        "answered_current_question": True,
        "answer_is_unclear": False,
        "answer_quality": "partial",
        "topic_updates": [],
        "introduced_facts": [],
        "unresolved_concerns": [],
        "needs_follow_up": True,
        "interview_can_end": False,
        "next_question_candidates": [],
    })

    assert instance.local_get("accepted_dynamic_questions") == INTERVIEW_MAX_QUESTIONS
    assert instance.local_get("evaluation_done")
    assert "Interview Performance Report" in reply
