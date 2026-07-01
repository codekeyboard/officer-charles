<?php

use App\Models\AiMessage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

test('ai message validates mode and visa type', function () {
    $response = $this->postJson('/api/ai/messages', [
        'content' => 'My answer',
        'mode' => 'invalid',
        'visa_type' => 'tourist',
    ]);

    $response
        ->assertStatus(422)
        ->assertJsonValidationErrors(['mode', 'visa_type']);
});

function fakeSessionState(array $overrides = []): array
{
    return array_merge([
        'experience' => 'chat',
        'phase' => 'mode_selection',
        'selected_mode' => null,
        'selected_visa_type' => null,
        'interview_status' => 'mode_selection',
        'current_question' => null,
        'current_question_index' => 0,
        'total_questions' => 0,
        'answered_questions' => [],
        'last_answer_quality' => null,
        'evaluation_ready' => false,
        'completed' => false,
        'setup_stage' => 'mode_selection',
        'setup_completed' => false,
        'current_question_skippable' => false,
        'document_question_skipped' => false,
        'accepted_dynamic_questions' => 0,
        'minimum_questions' => 3,
        'maximum_questions' => 10,
    ], $overrides);
}

test('ai message stores selected visa type and calls core v3 chat', function () {
    Http::fake([
        'http://127.0.0.1:8020/chat' => Http::response([
            'content' => 'Good morning. Please provide your passport.',
            'state' => fakeSessionState([
                'phase' => 'interview',
                'selected_mode' => 'interview',
                'selected_visa_type' => 'b1_b2',
                'current_question' => 'What is the purpose of your visit to the United States?',
                'current_question_index' => 1,
                'total_questions' => 8,
            ]),
        ], 200),
    ]);

    $response = $this->postJson('/api/ai/messages', [
        'content' => 'Start my interview.',
        'mode' => 'interview',
        'visa_type' => 'b1_b2',
    ]);

    $response->assertCreated();

    expect(AiMessage::where('role', 'user')->first()->visa_type)->toBe('b1_b2')
        ->and(AiMessage::where('role', 'assistant')->first()->visa_type)->toBe('b1_b2');

    $response->assertJsonPath('session_state.selected_visa_type', 'b1_b2');

    Http::assertSent(fn ($request) => $request->url() === 'http://127.0.0.1:8020/chat'
        && $request['content'] === 'Start my interview.'
        && $request['mode'] === 'interview'
        && $request['visa_type'] === 'b1_b2'
        && is_string($request['visitor_id'])
        && is_string($request['session_id'])
        && ! isset($request['gemini']));
});

test('training chat forwards to core v3 and stores returned retry state', function () {
    Http::fake([
        'http://127.0.0.1:8020/chat' => Http::response([
            'content' => "Strengths:\n- Clear goal.\n\nWeaknesses:\n- Needs detail.\n\nImprovement Suggestions:\n- Add sponsor details.\n\nRetry:\nPlease answer the same question again.",
            'state' => fakeSessionState([
                'phase' => 'training',
                'selected_mode' => 'training',
                'selected_visa_type' => 'f1',
                'current_question' => 'How will you pay for your studies?',
                'current_question_index' => 6,
                'total_questions' => 10,
                'answered_questions' => ['How will you pay for your studies?'],
            ]),
        ], 200),
    ]);

    $response = $this->postJson('/api/ai/messages', [
        'content' => 'My parents will pay.',
        'mode' => 'training',
        'visa_type' => 'f1',
    ]);

    $response->assertCreated();

    $response
        ->assertJsonPath('session_state.phase', 'training')
        ->assertJsonPath('session_state.answered_questions.0', 'How will you pay for your studies?');

    Http::assertSent(fn ($request) => $request->url() === 'http://127.0.0.1:8020/chat'
        && $request['mode'] === 'training'
        && $request['visa_type'] === 'f1'
        && $request['content'] === 'My parents will pay.'
        && is_string($request['visitor_id'])
        && is_string($request['session_id'])
        && ! isset($request['gemini']));
});

test('real simulation asks for final report only after target interview turns', function () {
    Http::fake([
        'http://127.0.0.1:8020/chat' => Http::response([
            'content' => "Interview Performance Report\n\nOverall Performance Score: 75%\n\nWhat Went Well\n- Clear answers.\n\nAreas To Improve\n- Add detail.",
            'state' => fakeSessionState([
                'phase' => 'completed',
                'selected_mode' => 'interview',
                'selected_visa_type' => 'b1_b2',
                'current_question_index' => 8,
                'total_questions' => 8,
                'answered_questions' => ['Purpose of visit'],
                'evaluation_ready' => true,
                'completed' => true,
            ]),
        ], 200),
    ]);

    $visitorId = (string) Str::uuid();
    $sessionId = (string) Str::uuid();

    for ($index = 0; $index < 12; $index++) {
        AiMessage::create([
            'visitor_id' => $visitorId,
            'session_id' => $sessionId,
            'role' => 'assistant',
            'content' => 'Officer question '.($index + 1).'? ',
            'mode' => 'interview',
            'visa_type' => 'b1_b2',
        ]);
    }

    $response = $this
        ->withCredentials()
        ->withUnencryptedCookie('officer_charles_visitor', $visitorId)
        ->withUnencryptedCookie('officer_charles_session_interview_b1_b2', $sessionId)
        ->postJson('/api/ai/messages', [
            'content' => 'That is all.',
            'mode' => 'interview',
            'visa_type' => 'b1_b2',
        ]);

    $response
        ->assertCreated()
        ->assertJson(['session_completed' => true]);

    Http::assertSent(fn ($request) => $request->url() === 'http://127.0.0.1:8020/chat'
        && count($request['history']) === 12
        && $request['mode'] === 'interview'
        && $request['visa_type'] === 'b1_b2'
        && $request['visitor_id'] === $visitorId
        && $request['session_id'] === $sessionId
        && ! isset($request['gemini']));
});

test('core v3 chat failure keeps the user answer saved', function () {
    Http::fake([
        'http://127.0.0.1:8020/chat' => Http::response(['detail' => 'Bad key'], 502),
    ]);

    $response = $this->postJson('/api/ai/messages', [
        'content' => 'This answer should remain saved.',
        'mode' => 'training',
        'visa_type' => 'f1',
    ]);

    $response->assertStatus(502);

    expect(AiMessage::where('role', 'user')->count())->toBe(1)
        ->and(AiMessage::where('role', 'assistant')->count())->toBe(0);
});

test('live session calls core v3', function () {
    Http::fake([
        'http://127.0.0.1:8020/sessions' => Http::response(['session_id' => 'live-session-1'], 200),
    ]);

    $response = $this->postJson('/api/ai/live-session', [
        'mode' => 'interview',
        'visa_type' => 'f1',
    ]);

    $response
        ->assertOk()
        ->assertJson([
            'session_id' => 'live-session-1',
            'ws_url' => 'ws://127.0.0.1:8020/ws/live-session-1',
        ]);

    $response->assertJsonPath('session_state.experience', 'live');

    Http::assertSent(fn ($request) => $request->url() === 'http://127.0.0.1:8020/sessions'
        && $request['mode'] === 'interview'
        && $request['visa_type'] === 'f1');
});

test('restart closes only the selected mode and visa session', function () {
    $visitorId = (string) Str::uuid();
    $f1Session = (string) Str::uuid();
    $visitorSession = (string) Str::uuid();

    AiMessage::create([
        'visitor_id' => $visitorId,
        'session_id' => $f1Session,
        'role' => 'user',
        'content' => 'F1 answer',
        'mode' => 'training',
        'visa_type' => 'f1',
    ]);

    AiMessage::create([
        'visitor_id' => $visitorId,
        'session_id' => $visitorSession,
        'role' => 'user',
        'content' => 'Visitor answer',
        'mode' => 'training',
        'visa_type' => 'b1_b2',
    ]);

    $response = $this
        ->withCredentials()
        ->withUnencryptedCookie('officer_charles_visitor', $visitorId)
        ->withUnencryptedCookie('officer_charles_session_training_f1', $f1Session)
        ->postJson('/api/ai/restart', [
            'mode' => 'training',
            'visa_type' => 'f1',
        ]);

    $response->assertOk();

    expect(AiMessage::where('session_id', $f1Session)->first()->completed_at)->not->toBeNull()
        ->and(AiMessage::where('session_id', $visitorSession)->first()->completed_at)->toBeNull();
});

test('chat session resets after five minutes without a user answer', function () {
    Http::fake([
        'http://127.0.0.1:8020/chat' => Http::response([
            'content' => 'Good morning. Please provide your passport and your Form I-20.',
            'state' => fakeSessionState([
                'phase' => 'interview',
                'selected_mode' => 'interview',
                'selected_visa_type' => 'f1',
            ]),
        ], 200),
    ]);

    $visitorId = (string) Str::uuid();
    $oldSession = (string) Str::uuid();

    $oldMessage = AiMessage::create([
        'visitor_id' => $visitorId,
        'session_id' => $oldSession,
        'role' => 'assistant',
        'content' => 'Why do you want to study in the United States?',
        'mode' => 'interview',
        'visa_type' => 'f1',
    ]);

    AiMessage::whereKey($oldMessage->id)->update([
        'created_at' => now()->subMinutes(6),
        'updated_at' => now()->subMinutes(6),
    ]);

    $response = $this
        ->withCredentials()
        ->withUnencryptedCookie('officer_charles_visitor', $visitorId)
        ->withUnencryptedCookie('officer_charles_session_interview_f1', $oldSession)
        ->postJson('/api/ai/messages', [
            'content' => 'I want to study computer science.',
            'mode' => 'interview',
            'visa_type' => 'f1',
        ]);

    $response
        ->assertCreated()
        ->assertJson(['session_reset' => true]);

    expect(AiMessage::where('session_id', $oldSession)->first()->completed_at)->not->toBeNull()
        ->and($response->json('user.session_id'))->not->toBe($oldSession);
});
