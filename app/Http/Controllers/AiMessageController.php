<?php

namespace App\Http\Controllers;

use App\Models\AiMessage;
use App\Models\AiSessionState;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AiMessageController extends Controller
{
    private const SESSION_TARGET = 12;

    private const INACTIVITY_TIMEOUT_MINUTES = 5;

    private const VISITOR_COOKIE = 'officer_charles_visitor';

    private const SESSION_COOKIE_PREFIX = 'officer_charles_session_';

    private const MODES = ['training', 'interview'];

    private const VISA_TYPES = ['f1', 'b1_b2'];

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'content' => ['required', 'string', 'max:10000'],
            'mode' => ['nullable', 'string', 'in:training,interview'],
            'visa_type' => ['nullable', 'string', 'in:f1,b1_b2'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $mode = $request->input('mode', 'interview');
        $visaType = $request->input('visa_type', 'f1');
        $visitorId = $this->visitorId($request);
        $activeSession = $this->activeSession($request, $visitorId, $mode, $visaType);
        $sessionId = $activeSession['session_id'];

        $history = AiMessage::where('visitor_id', $visitorId)
            ->where('session_id', $sessionId)
            ->where('mode', $mode)
            ->where('visa_type', $visaType)
            ->whereNull('completed_at')
            ->orderBy('created_at', 'asc')
            ->get(['role', 'content'])
            ->toArray();

        $userMessage = AiMessage::create([
            'visitor_id' => $visitorId,
            'session_id' => $sessionId,
            'role' => 'user',
            'content' => $request->input('content'),
            'mode' => $mode,
            'visa_type' => $visaType,
        ]);

        try {
            $coreResponse = $this->callCoreV3Chat($request->input('content'), $history, $mode, $visaType);
        } catch (ConnectionException|\RuntimeException $exception) {
            Log::error('Core V3 chat response error', ['message' => $exception->getMessage()]);

            return $this->withSessionCookies(response()->json([
                'message' => $this->coreV3UnavailableMessage($exception),
                'user' => $userMessage,
            ], 502), $visitorId, $mode, $visaType, $sessionId);
        }

        $assistantMessage = AiMessage::create([
            'visitor_id' => $visitorId,
            'session_id' => $sessionId,
            'role' => 'assistant',
            'content' => $coreResponse['content'],
            'mode' => $mode,
            'visa_type' => $visaType,
        ]);

        $sessionState = $coreResponse['state'] ?? $this->defaultSessionState('chat');
        $this->saveSessionState($visitorId, $sessionId, 'chat', $mode, $visaType, $sessionState);

        $nextSessionId = $sessionId;
        $sessionCompleted = false;

        if ($this->isSessionComplete($mode, $coreResponse['content'], $history)) {
            AiMessage::where('visitor_id', $visitorId)
                ->where('session_id', $sessionId)
                ->where('mode', $mode)
                ->where('visa_type', $visaType)
                ->update(['completed_at' => now()]);
            AiSessionState::where('visitor_id', $visitorId)
                ->where('session_id', $sessionId)
                ->where('experience', 'chat')
                ->update(['completed_at' => now()]);

            $nextSessionId = (string) Str::uuid();
            $sessionCompleted = true;
        }

        return $this->withSessionCookies(response()->json([
            'user' => $userMessage,
            'assistant' => $assistantMessage,
            'session_completed' => $sessionCompleted,
            'session_reset' => $activeSession['timed_out'],
            'session_state' => $sessionState,
        ], 201), $visitorId, $mode, $visaType, $nextSessionId);
    }

    public function index(Request $request): JsonResponse
    {
        $visitorId = $this->visitorId($request);
        $sessionMap = [];

        foreach (self::MODES as $mode) {
            foreach (self::VISA_TYPES as $visaType) {
                $sessionMap[] = [
                    'mode' => $mode,
                    'visa_type' => $visaType,
                    'session_id' => $this->activeSession($request, $visitorId, $mode, $visaType)['session_id'],
                ];
            }
        }

        $messages = AiMessage::where('visitor_id', $visitorId)
            ->whereNull('completed_at')
            ->where(function ($query) use ($sessionMap) {
                foreach ($sessionMap as $session) {
                    $query->orWhere(fn ($item) => $item
                        ->where('mode', $session['mode'])
                        ->where('visa_type', $session['visa_type'])
                        ->where('session_id', $session['session_id']));
                }
            })
            ->orderBy('created_at', 'asc')
            ->get(['id', 'role', 'content', 'agent_id', 'created_at', 'mode', 'visa_type']);

        $activeSession = $this->activeSession($request, $visitorId, 'training', 'f1');

        return $this->withAllSessionCookies(response()->json([
            'messages' => $messages,
            'session_state' => $this->sessionState($visitorId, $activeSession['session_id'], 'chat', 'training', 'f1'),
        ]), $visitorId, $sessionMap);
    }

    public function restart(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'mode' => ['required', 'string', 'in:training,interview'],
            'visa_type' => ['nullable', 'string', 'in:f1,b1_b2'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $mode = $request->input('mode');
        $visaType = $request->input('visa_type', 'f1');
        $visitorId = $this->visitorId($request);
        $sessionId = $this->activeSession($request, $visitorId, $mode, $visaType)['session_id'];

        AiMessage::where('visitor_id', $visitorId)
            ->where('session_id', $sessionId)
            ->where('mode', $mode)
            ->where('visa_type', $visaType)
            ->whereNull('completed_at')
            ->update(['completed_at' => now()]);
        AiSessionState::where('visitor_id', $visitorId)
            ->where('session_id', $sessionId)
            ->where('experience', 'chat')
            ->update(['completed_at' => now()]);

        return $this->withSessionCookies(response()->json([
            'messages' => [],
            'session_restarted' => true,
            'session_state' => $this->defaultSessionState('chat'),
        ]), $visitorId, $mode, $visaType, (string) Str::uuid());
    }

    public function liveSession(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'mode' => ['required', 'string', 'in:training,interview'],
            'visa_type' => ['required', 'string', 'in:f1,b1_b2'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $visitorId = $this->visitorId($request);
        try {
            $response = Http::timeout(20)
                ->acceptJson()
                ->post($this->coreV3BaseUrl().'/sessions', [
                    'mode' => $request->input('mode'),
                    'visa_type' => $request->input('visa_type'),
                    'visitor_id' => $visitorId,
                ]);
        } catch (ConnectionException $exception) {
            Log::error('Core V3 live session connection error', ['message' => $exception->getMessage()]);

            return response()->json([
                'message' => $this->coreV3UnavailableMessage($exception),
            ], 502);
        }

        if ($response->failed()) {
            Log::error('Core V3 live session error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return response()->json([
                'message' => 'Could not start the live interview service.',
            ], 502);
        }

        $sessionId = $response->json('session_id');

        return $this->withVisitorCookie(response()->json([
            'session_id' => $sessionId,
            'ws_url' => rtrim(config('services.core_v3.ws_public_url'), '/').'/ws/'.$sessionId,
            'session_state' => $this->defaultSessionState('live'),
        ]), $visitorId);
    }

    /**
     * @return array{content: string, state: array<string, mixed>|null}
     */
    private function callCoreV3Chat(string $userMessage, array $history, string $mode, string $visaType): array
    {
        if (! filled(config('services.gemini.api_key'))) {
            throw new \RuntimeException('Gemini API key is not configured.');
        }

        $response = Http::timeout(60)
            ->acceptJson()
            ->post($this->coreV3BaseUrl().'/chat', [
                'content' => $userMessage,
                'history' => $history,
                'mode' => $mode,
                'visa_type' => $visaType,
                'session_target' => self::SESSION_TARGET,
                'gemini' => [
                    'api_key' => config('services.gemini.api_key'),
                    'model' => config('services.gemini.model', 'gemini-2.5-flash'),
                    'fallback_model' => config('services.gemini.fallback_model', 'gemini-2.5-flash-lite'),
                ],
            ]);

        if ($response->failed()) {
            Log::error('Core V3 chat error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            $detail = $response->json('detail');

            throw new \RuntimeException(is_string($detail) ? $detail : 'Officer Charles could not process that message.');
        }

        return [
            'content' => $response->json('content') ?? 'No response received.',
            'state' => $response->json('state'),
        ];
    }

    private function coreV3UnavailableMessage(\Throwable $exception): string
    {
        if ($exception instanceof ConnectionException) {
            return 'Officer Charles core service is not running. Please start Core V3 and try again.';
        }

        return $exception->getMessage();
    }

    private function saveSessionState(
        string $visitorId,
        string $sessionId,
        string $experience,
        ?string $mode,
        ?string $visaType,
        array $state,
    ): void {
        AiSessionState::updateOrCreate(
            [
                'visitor_id' => $visitorId,
                'session_id' => $sessionId,
                'experience' => $experience,
            ],
            [
                'mode' => $mode,
                'visa_type' => $visaType,
                'state' => $state,
                'completed_at' => ! empty($state['completed']) ? now() : null,
            ],
        );
    }

    private function sessionState(
        string $visitorId,
        string $sessionId,
        string $experience,
        ?string $mode,
        ?string $visaType,
    ): array {
        $sessionState = AiSessionState::where('visitor_id', $visitorId)
            ->where('session_id', $sessionId)
            ->where('experience', $experience)
            ->whereNull('completed_at')
            ->first(['state']);

        return is_array($sessionState?->state) ? $sessionState->state : $this->defaultSessionState($experience, $mode, $visaType);
    }

    private function defaultSessionState(string $experience, ?string $mode = null, ?string $visaType = null): array
    {
        return [
            'experience' => $experience,
            'phase' => 'mode_selection',
            'selected_mode' => null,
            'selected_visa_type' => null,
            'interview_status' => 'setup',
            'current_question' => null,
            'current_question_index' => 0,
            'total_questions' => 0,
            'answered_questions' => [],
            'last_answer_quality' => null,
            'evaluation_ready' => false,
            'completed' => false,
        ];
    }

    private function coreV3BaseUrl(): string
    {
        return rtrim(config('services.core_v3.base_url'), '/');
    }

    private function visitorId(Request $request): string
    {
        $visitorId = $request->cookie(self::VISITOR_COOKIE);

        return is_string($visitorId) && Str::isUuid($visitorId) ? $visitorId : (string) Str::uuid();
    }

    /**
     * @return array{session_id: string, timed_out: bool}
     */
    private function activeSession(Request $request, string $visitorId, string $mode, string $visaType): array
    {
        $cookieName = $this->sessionCookieName($mode, $visaType);
        $sessionId = $request->cookie($cookieName);

        if (is_string($sessionId) && Str::isUuid($sessionId)) {
            $hasCompletedMessages = AiMessage::where('visitor_id', $visitorId)
                ->where('session_id', $sessionId)
                ->where('mode', $mode)
                ->where('visa_type', $visaType)
                ->whereNotNull('completed_at')
                ->exists();

            if (! $hasCompletedMessages) {
                if ($this->sessionTimedOut($visitorId, $sessionId, $mode, $visaType)) {
                    $this->completeSession($visitorId, $sessionId, $mode, $visaType);

                    return ['session_id' => (string) Str::uuid(), 'timed_out' => true];
                }

                return ['session_id' => $sessionId, 'timed_out' => false];
            }
        }

        $existingSessionId = AiMessage::where('visitor_id', $visitorId)
            ->where('mode', $mode)
            ->where('visa_type', $visaType)
            ->whereNull('completed_at')
            ->latest('created_at')
            ->value('session_id');

        if (is_string($existingSessionId) && Str::isUuid($existingSessionId)) {
            if ($this->sessionTimedOut($visitorId, $existingSessionId, $mode, $visaType)) {
                $this->completeSession($visitorId, $existingSessionId, $mode, $visaType);

                return ['session_id' => (string) Str::uuid(), 'timed_out' => true];
            }

            return ['session_id' => $existingSessionId, 'timed_out' => false];
        }

        return ['session_id' => (string) Str::uuid(), 'timed_out' => false];
    }

    private function sessionTimedOut(string $visitorId, string $sessionId, string $mode, string $visaType): bool
    {
        $latestMessage = AiMessage::where('visitor_id', $visitorId)
            ->where('session_id', $sessionId)
            ->where('mode', $mode)
            ->where('visa_type', $visaType)
            ->whereNull('completed_at')
            ->latest('created_at')
            ->first(['role', 'created_at']);

        return $latestMessage?->role === 'assistant'
            && $latestMessage->created_at->lte(now()->subMinutes(self::INACTIVITY_TIMEOUT_MINUTES));
    }

    private function completeSession(string $visitorId, string $sessionId, string $mode, string $visaType): void
    {
        AiMessage::where('visitor_id', $visitorId)
            ->where('session_id', $sessionId)
            ->where('mode', $mode)
            ->where('visa_type', $visaType)
            ->whereNull('completed_at')
            ->update(['completed_at' => now()]);
    }

    private function withAllSessionCookies(JsonResponse $response, string $visitorId, array $sessionMap): JsonResponse
    {
        $this->withVisitorCookie($response, $visitorId);

        foreach ($sessionMap as $session) {
            $this->queueCookie($response, $this->sessionCookieName($session['mode'], $session['visa_type']), $session['session_id']);
        }

        return $response;
    }

    private function withSessionCookies(
        JsonResponse $response,
        string $visitorId,
        string $mode,
        string $visaType,
        string $sessionId,
    ): JsonResponse {
        $this->withVisitorCookie($response, $visitorId);
        $this->queueCookie($response, $this->sessionCookieName($mode, $visaType), $sessionId);

        return $response;
    }

    private function withVisitorCookie(JsonResponse $response, string $visitorId): JsonResponse
    {
        $this->queueCookie($response, self::VISITOR_COOKIE, $visitorId);

        return $response;
    }

    private function queueCookie(JsonResponse $response, string $name, string $value): void
    {
        $minutes = 60 * 24 * 365;

        $response->cookie($name, $value, $minutes, '/', null, false, true, false, 'lax');
    }

    private function sessionCookieName(string $mode, string $visaType): string
    {
        return self::SESSION_COOKIE_PREFIX.$mode.'_'.$visaType;
    }

    private function isSessionComplete(string $mode, string $assistantResponse, array $history): bool
    {
        if (str_contains($assistantResponse, 'FINAL REPORT') || str_contains($assistantResponse, 'Performance Report')) {
            return true;
        }

        return false;
    }
}
