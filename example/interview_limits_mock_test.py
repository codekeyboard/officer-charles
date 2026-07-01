"""Deterministic mock coverage for question limits, reports, and training retries."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core_v3.assistants.realtime.LiveInterviewAssistant import (
    INTERVIEW_MAX_QUESTIONS,
    LiveInterviewAssistant,
    VISA_TOPICS,
)


def rubric():
    return [
        {
            "key": "direct",
            "label": "direct answer",
            "evidence": "Answers the question directly",
            "points": 40,
            "suggestion": "Answer directly.",
        },
        {
            "key": "details",
            "label": "specific details",
            "evidence": "Provides specific supporting details",
            "points": 35,
            "suggestion": "Add specific details.",
        },
        {
            "key": "clarity",
            "label": "clear explanation",
            "evidence": "Explains the answer clearly",
            "points": 25,
            "suggestion": "Explain the answer clearly.",
        },
    ]


def candidate(index, topic, training=False):
    value = {
        "question": f"Discuss {topic.replace('_', ' ')} scenario{index + 1}?",
        "topic": topic,
        "focus": f"{topic}_focus_{index + 1}",
        "purpose": "new_topic",
    }
    if training:
        value["rubric"] = rubric()
    return value


def evaluation(full_score):
    return [
        {
            "key": item["key"],
            "met": full_score or index == 0,
            "points_awarded": item["points"] if full_score or index == 0 else 0,
            "reason": "Mock rubric evidence.",
        }
        for index, item in enumerate(rubric())
    ]


def assistant(mode, visa_type):
    instance = LiveInterviewAssistant(setup=False, text_only=True)
    instance.local_set("selected_mode", mode)
    instance.local_set("selected_visa_type", visa_type)
    instance.local_set("phase", mode)
    instance.local_set("setup_stage", "complete")
    instance.local_set("setup_completed", True)
    instance.local_set("topic_coverage", instance._initial_topic_coverage(visa_type))
    instance.local_set("topic_order", list(VISA_TOPICS[visa_type]))
    instance.local_set("asked_questions", [])
    instance.local_set("answers", [])
    instance.local_set("accepted_dynamic_questions", 0)
    return instance


def run_real_interview(visa_type):
    instance = assistant("interview", visa_type)
    topics = list(VISA_TOPICS[visa_type])
    instance._activate_dynamic_candidate(candidate(0, topics[0]))

    final_reply = ""
    for index in range(INTERVIEW_MAX_QUESTIONS):
        next_candidates = (
            [candidate(index + 1, topics[index + 1])]
            if index + 1 < INTERVIEW_MAX_QUESTIONS
            else []
        )
        final_reply = instance.service_interview({
            "user_answer": f"Mock real interview answer {index + 1}.",
            "answered_current_question": True,
            "answer_is_unclear": False,
            "answer_quality": "partial",
            "topic_updates": [{
                "topic": topics[index],
                "status": "partial",
                "evidence": f"Mock answer {index + 1}.",
                "concern": "More detail may be needed.",
            }],
            "introduced_facts": [],
            "unresolved_concerns": [],
            "needs_follow_up": True,
            "interview_can_end": False,
            "next_question_candidates": next_candidates,
        })

        if index + 1 < INTERVIEW_MAX_QUESTIONS:
            assert "Interview Performance Report" not in final_reply

    assert instance.local_get("accepted_dynamic_questions") == INTERVIEW_MAX_QUESTIONS
    assert len(instance.local_get("asked_questions")) == INTERVIEW_MAX_QUESTIONS
    assert len(instance.local_get("answers")) == INTERVIEW_MAX_QUESTIONS
    assert instance.local_get("evaluation_done")
    assert "Interview Performance Report" in final_reply
    assert "Accepted Dynamic Questions: 10" in final_reply

    after_completion = instance.service_interview({"user_answer": "One more answer."})
    assert len(instance.local_get("asked_questions")) == INTERVIEW_MAX_QUESTIONS
    assert "simulation is complete" in after_completion


def run_training(visa_type):
    instance = assistant("training", visa_type)
    topics = list(VISA_TOPICS[visa_type])
    instance._activate_dynamic_candidate(candidate(0, topics[0], training=True))

    final_reply = ""
    for index in range(INTERVIEW_MAX_QUESTIONS):
        current_question = instance.local_get("current_question")
        weak_reply = instance.service_training({
            "user_answer": "A vague mock answer.",
            "answered_current_question": True,
            "answer_is_unclear": False,
            "answer_quality": "partial",
            "topic_updates": [],
            "introduced_facts": [],
            "unresolved_concerns": [],
            "next_question_candidates": [],
            "rubric_evaluation": evaluation(full_score=False),
            "strengths": ["The answer was direct."],
            "weaknesses": ["It needs more detail."],
            "suggestions": ["Add truthful supporting details."],
        })

        assert "Score: 40%" in weak_reply, (
            f"{visa_type} training question {index + 1} did not return retry feedback: "
            f"{weak_reply}"
        )
        assert "1. Strengths:" in weak_reply
        assert "2. Weaknesses:" in weak_reply
        assert "3. Improvement Suggestions:" in weak_reply
        assert "4. Retry / Next Step:" in weak_reply
        assert instance.local_get("current_question") == current_question
        assert instance.local_get("accepted_dynamic_questions") == index

        next_candidates = (
            [candidate(index + 1, topics[index + 1], training=True)]
            if index + 1 < INTERVIEW_MAX_QUESTIONS
            else []
        )
        final_reply = instance.service_training({
            "user_answer": "A complete mock answer with clear and specific supporting details.",
            "answered_current_question": True,
            "answer_is_unclear": False,
            "answer_quality": "complete",
            "topic_updates": [],
            "introduced_facts": [],
            "unresolved_concerns": [],
            "next_question_candidates": next_candidates,
            "rubric_evaluation": evaluation(full_score=True),
            "strengths": ["The answer was complete."],
            "weaknesses": [],
            "suggestions": [],
        })

        assert "Score: 100%" in final_reply
        assert instance.local_get("accepted_dynamic_questions") == index + 1

    assert instance.local_get("accepted_dynamic_questions") == INTERVIEW_MAX_QUESTIONS
    assert len(instance.local_get("asked_questions")) == INTERVIEW_MAX_QUESTIONS
    assert instance.local_get("evaluation_done")
    assert "Training Session Complete" in final_reply
    assert "Average Score:" in final_reply
    assert "Accepted Dynamic Questions: 10" in final_reply
    assert "Incomplete Topics: None" in final_reply


def run():
    for visa_type in ("f1", "b1_b2"):
        run_real_interview(visa_type)
        run_training(visa_type)
        print(f"{visa_type}: real interview and training mock flows passed")

    print("All four mock interview flows passed.")


if __name__ == "__main__":
    run()
