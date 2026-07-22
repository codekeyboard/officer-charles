const AppErrorModule = require('@src/utils/classes/AppError');
const { createAdminRepository } = require('@src/services/AdminRepository');
const { createAuthRepository } = require('@src/services/AuthRepository');
const { createInterviewRepository } = require('@src/services/InterviewRepository');
const { createBillingRepository } = require('@src/services/BillingRepository');

const AppError = AppErrorModule.default || AppErrorModule.AppError;

class AdminService {
  constructor({
    adminRepository = createAdminRepository(),
    authRepository = createAuthRepository(),
    interviewRepository = createInterviewRepository(),
    billingRepository = createBillingRepository()
  } = {}) {
    this.adminRepository = adminRepository;
    this.authRepository = authRepository;
    this.interviewRepository = interviewRepository;
    this.billingRepository = billingRepository;
  }

  async audit(data) {
    return this.adminRepository.audit(data);
  }

  async dashboard() {
    const interviewStats = await this.interviewRepository.analytics();
    const revenue = await this.billingRepository.revenueSummary();
    return {
      totalUsers: await this.authRepository.countUsers(),
      activeSubscriptions: (await this.billingRepository.listAllSubscriptions()).filter((item) => item.status === 'active').length,
      totalRevenue: revenue.totalRevenue,
      ...interviewStats,
      aiUsage: await this.interviewRepository.aiUsageSummary()
    };
  }

  async listUsers(query) {
    return this.authRepository.listUsers(query);
  }

  async getUser(userId) {
    const profile = await this.authRepository.getUserProfile(userId);
    if (!profile) throw this.error(404, 'User not found.', 'USER_NOT_FOUND');
    return {
      profile,
      usage: await this.authRepository.getUserUsage(userId),
      interviews: await this.interviewRepository.listForUser(userId, { limit: 50 }),
      subscription: await this.billingRepository.getActiveSubscription(userId),
      payments: await this.billingRepository.listPayments(userId)
    };
  }

  async updateUserStatus(userId, status) {
    const normalized = String(status || '').trim().toLowerCase();
    if (!['active', 'suspended'].includes(normalized)) {
      throw this.error(400, 'status must be active or suspended.', 'VALIDATION_ERROR');
    }
    const user = await this.authRepository.updateUserStatus(userId, normalized);
    if (!user) throw this.error(404, 'User not found.', 'USER_NOT_FOUND');
    return user;
  }

  async listInterviews(query) {
    return this.interviewRepository.listAll(query);
  }

  async getInterview(interviewId) {
    const detail = await this.interviewRepository.getAdminDetail(interviewId);
    if (!detail) throw this.error(404, 'Interview not found.', 'INTERVIEW_NOT_FOUND');
    return detail;
  }

  async listSubscriptions() {
    const [subscriptions, payments] = await Promise.all([
      this.billingRepository.listAllSubscriptions(),
      this.billingRepository.listAllPayments()
    ]);
    return { subscriptions, payments };
  }

  async listPayments(query) {
    return { payments: await this.billingRepository.listAllPayments(query) };
  }

  async revenue() {
    return this.billingRepository.revenueSummary();
  }

  async aiUsage() {
    return this.interviewRepository.aiUsageSummary();
  }

  async getSettings() {
    return this.adminRepository.getSettings();
  }

  async updateSettings(settings = {}) {
    const allowed = [
      'trainingMaxRetries',
      'trainingMaxQuestions',
      'simulationMaxQuestions',
      'enableVoiceLive',
      'freeChatTrainingLimit',
      'freeChatSimulationLimit',
      'freeLiveTrainingLimit',
      'freeLiveSimulationLimit',
      'chatTrainingCreditCost',
      'chatSimulationCreditCost',
      'liveTrainingCreditCost',
      'liveSimulationCreditCost',
      'storyBuilderCreditCost'
    ];
    const updates = {};
    for (const key of allowed) {
      if (settings[key] !== undefined) updates[key] = this.normalizeSettingValue(key, settings[key]);
    }
    return this.adminRepository.updateSettings(updates);
  }

  normalizeSettingValue(key, value) {
    if (key === 'enableVoiceLive') return Boolean(value);
    const number = Number(value);
    const minimum = key.endsWith('CreditCost') ? 1 : 0;
    if (!Number.isFinite(number) || number < minimum) {
      throw this.error(400, `${key} must be a number greater than or equal to ${minimum}.`, 'VALIDATION_ERROR');
    }
    return Math.floor(number);
  }

  async listQuestions(query) {
    return { questions: await this.adminRepository.listQuestions(query) };
  }

  async createQuestion(input = {}) {
    const question = this.validateQuestion(input);
    return this.adminRepository.createQuestion(question);
  }

  async updateQuestion(questionId, input = {}) {
    const updates = {};
    if (input.visaType !== undefined) updates.visaType = this.validateVisaType(input.visaType);
    if (input.questionText !== undefined) {
      if (!String(input.questionText).trim()) throw this.error(400, 'questionText is required.', 'VALIDATION_ERROR');
      updates.questionText = String(input.questionText).trim();
    }
    if (input.category !== undefined) updates.category = String(input.category).trim();
    if (input.difficulty !== undefined) updates.difficulty = String(input.difficulty).trim();
    if (input.isActive !== undefined) updates.isActive = Boolean(input.isActive);
    const question = await this.adminRepository.updateQuestion(questionId, updates);
    if (!question) throw this.error(404, 'Question not found.', 'QUESTION_NOT_FOUND');
    return question;
  }

  async deleteQuestion(questionId) {
    return this.updateQuestion(questionId, { isActive: false });
  }

  validateQuestion(input) {
    const visaType = this.validateVisaType(input.visaType);
    const questionText = String(input.questionText || '').trim();
    const category = String(input.category || '').trim();
    const difficulty = String(input.difficulty || 'medium').trim();
    if (!questionText) throw this.error(400, 'questionText is required.', 'VALIDATION_ERROR');
    if (!category) throw this.error(400, 'category is required.', 'VALIDATION_ERROR');
    return { visaType, questionText, category, difficulty, isActive: true };
  }

  validateVisaType(value) {
    const visaType = String(value || '').trim().toUpperCase();
    if (!['F1', 'B1_B2'].includes(visaType)) throw this.error(400, 'visaType must be F1 or B1_B2.', 'INVALID_VISA_TYPE');
    return visaType;
  }

  error(statusCode, publicMessage, errorCode) {
    return new AppError({ statusCode, publicMessage, internalMessage: publicMessage, errorCode });
  }
}

module.exports = new AdminService();
module.exports.AdminService = AdminService;
