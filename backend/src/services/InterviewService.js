const crypto = require('crypto');
const aiService = require('@src/services/AIService');
const UsersServiceModule = require('@src/services/UsersService');
const AppErrorModule = require('@src/utils/classes/AppError');
const FoundryFinalEvaluationServiceModule = require('@src/utils/classes/FoundryFinalEvaluationService');
const { createInterviewRepository } = require('@src/services/InterviewRepository');
const { createInterviewStoryRepository } = require('@src/services/InterviewStoryRepository');
const notificationService = require('@src/services/NotificationService');
const billingService = require('@src/services/BillingService');

const AppError = AppErrorModule.default || AppErrorModule.AppError;
const FoundryFinalEvaluationService = FoundryFinalEvaluationServiceModule.default || FoundryFinalEvaluationServiceModule.FoundryFinalEvaluationService;
const usersService = UsersServiceModule.default || UsersServiceModule;

class InterviewService {
  constructor({
    repository = createInterviewRepository(),
    storyRepository = createInterviewStoryRepository(),
    finalEvaluationService = new FoundryFinalEvaluationService()
  } = {}) {
    this.repository = repository;
    this.storyRepository = storyRepository;
    this.finalEvaluationService = finalEvaluationService;
  }

  async startChatInterview(user, input = {}) {
    const visaType = this.validateVisaType(input.visaType);
    const mode = this.validateMode(input.mode);
    const interviewId = `chat_${crypto.randomUUID()}`;
    await this.closeExistingActiveChatInterviews(user, mode);
    await billingService.consumeInterviewAttempt(user.id, 'CHAT', mode, { interviewId });

    try {
      const profile = await usersService.getProfile(user.id);
      const interviewStory = await this.storyRepository.findByUserAndVisa(user.id, visaType);
      const aiUser = {
        ...user,
        name: profile.name || user.name || 'Applicant'
      };

      const started = await aiService.startChatInterview(aiUser, {
        interviewId,
        visaType,
        mode,
        userName: aiUser.name,
        interviewStory
      });

      const interview = await this.repository.createInterview({
        id: started.interviewId,
        userId: user.id,
        interviewType: 'CHAT',
        visaType,
        mode,
        status: 'ACTIVE',
        currentQuestion: started.currentQuestion
      });

      await this.repository.saveMessage({
        interviewId: interview.id,
        userId: user.id,
        role: 'assistant',
        content: started.message,
        question: started.currentQuestion,
        metadata: { event: 'chat_started' }
      });

      return {
        interviewId: interview.id,
        interviewType: 'CHAT',
        visaType,
        mode,
        message: started.message,
        currentQuestion: started.currentQuestion
      };
    } catch (error) {
      await this.refundSystemFailedInterview({
        user,
        interviewId,
        interviewType: 'CHAT',
        mode,
        reason: 'chat_start_failed',
        error
      });
      throw error;
    }
  }

  async sendChatMessage(user, interviewId, message) {
    const interview = await this.requireAccessibleInterview(user, interviewId);
    if (interview.interviewType !== 'CHAT') {
      throw this.error(400, 'This endpoint only supports chat interviews.', 'INVALID_INTERVIEW_TYPE');
    }
    if (interview.status === 'COMPLETED') {
      throw this.error(409, 'Interview is already completed.', 'INTERVIEW_COMPLETED');
    }

    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
      throw this.error(400, 'message is required.', 'VALIDATION_ERROR');
    }

    try {
      await this.repository.saveMessage({
        interviewId,
        userId: user.id,
        role: 'user',
        content: cleanMessage,
        question: interview.currentQuestion,
        metadata: { event: 'user_answer' }
      });

      const result = await aiService.sendChatInterviewMessage(user, interviewId, cleanMessage);
      const assistantMessage = result.assistantMessage || result.message || '';

      if (result.status === 'COMPLETED') {
        return this.persistCompletedChatInterview({
          interview,
          result,
          assistantMessage,
          notify: true
        });
      }

      await this.repository.saveMessage({
        interviewId,
        userId: user.id,
        role: 'assistant',
        content: assistantMessage,
        question: result.nextQuestion || interview.currentQuestion,
        score: result.score,
        feedback: result.feedback,
        metadata: {
          answerAccepted: result.answerAccepted,
          shouldRepeatQuestion: result.shouldRepeatQuestion,
          nextAction: result.nextAction
        }
      });

      await this.repository.updateInterview(interviewId, {
        currentQuestion: result.nextQuestion || interview.currentQuestion,
        ...(result.status === 'COMPLETED' ? { status: 'COMPLETED', endedAt: new Date() } : {})
      });

      return result;
    } catch (error) {
      await this.refundIfSystemError({
        user,
        interview,
        interviewType: 'CHAT',
        mode: interview.mode,
        reason: 'chat_message_failed',
        error
      });
      throw error;
    }
  }

  async completeChatInterview(user, interviewId) {
    const interview = await this.requireAccessibleInterview(user, interviewId);
    if (interview.interviewType !== 'CHAT') {
      throw this.error(400, 'This endpoint only supports chat interviews.', 'INVALID_INTERVIEW_TYPE');
    }

    try {
      const messages = await this.repository.listMessages(interview.id);
      const evaluation = await this.finalEvaluationService.evaluate({
        interview,
        interviewType: 'CHAT',
        visaType: interview.visaType,
        mode: interview.mode,
        messages
      });
      const result = {
        interviewId,
        status: 'COMPLETED',
        assistantMessage: evaluation.message,
        finalEvaluation: evaluation
      };
      return this.persistCompletedChatInterview({
        interview,
        result,
        assistantMessage: result.assistantMessage || result.finalEvaluation?.message || '',
        notify: interview.status !== 'COMPLETED'
      });
    } catch (error) {
      await this.refundIfSystemError({
        user,
        interview,
        interviewType: 'CHAT',
        mode: interview.mode,
        reason: 'chat_complete_failed',
        error
      });
      throw error;
    }
  }

  async persistCompletedChatInterview({ interview, result, assistantMessage = '', notify = true }) {
    const evaluation = result.finalEvaluation || {};
    const recommendations = evaluation.recommendations || evaluation.improvements || [];
    const weaknesses = evaluation.weaknesses || recommendations;
    const finalFeedback = evaluation.message || assistantMessage || '';

    await this.repository.saveMessage({
      interviewId: interview.id,
      userId: interview.userId,
      role: 'assistant',
      content: assistantMessage || finalFeedback,
      metadata: { event: 'chat_completed', finalEvaluation: evaluation }
    });

    await this.repository.updateInterview(interview.id, {
      status: 'COMPLETED',
      finalScore: evaluation.totalScore ?? evaluation.finalScore ?? 0,
      finalFeedback,
      strengths: evaluation.strengths || [],
      weaknesses,
      recommendations,
      finalEvaluation: evaluation,
      endedAt: new Date()
    });

    if (notify) {
      await notificationService.createForUser(interview.userId, {
        title: 'Chat interview completed',
        body: `Your ${interview.mode.toLowerCase()} chat interview evaluation is ready.`,
        type: 'interview'
      });
    }

    return {
      finalScore: evaluation.totalScore ?? evaluation.finalScore ?? 0,
      result: evaluation.label || evaluation.result || 'Completed',
      strengths: evaluation.strengths || [],
      weaknesses,
      recommendations,
      interviewId: interview.id,
      status: 'COMPLETED',
      assistantMessage: assistantMessage || finalFeedback,
      finalEvaluation: evaluation
    };
  }

  async getInterview(user, interviewId) {
    return this.requireAccessibleInterview(user, interviewId);
  }

  async getMessages(user, interviewId) {
    await this.requireAccessibleInterview(user, interviewId);
    return {
      interviewId,
      messages: await this.repository.listMessages(interviewId)
    };
  }

  async getEvaluation(user, interviewId) {
    const interview = await this.requireAccessibleInterview(user, interviewId);
    return {
      interviewId,
      status: interview.status,
      finalScore: interview.finalScore,
      finalFeedback: interview.finalFeedback,
      strengths: interview.strengths || [],
      weaknesses: interview.weaknesses || [],
      recommendations: interview.recommendations || [],
      finalEvaluation: interview.finalEvaluation || null
    };
  }

  async requireAccessibleInterview(user, interviewId) {
    if (!interviewId) {
      throw this.error(400, 'interviewId is required.', 'VALIDATION_ERROR');
    }
    const interview = await this.repository.findById(interviewId);
    if (!interview) {
      throw this.error(404, 'Interview not found.', 'INTERVIEW_NOT_FOUND');
    }
    if (interview.userId !== user.id && !['admin', 'development'].includes(user.role)) {
      throw this.error(403, 'You do not have access to this interview.', 'INTERVIEW_FORBIDDEN');
    }
    return interview;
  }

  validateVisaType(value) {
    const visaType = String(value || '').trim().toUpperCase();
    if (!['F1', 'B1_B2'].includes(visaType)) {
      throw this.error(400, 'visaType must be B1_B2 or F1.', 'INVALID_VISA_TYPE');
    }
    return visaType;
  }

  validateMode(value) {
    const mode = String(value || '').trim().toUpperCase();
    if (!['TRAINING', 'SIMULATION'].includes(mode)) {
      throw this.error(400, 'mode must be TRAINING or SIMULATION.', 'INVALID_INTERVIEW_MODE');
    }
    return mode;
  }

  async closeExistingActiveChatInterviews(user, mode) {
    if (['admin', 'development'].includes(user.role)) return;
    const activeInterviews = await this.repository.listActiveByTypeAndMode(user.id, 'CHAT', mode);
    if (!activeInterviews.length) return;

    const endedAt = new Date();
    await Promise.all(activeInterviews.map(async (interview) => {
      await this.repository.saveMessage({
        interviewId: interview.id,
        userId: interview.userId,
        role: 'assistant',
        content: 'This interview was closed automatically before starting a new chat interview in the same mode.',
        metadata: {
          event: 'chat_auto_abandoned_before_new_start',
          previousStatus: interview.status
        }
      });
      await this.repository.updateInterview(interview.id, {
        status: 'ABANDONED',
        endedAt
      });
      await billingService.refundInterviewAttempt(interview.userId, 'CHAT', interview.mode, {
        interviewId: interview.id,
        reason: 'stale_chat_auto_abandoned',
        metadata: {
          source: 'chat_start_cleanup'
        }
      });
    }));
  }

  async refundSystemFailedInterview({ user, interviewId, interviewType, mode, reason, error }) {
    await this.repository.updateInterview(interviewId, {
      status: 'ABANDONED',
      endedAt: new Date()
    }).catch(() => {});
    await billingService.refundInterviewAttempt(user.id, interviewType, mode, {
      interviewId,
      reason,
      metadata: {
        source: 'system_error',
        errorCode: error?.errorCode || null,
        message: error?.publicMessage || error?.message || 'Interview startup failed.'
      }
    });
  }

  async refundIfSystemError({ user, interview, interviewType, mode, reason, error }) {
    if (!this.isSystemInterviewError(error) || interview.status !== 'ACTIVE') return;
    await this.repository.updateInterview(interview.id, {
      status: 'ABANDONED',
      endedAt: new Date()
    }).catch(() => {});
    await billingService.refundInterviewAttempt(user.id, interviewType, mode, {
      interviewId: interview.id,
      reason,
      metadata: {
        source: 'system_error',
        errorCode: error?.errorCode || null,
        message: error?.publicMessage || error?.message || 'Interview failed.'
      }
    });
  }

  isSystemInterviewError(error) {
    if (error?.errorCode === 'EVALUATION_UNAVAILABLE') return false;
    if (['AI_PROVIDER_ERROR', 'AI_RESPONSE_PARSE_ERROR', 'AI_CONFIG_ERROR', 'LIVE_SESSION_ERROR', 'AZURE_AUTH_ERROR'].includes(error?.errorCode)) return true;
    const statusCode = Number(error?.statusCode || error?.status || 500);
    return statusCode >= 500;
  }

  error(statusCode, publicMessage, errorCode) {
    return new AppError({ statusCode, publicMessage, internalMessage: publicMessage, errorCode });
  }
}

module.exports = new InterviewService();
module.exports.InterviewService = InterviewService;
