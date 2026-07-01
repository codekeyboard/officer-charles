import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core_v3.assistants.realtime.LiveInterviewAssistant import LiveInterviewAssistant


def candidate(question, topic):
    question = question if question.endswith("?") else question + "?"
    return {
        "question": question,
        "topic": topic,
        "focus": topic,
        "purpose": "new_topic",
        "rubric": [
            {"key": "reason", "label": "specific reason", "evidence": "Gives a specific reason", "points": 40, "suggestion": "Give a specific reason."},
            {"key": "evidence", "label": "supporting evidence", "evidence": "Provides supporting facts", "points": 35, "suggestion": "Add supporting facts."},
            {"key": "clarity", "label": "clear answer", "evidence": "Is clear and organized", "points": 25, "suggestion": "Organize the answer clearly."},
        ],
    }


def evaluation(reason=40, evidence=35, clarity=25):
    return [
        {"key": "reason", "met": reason > 0, "points_awarded": reason, "reason": "Reason evidence"},
        {"key": "evidence", "met": evidence > 0, "points_awarded": evidence, "reason": "Supporting evidence"},
        {"key": "clarity", "met": clarity > 0, "points_awarded": clarity, "reason": "Clear structure"},
    ]


def run():
    assistant = LiveInterviewAssistant(setup=False, text_only=True)
    assistant.local_set("selected_mode", "training")
    assistant.local_set("selected_visa_type", "f1")
    assistant.local_set("phase", "training")
    assistant.local_set("topic_coverage", assistant._initial_topic_coverage("f1"))
    assistant.local_set("asked_questions", [])
    assistant.local_set("setup_completed", True)
    assistant.local_set("setup_stage", "complete")
    first = candidate("Why is this university the right choice for you", "university_research")
    assistant._activate_dynamic_candidate(first)

    weak_reply = assistant.service_training({
        "user_answer": "It is a good university.",
        "answered_current_question": True,
        "rubric_evaluation": evaluation(20, 0, 20),
        "strengths": ["The answer was direct."],
        "weaknesses": ["It lacked university-specific evidence."],
        "suggestions": ["Mention researched faculty, courses, facilities, or cost."],
    })
    assert "Score: 40%" in weak_reply
    assert assistant.local_get("current_question") == first["question"]

    next_candidate = candidate("How does your selected program support your career plan", "program_fit")
    strong_reply = assistant.service_training({
        "user_answer": "The curriculum includes specific courses and projects connected to my career plan.",
        "answered_current_question": True,
        "rubric_evaluation": evaluation(),
        "strengths": ["The answer connected evidence to the decision."],
        "weaknesses": [],
        "suggestions": [],
        "topic_updates": [],
        "introduced_facts": ["The program includes practical projects."],
        "unresolved_concerns": [],
        "next_question_candidates": [
            next_candidate,
            candidate("Which courses are most relevant to your goals", "program_fit"),
            candidate("What skills do you expect to gain", "program_fit"),
        ],
    })
    assert "Score: 100%" in strong_reply
    assert assistant.local_get("topic_coverage")["university_research"]["status"] == "covered"
    assert assistant.local_get("current_question") == next_candidate["question"]
    print("dynamic training rubric smoke test passed")


if __name__ == "__main__":
    run()
