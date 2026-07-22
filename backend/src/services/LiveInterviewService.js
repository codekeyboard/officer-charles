const crypto = require('crypto');
const config = require('@src/config/env.config');
const AppErrorModule = require('@src/utils/classes/AppError');
const InterviewModePolicyModule = require('@src/utils/classes/InterviewModePolicy');
const InterviewScoringEngineModule = require('@src/utils/classes/InterviewScoringEngine');
const LiveInterviewAgentModule = require('@src/utils/classes/LiveInterviewAgent');
const VoiceLiveClientModule = require('@src/utils/classes/VoiceLiveClient');
const RealtimeWebRTCSessionModule = require('@src/utils/classes/RealtimeWebRTCSession');
const SecureTokenServiceModule = require('@src/utils/classes/SecureTokenService');
const FoundryFinalEvaluationServiceModule = require('@src/utils/classes/FoundryFinalEvaluationService');
const UsersServiceModule = require('@src/services/UsersService');
const { createInterviewRepository } = require('@src/services/InterviewRepository');
const { createInterviewStoryRepository } = require('@src/services/InterviewStoryRepository');
const notificationService = require('@src/services/NotificationService');
const billingService = require('@src/services/BillingService');

const AppError = AppErrorModule.default || AppErrorModule.AppError;
const InterviewModePolicy = InterviewModePolicyModule.default || InterviewModePolicyModule.InterviewModePolicy;
const InterviewScoringEngine = InterviewScoringEngineModule.default || InterviewScoringEngineModule.InterviewScoringEngine;
const LiveInterviewAgent = LiveInterviewAgentModule.default || LiveInterviewAgentModule.LiveInterviewAgent;
const VoiceLiveClient = VoiceLiveClientModule.default || VoiceLiveClientModule.VoiceLiveClient;
const RealtimeWebRTCSession = RealtimeWebRTCSessionModule.default || RealtimeWebRTCSessionModule.RealtimeWebRTCSession;
const SecureTokenService = SecureTokenServiceModule.default || SecureTokenServiceModule.SecureTokenService;
const FoundryFinalEvaluationService = FoundryFinalEvaluationServiceModule.default || FoundryFinalEvaluationServiceModule.FoundryFinalEvaluationService;
const usersService = UsersServiceModule.default || UsersServiceModule;

class LiveInterviewService {
  constructor({
    repository = createInterviewRepository(),
    storyRepository = createInterviewStoryRepository(),
    liveAgent = new LiveInterviewAgent(),
    voiceLiveClient = new VoiceLiveClient(),
    realtimeSession = new RealtimeWebRTCSession(),
    tokenService = new SecureTokenService(),
    scoringEngine = new InterviewScoringEngine(),
    modePolicy = new InterviewModePolicy(),
    finalEvaluationService = new FoundryFinalEvaluationService()
  } = {}) {
    this.repository = repository;
    this.storyRepository = storyRepository;
    this.liveAgent = liveAgent;
    this.voiceLiveClient = voiceLiveClient;
    this.realtimeSession = realtimeSession;
    this.tokenService = tokenService;
    this.scoringEngine = scoringEngine;
    this.modePolicy = modePolicy;
    this.finalEvaluationService = finalEvaluationService;
    this.maxRetryCount = config.ai.trainingMaxRetriesPerQuestion || 3;
  }

  async start(user, input = {}) {
    const visaType = this.validateVisaType(input.visaType);
    const mode = this.validateMode(input.mode);
    const provider = this.normalizeProvider(input.provider || 'VOICE_LIVE');
    const interviewId = `live_${crypto.randomUUID()}`;
    await this.closeExistingActiveLiveInterviews(user, mode);
    await billingService.consumeInterviewAttempt(user.id, 'LIVE', mode, { interviewId });

    try {
      const profile = await usersService.getProfile(user.id);
      const aiUser = { ...user, name: profile.name || user.name || 'Applicant' };
      const interviewStory = await this.storyRepository.findByUserAndVisa(user.id, visaType);

      let liveResponse;
      try {
        liveResponse = await this.liveAgent.createLiveSession(aiUser, {
          interviewId,
          userName: aiUser.name,
          visaType,
          mode,
          provider: provider === 'AZURE_REALTIME' ? 'REALTIME_WEBRTC' : provider,
          enableAvatar: Boolean(input.enableAvatar),
          interviewStory
        });
      } catch (error) {
        if (!this.isProviderConfigError(error)) throw error;
        liveResponse = this.buildLocalSessionResponse({ interviewId, provider, visaType, mode, enableAvatar: input.enableAvatar });
      }

      const sessionId = isUuid(liveResponse.sessionId) ? liveResponse.sessionId : crypto.randomUUID();
      const connectionInfo = {
        ...(liveResponse.connectionInfo || {}),
        sessionId
      };
      await this.repository.createInterview({
        id: interviewId,
        userId: user.id,
        interviewType: 'LIVE',
        visaType,
        mode,
        status: 'ACTIVE',
        currentQuestion: null
      });
      await this.repository.createLiveSession({
        id: sessionId,
        interviewId,
        userId: user.id,
        provider,
        status: 'active',
        connectionStatus: 'created',
        connectionInfo,
        sessionConfig: liveResponse.sessionConfig,
        enableAvatar: Boolean(input.enableAvatar),
        expiresAt: liveResponse.expiresAt || connectionInfo?.expiresAt || null
      });

      return {
        interviewId,
        sessionId,
        provider,
        mode,
        visaType,
        connectionInfo,
        sessionConfig: this.toFrontendSessionConfig(liveResponse.sessionConfig, input.enableAvatar)
      };
    } catch (error) {
      await this.refundSystemFailedInterview({
        user,
        interviewId,
        mode,
        reason: 'live_start_failed',
        error
      });
      throw error;
    }
  }

  async createToken(user, sessionId, input = {}) {
    const session = await this.requireSession(user, sessionId);
    if (session.status !== 'active') throw this.error(409, 'Live session is not active.', 'LIVE_SESSION_INACTIVE');
    const provider = this.normalizeProvider(input.provider || session.provider);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    try {
      if (provider === 'AZURE_REALTIME' && config.ai.enableRealtimeWebRtc) {
        const token = await this.tokenService.createRealtimeEphemeralToken({
          user,
          sessionConfig: session.sessionConfig
        });
        return { clientSecret: token.token, expiresAt: token.expiresAt };
      }

      return {
        clientSecret: `temporary_${provider.toLowerCase()}_${crypto.randomUUID()}`,
        expiresAt
      };
    } catch (error) {
      await this.refundActiveLiveIfSystemError({ user, session, reason: 'live_token_failed', error });
      throw error;
    }
  }

  async getConfig(user, sessionId) {
    const session = await this.requireSession(user, sessionId);
    return {
      sessionId,
      provider: session.provider,
      voice: session.sessionConfig?.voice?.name || session.sessionConfig?.voice || config.ai.defaultVoiceName || 'en-US-AvaNeural',
      avatarEnabled: Boolean(session.enableAvatar || session.sessionConfig?.avatar?.enabled),
      turnDetection: session.sessionConfig?.turn_detection || session.sessionConfig?.turnDetection || 'azure_semantic_vad',
      inputAudioSamplingRate: session.sessionConfig?.inputAudioSamplingRate || 24000
    };
  }

  async addTranscript(user, sessionId, input = {}) {
    const session = await this.requireSession(user, sessionId);
    const interview = await this.repository.findById(session.interviewId);
    const text = String(input.text || input.transcript || input.delta || '').trim();
    if (!text) throw this.error(400, 'Transcript text is required.', 'VALIDATION_ERROR');
    const speaker = String(input.speaker || input.role || 'user').toLowerCase() === 'assistant' ? 'assistant' : 'user';
    try {
      const transcript = await this.repository.saveLiveTranscript({
        sessionId,
        interviewId: session.interviewId,
        userId: user.id,
        speaker,
        text,
        timestampMs: input.timestampMs ?? null,
        isFinal: Boolean(input.isFinal)
      });
      const trainingFeedback = input.isFinal && speaker === 'user' && interview?.mode === 'TRAINING'
        ? await this.evaluateTrainingAnswer({ session, interview, transcript, answer: text })
        : null;
      await this.repository.saveMessage({
        interviewId: session.interviewId,
        userId: user.id,
        role: speaker,
        content: text,
        question: speaker === 'user' ? (interview?.currentQuestion || null) : text,
        score: trainingFeedback?.score ?? null,
        feedback: trainingFeedback?.feedback || null,
        metadata: {
          source: 'live_transcript',
          sessionId,
          isFinal: Boolean(input.isFinal),
          timestampMs: input.timestampMs ?? null,
          ...(trainingFeedback ? {
            answerAccepted: trainingFeedback.answerAccepted,
            shouldRepeatQuestion: trainingFeedback.shouldRepeatQuestion,
            nextAction: trainingFeedback.nextAction,
            retryCount: trainingFeedback.retryCount
          } : {})
        }
      });
      if (input.isFinal && speaker === 'assistant') {
        await this.repository.updateInterview(session.interviewId, { currentQuestion: text }).catch(() => {});
      }
      const agentCompletion = input.isFinal && speaker === 'assistant' && this.isAgentCompletionSignal(text)
        ? await this.complete(user, sessionId)
        : null;
      return {
        stored: true,
        transcript,
        trainingFeedback,
        ...(agentCompletion ? {
          status: 'COMPLETED',
          nextAction: 'COMPLETE_INTERVIEW',
          interviewId: session.interviewId,
          sessionId,
          finalEvaluation: agentCompletion.finalEvaluation
        } : {})
      };
    } catch (error) {
      await this.refundActiveLiveIfSystemError({ user, session, reason: 'live_transcript_failed', error });
      throw error;
    }
  }

  async evaluateTrainingAnswer({ session, interview, transcript, answer }) {
    const transcripts = await this.repository.listLiveTranscripts(session.id);
    const previousAnswers = transcripts
      .filter((item) => item.speaker === 'user' && item.isFinal && item.id !== transcript.id)
      .map((item) => ({ answer: item.text }));
    const currentQuestion = interview.currentQuestion || 'Live interview question';
    const interviewStory = await this.storyRepository.findByUserAndVisa(session.userId, interview.visaType).catch(() => null);
    const scoring = this.scoringEngine.scoreAnswer({
      question: currentQuestion,
      answer,
      visaType: interview.visaType,
      previousAnswers,
      interviewStory
    });
    const previousRetryCount = Number(session.sessionConfig?.trainingState?.retryCount || 0);
    const retryLimitReached = previousRetryCount >= this.maxRetryCount;
    const shouldRepeatQuestion = this.modePolicy.shouldRepeatQuestion(interview.mode, {
      isWeakAnswer: !scoring.answerAccepted || scoring.shouldRepeatQuestion
    }) && !retryLimitReached;
    const retryCount = shouldRepeatQuestion ? previousRetryCount + 1 : 0;
    await this.repository.updateLiveSession(session.id, {
      sessionConfig: {
        ...(session.sessionConfig || {}),
        trainingState: {
          retryCount,
          lastQuestion: currentQuestion,
          lastScore: scoring.totalScore,
          lastAction: shouldRepeatQuestion ? 'REPEAT_QUESTION' : 'ASK_NEXT_QUESTION'
        }
      }
    }).catch(() => {});
    return {
      answerAccepted: scoring.answerAccepted,
      score: scoring.totalScore,
      feedback: scoring.feedback,
      shouldRepeatQuestion,
      retryCount,
      retryLimitReached,
      nextAction: shouldRepeatQuestion ? 'REPEAT_QUESTION' : 'ASK_NEXT_QUESTION',
      question: currentQuestion
    };
  }

  async addEvent(user, sessionId, input = {}) {
    const session = await this.requireSession(user, sessionId);
    const eventType = String(input.eventType || input.type || 'unknown').trim();
    const payload = this.sanitizePayload(input.payload || input.event || {});
    const event = await this.repository.saveAiEvent({
      sessionId,
      interviewId: session.interviewId,
      userId: user.id,
      eventType,
      payload
    });
    return { stored: true, eventType, eventId: event.id };
  }

  async complete(user, sessionId) {
    const session = await this.requireSession(user, sessionId);
    if (session.status === 'completed') {
      const interview = await this.repository.findById(session.interviewId);
      return {
        finalScore: Number(interview?.finalScore || 0),
        result: interview?.finalScore >= 70 ? 'Good readiness' : 'Needs improvement',
        strengths: interview?.strengths || [],
        weaknesses: interview?.weaknesses || [],
        recommendations: interview?.recommendations || [],
        finalEvaluation: interview?.finalEvaluation || {
          totalScore: Number(interview?.finalScore || 0),
          label: interview?.finalScore >= 70 ? 'Good readiness' : 'Needs improvement',
          strengths: interview?.strengths || [],
          weaknesses: interview?.weaknesses || [],
          recommendations: interview?.recommendations || [],
          message: interview?.finalFeedback || 'Live interview evaluation is ready.'
        }
      };
    }
    try {
      const transcripts = await this.repository.listLiveTranscripts(sessionId);
      const interview = await this.repository.findById(session.interviewId);
      const finalEvaluation = await this.generateLiveFinalEvaluation({ session, interview, transcripts });

      await this.repository.updateLiveSession(sessionId, {
        status: 'completed',
        connectionStatus: 'closed',
        endedAt: new Date()
      });
      await this.repository.updateInterview(session.interviewId, {
        status: 'COMPLETED',
        finalScore: finalEvaluation.totalScore,
        finalFeedback: finalEvaluation.message,
        strengths: finalEvaluation.strengths,
        weaknesses: finalEvaluation.weaknesses,
        recommendations: finalEvaluation.recommendations,
        finalEvaluation,
        endedAt: new Date()
      });

      await notificationService.createForUser(session.userId, {
        title: 'Live interview completed',
        body: 'Your live interview evaluation is ready.',
        type: 'interview'
      });

      return {
        finalScore: finalEvaluation.totalScore,
        result: finalEvaluation.label,
        strengths: finalEvaluation.strengths,
        weaknesses: finalEvaluation.weaknesses,
        recommendations: finalEvaluation.recommendations,
        finalEvaluation
      };
    } catch (error) {
      await this.refundActiveLiveIfSystemError({ user, session, reason: 'live_complete_failed', error });
      throw error;
    }
  }

  async abandon(user, sessionId) {
    const session = await this.requireSession(user, sessionId);
    if (session.status === 'completed' || session.endedAt) {
      return {
        sessionId,
        status: session.status,
        endedAt: session.endedAt || null
      };
    }

    const endedAt = new Date();
    await this.repository.updateLiveSession(sessionId, {
      status: 'ended',
      connectionStatus: 'closed',
      endedAt
    });
    await this.repository.updateInterview(session.interviewId, {
      status: 'ABANDONED',
      endedAt
    });

    return {
      sessionId,
      status: 'ended',
      endedAt: endedAt.toISOString()
    };
  }

  async status(user, sessionId) {
    const session = await this.requireSession(user, sessionId);
    const transcripts = await this.repository.listLiveTranscripts(sessionId);
    const startedAt = new Date(session.startedAt || session.createdAt || Date.now());
    const endedAt = session.endedAt ? new Date(session.endedAt) : null;
    return {
      sessionId,
      status: session.status,
      connectionStatus: session.connectionStatus,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt ? endedAt.toISOString() : null,
      durationSeconds: Math.max(Math.round(((endedAt || new Date()) - startedAt) / 1000), 0),
      transcriptCount: transcripts.length
    };
  }

  async requireSession(user, sessionId) {
    const session = await this.repository.findLiveSession(sessionId);
    if (!session) throw this.error(404, 'Live interview session not found.', 'LIVE_SESSION_NOT_FOUND');
    if (session.userId !== user.id && !['admin', 'development'].includes(user.role)) {
      throw this.error(403, 'You do not have access to this live session.', 'LIVE_SESSION_FORBIDDEN');
    }
    return session;
  }

  buildLocalSessionResponse({ interviewId, provider, visaType, mode, enableAvatar }) {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const sessionConfig = provider === 'AZURE_REALTIME'
      ? new RealtimeWebRTCSession().buildSessionConfig({}, { visaType, mode, instructions: 'Conduct a live visa interview.' })
      : new VoiceLiveClient().createSessionConfig({}, { visaType, mode, avatar: { enabled: Boolean(enableAvatar) } });
    return {
      interviewId,
      sessionId: crypto.randomUUID(),
      provider,
      connectionInfo: {
        connectionType: 'webrtc',
        transport: 'webrtc',
        expiresAt,
        configurationRequired: true
      },
      sessionConfig,
      expiresAt
    };
  }

  toFrontendSessionConfig(configValue = {}, enableAvatar = false) {
    return {
      ...configValue,
      voice: configValue.voice?.name || configValue.voice || 'en-US-AvaNeural',
      avatarEnabled: Boolean(enableAvatar || configValue.avatar?.enabled)
    };
  }

  normalizeProvider(value) {
    const provider = String(value || '').trim().toUpperCase();
    if (provider === 'REALTIME_WEBRTC') return 'AZURE_REALTIME';
    if (!['VOICE_LIVE', 'AZURE_REALTIME'].includes(provider)) {
      throw this.error(400, 'provider must be VOICE_LIVE or AZURE_REALTIME.', 'INVALID_LIVE_PROVIDER');
    }
    return provider;
  }

  validateVisaType(value) {
    const visaType = String(value || '').trim().toUpperCase();
    if (!['F1', 'B1_B2'].includes(visaType)) throw this.error(400, 'visaType must be B1_B2 or F1.', 'INVALID_VISA_TYPE');
    return visaType;
  }

  validateMode(value) {
    const mode = String(value || '').trim().toUpperCase();
    if (!['TRAINING', 'SIMULATION'].includes(mode)) throw this.error(400, 'mode must be TRAINING or SIMULATION.', 'INVALID_INTERVIEW_MODE');
    return mode;
  }

  async ensureStartAllowed(user, mode) {
    if (['admin', 'development'].includes(user.role)) return;
    if (typeof this.repository.countActiveLiveByMode === 'function') {
      const activeLiveCount = await this.repository.countActiveLiveByMode(user.id, mode);
      if (activeLiveCount > 0) {
        throw this.error(409, 'You already have an active live interview in this mode. Complete it before starting another.', 'ACTIVE_INTERVIEW_EXISTS');
      }
      return;
    }
    const activeCounts = await this.repository.countActiveByTypeAndMode(user.id);
    const key = `LIVE_${mode}`;
    if ((activeCounts[key] || 0) > 0) {
      throw this.error(409, 'You already have an active live interview in this mode. Complete it before starting another.', 'ACTIVE_INTERVIEW_EXISTS');
    }

  }

  async closeExistingActiveLiveInterviews(user, mode) {
    if (['admin', 'development'].includes(user.role)) return;
    const sessions = typeof this.repository.listActiveLiveByMode === 'function'
      ? await this.repository.listActiveLiveByMode(user.id, mode)
      : [];
    if (!sessions.length) return;

    const endedAt = new Date();
    await Promise.all(sessions.map(async (session) => {
      await this.repository.updateLiveSession(session.id, {
        status: 'ended',
        connectionStatus: 'closed',
        endedAt
      });
      await this.repository.updateInterview(session.interviewId, {
        status: 'ABANDONED',
        endedAt
      });
      await billingService.refundInterviewAttempt(user.id, 'LIVE', mode, {
        interviewId: session.interviewId,
        reason: 'stale_live_auto_abandoned',
        metadata: {
          source: 'live_start_cleanup',
          sessionId: session.id
        }
      });
    }));
  }

  async refundSystemFailedInterview({ user, interviewId, mode, reason, error }) {
    await this.repository.updateInterview(interviewId, {
      status: 'ABANDONED',
      endedAt: new Date()
    }).catch(() => {});
    await billingService.refundInterviewAttempt(user.id, 'LIVE', mode, {
      interviewId,
      reason,
      metadata: {
        source: 'system_error',
        errorCode: error?.errorCode || null,
        message: error?.publicMessage || error?.message || 'Live interview startup failed.'
      }
    });
  }

  async refundActiveLiveIfSystemError({ user, session, reason, error }) {
    if (!this.isSystemInterviewError(error) || session.status !== 'active') return;
    const interview = await this.repository.findById(session.interviewId).catch(() => null);
    const endedAt = new Date();
    await this.repository.updateLiveSession(session.id, {
      status: 'ended',
      connectionStatus: 'closed',
      endedAt
    }).catch(() => {});
    await this.repository.updateInterview(session.interviewId, {
      status: 'ABANDONED',
      endedAt
    }).catch(() => {});
    await billingService.refundInterviewAttempt(user.id, 'LIVE', interview?.mode || session.interview?.mode || 'TRAINING', {
      interviewId: session.interviewId,
      reason,
      metadata: {
        source: 'system_error',
        sessionId: session.id,
        errorCode: error?.errorCode || null,
        message: error?.publicMessage || error?.message || 'Live interview failed.'
      }
    });
  }

  isSystemInterviewError(error) {
    if (error?.errorCode === 'EVALUATION_UNAVAILABLE') return false;
    if (['AI_PROVIDER_ERROR', 'AI_RESPONSE_PARSE_ERROR', 'AI_CONFIG_ERROR', 'LIVE_SESSION_ERROR', 'AZURE_AUTH_ERROR'].includes(error?.errorCode)) return true;
    const statusCode = Number(error?.statusCode || error?.status || 500);
    return statusCode >= 500;
  }

  sanitizePayload(payload) {
    return JSON.parse(JSON.stringify(payload, (key, value) => /api[-_]?key|authorization|token|secret|password/i.test(key) ? '[REDACTED]' : value));
  }

  isProviderConfigError(error) {
    return ['AI_CONFIG_ERROR', 'LIVE_SESSION_ERROR', 'AZURE_AUTH_ERROR'].includes(error?.errorCode);
  }

  isAgentCompletionSignal(text) {
    return normalizeCompletionText(text).includes('this completes the interview i will prepare your evaluation now');
  }

  async generateLiveFinalEvaluation({ session, interview, transcripts }) {
    return this.finalEvaluationService.evaluate({
      interview,
      liveSession: session,
      interviewType: 'LIVE',
      visaType: interview?.visaType,
      mode: interview?.mode,
      transcripts
    });
  }

  error(statusCode, publicMessage, errorCode) {
    return new AppError({ statusCode, publicMessage, internalMessage: publicMessage, errorCode });
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function normalizeCompletionText(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

module.exports = new LiveInterviewService();
module.exports.LiveInterviewService = LiveInterviewService;
