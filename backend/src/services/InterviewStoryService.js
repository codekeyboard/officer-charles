const crypto = require('crypto');
const AppErrorModule = require('@src/utils/classes/AppError');
const { sanitizeUserInput } = require('@src/utils/functions/sanitizeUserInput');
const { createInterviewStoryRepository } = require('@src/services/InterviewStoryRepository');
const interviewStoryAIService = require('@src/services/InterviewStoryAIService');
const billingService = require('@src/services/BillingService');
const { STORY_BUILDER_QUESTIONS } = require('@src/constants/interviewStoryQuestions');

const AppError = AppErrorModule.default || AppErrorModule.AppError;

class InterviewStoryService {
  constructor({
    repository = createInterviewStoryRepository(),
    aiService = interviewStoryAIService,
    billing = billingService
  } = {}) {
    this.repository = repository;
    this.aiService = aiService;
    this.billing = billing;
  }

  async list(user) {
    this.assertUser(user);
    return {
      stories: (await this.repository.listForUser(user.id)).map((story) => this.normalizeStory(story)),
      creditCost: await this.getStoryBuilderCreditCost()
    };
  }

  async get(user, visaTypeValue) {
    this.assertUser(user);
    const visaType = this.validateVisaType(visaTypeValue);
    return {
      story: this.normalizeStory(await this.repository.findByUserAndVisa(user.id, visaType)),
      flow: await this.buildFlowPayload(user.id, visaType, { index: 0 }),
      creditCost: await this.getStoryBuilderCreditCost()
    };
  }

  async startFlow(user, visaTypeValue, input = {}) {
    this.assertUser(user);
    const visaType = this.validateVisaType(visaTypeValue);
    const existing = await this.repository.findByUserAndVisa(user.id, visaType);
    const storyState = this.normalizeStoryState(existing?.answers);
    if (input.reset === true) {
      storyState.readyToGenerate = false;
      storyState.lastAssistantQuestion = '';
      storyState.lastCategory = '';
      storyState.activeTurnOffset = 0;
    }
    storyState.currentQuestionIndex = 0;
    storyState.readyToGenerate = this.isFlowComplete(visaType, storyState);
    const story = await this.repository.upsertAnswers(user.id, visaType, storyState);
    return {
      story: this.normalizeStory(story),
      flow: this.buildFlowFromState(visaType, storyState, 0),
      creditCost: await this.getStoryBuilderCreditCost()
    };
  }

  async saveFlowAnswer(user, visaTypeValue, input = {}) {
    this.assertUser(user);
    const visaType = this.validateVisaType(visaTypeValue);
    const questions = this.getQuestions(visaType);
    const questionId = String(input.questionId || '').trim();
    const questionIndex = questions.findIndex((item) => item.id === questionId);
    if (questionIndex === -1) throw this.error(400, 'Valid questionId is required.', 'VALIDATION_ERROR');
    const answer = sanitizeUserInput(input.answer, { maxLength: 2000 });
    if (!answer) throw this.error(400, 'answer is required.', 'VALIDATION_ERROR');
    const existing = await this.repository.findByUserAndVisa(user.id, visaType);
    const storyState = this.normalizeStoryState(existing?.answers);
    const question = questions[questionIndex];
    const now = new Date().toISOString();
    const existingIndex = this.findTurnIndexForQuestion(visaType, storyState.turns, question);
    const turn = {
      id: question.id,
      question: question.question,
      answer,
      category: question.category,
      createdAt: existingIndex >= 0 ? storyState.turns[existingIndex].createdAt : now,
      updatedAt: now
    };
    if (existingIndex >= 0) {
      storyState.turns[existingIndex] = turn;
    } else {
      storyState.turns.push(turn);
    }

    storyState.turns = this.orderTurnsForVisa(visaType, storyState.turns);
    storyState.readyToGenerate = this.isFlowComplete(visaType, storyState);
    storyState.lastAssistantQuestion = '';
    storyState.lastCategory = '';
    const nextIndex = this.resolveNextQuestionIndex(questions, questionIndex, input);
    storyState.currentQuestionIndex = nextIndex;
    const story = await this.repository.upsertAnswers(user.id, visaType, storyState);
    return {
      story: this.normalizeStory(story),
      flow: this.buildFlowFromState(visaType, storyState, nextIndex),
      creditCost: await this.getStoryBuilderCreditCost()
    };
  }

  async reviewFlow(user, visaTypeValue) {
    this.assertUser(user);
    const visaType = this.validateVisaType(visaTypeValue);
    const existing = await this.repository.findByUserAndVisa(user.id, visaType);
    const storyState = this.normalizeStoryState(existing?.answers);
    return {
      story: this.normalizeStory(existing),
      flow: this.buildFlowFromState(visaType, storyState, storyState.currentQuestionIndex || 0),
      creditCost: await this.getStoryBuilderCreditCost()
    };
  }

  async generate(user, visaTypeValue) {
    this.assertUser(user);
    const visaType = this.validateVisaType(visaTypeValue);
    const existing = await this.repository.findByUserAndVisa(user.id, visaType);
    const storyState = this.normalizeStoryState(existing?.answers);
    storyState.readyToGenerate = this.isFlowComplete(visaType, storyState);
    this.requireReadyToGenerate(storyState);

    const operationId = `story_${crypto.randomUUID()}`;
    await this.billing.consumeStoryBuilder(user.id, { operationId });

    try {
      const storyText = await this.aiService.generate({ user, visaType, storyState });
      const story = await this.repository.saveGeneratedStory(user.id, visaType, { answers: storyState, storyText });
      return {
        story: this.normalizeStory(story),
        creditCost: await this.getStoryBuilderCreditCost(),
        operationId
      };
    } catch (error) {
      await this.billing.refundStoryBuilder(user.id, {
        operationId,
        reason: 'story_generation_failed',
        metadata: { visaType, errorCode: error.errorCode || 'STORY_GENERATION_FAILED' }
      }).catch(() => {});
      throw error;
    }
  }

  async updateStoryText(user, visaTypeValue, input = {}) {
    this.assertUser(user);
    const visaType = this.validateVisaType(visaTypeValue);
    const storyText = String(input.storyText || input.story || '').replace(/\s+/g, ' ').trim();
    if (!storyText) throw this.error(400, 'storyText is required.', 'VALIDATION_ERROR');
    if (storyText.length > 2500) throw this.error(400, 'storyText is too long.', 'VALIDATION_ERROR');
    const story = await this.repository.updateStoryText(user.id, visaType, storyText);
    if (!story) throw this.error(404, 'Interview story not found.', 'INTERVIEW_STORY_NOT_FOUND');
    return { story: this.normalizeStory(story), creditCost: await this.getStoryBuilderCreditCost() };
  }

  async getStoryBuilderCreditCost() {
    if (typeof this.billing.getStoryBuilderCreditCost === 'function') {
      return this.billing.getStoryBuilderCreditCost();
    }
    return 10;
  }

  normalizeStory(story) {
    if (!story) return null;
    return {
      ...story,
      answers: this.normalizeStoryState(story.answers)
    };
  }

  normalizeStoryState(value = {}) {
    if (Array.isArray(value?.turns)) {
      return {
        turns: value.turns.map((turn) => ({
          id: String(turn.id || crypto.randomUUID()),
          question: sanitizeUserInput(turn.question, { maxLength: 1200 }),
          answer: sanitizeUserInput(turn.answer, { maxLength: 2000 }),
          category: sanitizeUserInput(turn.category || 'general', { maxLength: 80 }) || 'general',
          createdAt: turn.createdAt || turn.created_at || new Date().toISOString(),
          updatedAt: turn.updatedAt || turn.updated_at || turn.createdAt || turn.created_at || new Date().toISOString()
        })).filter((turn) => turn.question && turn.answer),
        readyToGenerate: Boolean(value.readyToGenerate),
        lastAssistantQuestion: sanitizeUserInput(value.lastAssistantQuestion, { maxLength: 1200 }),
        lastCategory: sanitizeUserInput(value.lastCategory || 'general', { maxLength: 80 }) || 'general',
        activeTurnOffset: this.normalizeTurnOffset(value.activeTurnOffset, value.turns.length),
        currentQuestionIndex: this.normalizeTurnOffset(value.currentQuestionIndex, value.turns.length)
      };
    }
    return {
      turns: this.legacyAnswersToTurns(value),
      readyToGenerate: false,
      lastAssistantQuestion: '',
      lastCategory: 'general',
      activeTurnOffset: 0,
      currentQuestionIndex: 0
    };
  }

  normalizeTurnOffset(value, max) {
    const offset = Number(value);
    if (!Number.isFinite(offset) || offset < 0) return 0;
    return Math.min(Math.floor(offset), Math.max(Number(max) || 0, 0));
  }

  legacyAnswersToTurns(value = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const now = new Date().toISOString();
    return Object.entries(value)
      .filter(([, answer]) => String(answer || '').trim())
      .map(([key, answer]) => ({
        id: crypto.randomUUID(),
        question: this.legacyQuestionLabel(key),
        answer: sanitizeUserInput(answer, { maxLength: 2000 }),
        category: key,
        createdAt: now,
        updatedAt: now
      }));
  }

  legacyQuestionLabel(key) {
    return String(key || 'answer')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (char) => char.toUpperCase()) || 'Story answer';
  }

  requireReadyToGenerate(storyState) {
    if (!storyState.readyToGenerate) {
      throw this.error(409, 'Please answer all Story Builder questions before generating your story.', 'STORY_NOT_READY');
    }
  }

  async buildFlowPayload(userId, visaType, { index = 0 } = {}) {
    const existing = await this.repository.findByUserAndVisa(userId, visaType);
    return this.buildFlowFromState(visaType, this.normalizeStoryState(existing?.answers), index);
  }

  buildFlowFromState(visaType, storyState, index = 0) {
    const questions = this.getQuestions(visaType);
    const boundedIndex = Math.min(Math.max(Number(index) || 0, 0), questions.length - 1);
    const items = questions.map((question, questionIndex) => {
      const turn = this.findTurnForQuestion(visaType, storyState.turns, question);
      return {
        ...question,
        index: questionIndex,
        answer: turn?.answer || this.defaultAnswerForQuestion(storyState, question),
        answered: Boolean(turn?.answer)
      };
    });
    return {
      question: items[boundedIndex] || null,
      questionIndex: boundedIndex,
      totalQuestions: questions.length,
      answers: items,
      answeredCount: items.filter((item) => item.answered).length,
      complete: items.every((item) => item.answered),
      readyToGenerate: Boolean(storyState.readyToGenerate)
    };
  }

  resolveNextQuestionIndex(questions, questionIndex, input = {}) {
    if (input.direction === 'stay') return questionIndex;
    if (input.direction === 'previous') return Math.max(questionIndex - 1, 0);
    if (Number.isFinite(Number(input.nextIndex))) {
      return Math.min(Math.max(Number(input.nextIndex), 0), questions.length - 1);
    }
    return Math.min(questionIndex + 1, questions.length - 1);
  }

  isFlowComplete(visaType, storyState) {
    return this.getQuestions(visaType).every((question) => {
      const turn = this.findTurnForQuestion(visaType, storyState.turns, question);
      return Boolean(turn?.answer);
    });
  }

  defaultAnswerForQuestion(storyState, question) {
    if (!question.defaultFrom) return '';
    const source = (storyState.turns || []).find((turn) => turn?.id === question.defaultFrom);
    return source?.answer || '';
  }

  orderTurnsForVisa(visaType, turns = []) {
    const questions = this.getQuestions(visaType);
    const ordered = [];
    const used = new Set();
    questions.forEach((question) => {
      const index = this.findTurnIndexForQuestion(visaType, turns, question, used);
      if (index >= 0) {
        ordered.push({ ...turns[index], id: question.id, question: question.question, category: question.category });
        used.add(index);
      }
    });
    turns.forEach((turn, index) => {
      if (!used.has(index)) ordered.push(turn);
    });
    return ordered;
  }

  findTurnForQuestion(visaType, turns, question) {
    const index = this.findTurnIndexForQuestion(visaType, turns, question);
    return index >= 0 ? turns[index] : null;
  }

  findTurnIndexForQuestion(visaType, turns = [], question, used = new Set()) {
    const exactId = turns.findIndex((turn, index) => !used.has(index) && turn?.id === question.id);
    if (exactId >= 0) return exactId;
    const exactQuestion = turns.findIndex((turn, index) => !used.has(index) && turn?.question === question.question);
    if (exactQuestion >= 0) return exactQuestion;
    if (this.categoryIsUnique(visaType, question.category)) {
      return turns.findIndex((turn, index) => !used.has(index) && turn?.category === question.category);
    }
    return -1;
  }

  categoryIsUnique(visaType, category) {
    return this.getQuestions(visaType).filter((question) => question.category === category).length === 1;
  }

  getQuestions(visaType) {
    return STORY_BUILDER_QUESTIONS[visaType] || [];
  }

  validateVisaType(value) {
    const visaType = String(value || '').trim().toUpperCase();
    if (!['F1', 'B1_B2'].includes(visaType)) {
      throw this.error(400, 'visaType must be B1_B2 or F1.', 'INVALID_VISA_TYPE');
    }
    return visaType;
  }

  assertUser(user) {
    if (!user?.id) throw this.error(401, 'Authentication is required.', 'AUTH_REQUIRED');
  }

  error(statusCode, publicMessage, errorCode, metadata = {}) {
    return new AppError({
      statusCode,
      publicMessage,
      internalMessage: publicMessage,
      errorCode,
      metadata
    });
  }
}

module.exports = new InterviewStoryService();
module.exports.InterviewStoryService = InterviewStoryService;
