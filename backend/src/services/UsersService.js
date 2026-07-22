const bcrypt = require('bcryptjs');
const AppErrorModule = require('@src/utils/classes/AppError');
const { createAuthRepository } = require('@src/services/AuthRepository');
const { createInterviewRepository } = require('@src/services/InterviewRepository');
const { createBillingRepository } = require('@src/services/BillingRepository');
const { createAdminRepository, DEFAULT_SETTINGS } = require('@src/services/AdminRepository');
const { CREDIT_COSTS } = require('@src/config/plans');
const notificationService = require('@src/services/NotificationService');

const AppError = AppErrorModule.default || AppErrorModule.AppError;

class UsersService {
  constructor({
    userRepository = createAuthRepository(),
    interviewRepository = createInterviewRepository(),
    billingRepository = createBillingRepository(),
    adminRepository = createAdminRepository()
  } = {}) {
    this.userRepository = userRepository;
    this.interviewRepository = interviewRepository;
    this.billingRepository = billingRepository;
    this.adminRepository = adminRepository;
  }

  async getProfile(userId) {
    const profile = await this.userRepository.getUserProfile(userId);
    if (!profile) throw this.error(404, 'User profile not found.', 'USER_NOT_FOUND');
    return profile;
  }

  async updateProfile(userId, input = {}) {
    const updates = {};
    if (input.name !== undefined) {
      const name = String(input.name || '').trim();
      if (!name) throw this.error(400, 'Name cannot be empty.', 'VALIDATION_ERROR');
      updates.name = name;
    }
    if (input.country !== undefined) {
      updates.country = String(input.country || '').trim() || null;
    }
    if (input.targetVisa !== undefined) {
      const targetVisa = String(input.targetVisa || '').trim().toUpperCase();
      if (targetVisa && !['F1', 'B1_B2'].includes(targetVisa)) {
        throw this.error(400, 'targetVisa must be F1 or B1_B2.', 'INVALID_VISA_TYPE');
      }
      updates.targetVisa = targetVisa || null;
    }

    const profile = await this.userRepository.updateUserProfile(userId, updates);
    if (!profile) throw this.error(404, 'User profile not found.', 'USER_NOT_FOUND');
    return profile;
  }

  async changePassword(userId, input = {}) {
    const oldPassword = String(input.oldPassword || input.currentPassword || '');
    const newPassword = String(input.newPassword || '');
    if (!oldPassword || !newPassword) {
      throw this.error(400, 'Current password and new password are required.', 'VALIDATION_ERROR');
    }
    if (newPassword.length < 8) {
      throw this.error(400, 'New password must be at least 8 characters.', 'VALIDATION_ERROR');
    }

    const user = await this.userRepository.findUserById(userId);
    if (!user || !user.passwordHash) {
      throw this.error(404, 'Password login is not available for this account.', 'PASSWORD_NOT_AVAILABLE');
    }
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      throw this.error(401, 'Current password is incorrect.', 'INVALID_CURRENT_PASSWORD');
    }

    await this.userRepository.updateUserPasswordHash(userId, await bcrypt.hash(newPassword, 12));
    return { changed: true };
  }

  async getUsage(userId) {
    const usage = await this.userRepository.getUserUsage(userId);
    const startedCounters = await this.billingRepository.getFreeUsageCounters(userId);
    const usedChat = startedCounters.usedChat ?? usage.chatInterviewsUsed ?? usage.chat_interviews_used ?? 0;
    const usedLive = startedCounters.usedLive ?? usage.liveInterviewsUsed ?? usage.live_interviews_used ?? 0;
    const settings = await this.adminRepository.getSettings();
    const limits = buildFreeLimits(settings);
    const creditCosts = buildCreditCosts(settings);
    const freeChatLimit = limits.chatTraining + limits.chatSimulation;
    const freeLiveLimit = limits.liveTraining + limits.liveSimulation;
    const subscription = await this.billingRepository.getLatestSubscription(userId);
    const buckets = buildUsageBuckets(limits, {
      CHAT_TRAINING: startedCounters.chatTraining,
      CHAT_SIMULATION: startedCounters.chatSimulation,
      LIVE_TRAINING: startedCounters.liveTraining,
      LIVE_SIMULATION: startedCounters.liveSimulation
    });

    return {
      freeChatLimit,
      freeLiveLimit,
      usedChat,
      usedLive,
      remainingChat: Math.max(freeChatLimit - usedChat, 0),
      remainingLive: Math.max(freeLiveLimit - usedLive, 0),
      subscription: {
        plan: subscription?.plan?.name || subscription?.planName || subscription?.plan_id || 'Credits',
        chatRemaining: subscription?.chatRemaining ?? subscription?.chat_remaining ?? 0,
        liveRemaining: subscription?.liveRemaining ?? subscription?.live_remaining ?? 0,
        status: subscription?.status || 'none',
        planKey: subscription?.planKey || null,
        currentPeriodStart: subscription?.currentPeriodStart || null,
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
        availableCredits: subscription?.availableCredits ?? 0,
        lifetimePurchasedCredits: subscription?.lifetimePurchasedCredits ?? 0,
        lifetimeUsedCredits: subscription?.lifetimeUsedCredits ?? 0,
        creditCosts
      },
      buckets
    };
  }

  async getInterviewHistory(userId, filters = {}) {
    return this.interviewRepository.listForUser(userId, filters);
  }

  async getNotifications(userId) {
    return { notifications: await notificationService.listForUser(userId) };
  }

  async markNotificationRead(userId, notificationId) {
    return notificationService.markRead(userId, notificationId);
  }

  async markAllNotificationsRead(userId) {
    return notificationService.markAllRead(userId);
  }

  error(statusCode, publicMessage, errorCode) {
    return new AppError({ statusCode, publicMessage, internalMessage: publicMessage, errorCode });
  }
}

function buildFreeLimits(settings = {}) {
  return {
    chatTraining: readLimit(settings.freeChatTrainingLimit, DEFAULT_SETTINGS.freeChatTrainingLimit),
    chatSimulation: readLimit(settings.freeChatSimulationLimit, DEFAULT_SETTINGS.freeChatSimulationLimit),
    liveTraining: readLimit(settings.freeLiveTrainingLimit, DEFAULT_SETTINGS.freeLiveTrainingLimit),
    liveSimulation: readLimit(settings.freeLiveSimulationLimit, DEFAULT_SETTINGS.freeLiveSimulationLimit)
  };
}

function buildUsageBuckets(limits, counts = {}) {
  return {
    chatTraining: buildBucket(limits.chatTraining, counts.CHAT_TRAINING),
    chatSimulation: buildBucket(limits.chatSimulation, counts.CHAT_SIMULATION),
    liveTraining: buildBucket(limits.liveTraining, counts.LIVE_TRAINING),
    liveSimulation: buildBucket(limits.liveSimulation, counts.LIVE_SIMULATION)
  };
}

function buildBucket(limit, used = 0) {
  const normalizedUsed = Number(used || 0);
  return {
    limit,
    used: normalizedUsed,
    remaining: Math.max(limit - normalizedUsed, 0)
  };
}

function readLimit(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.floor(number);
}

function buildCreditCosts(settings = {}) {
  return {
    CHAT_TRAINING: readCreditCost(settings.chatTrainingCreditCost, CREDIT_COSTS.CHAT_TRAINING),
    CHAT_SIMULATION: readCreditCost(settings.chatSimulationCreditCost, CREDIT_COSTS.CHAT_SIMULATION),
    LIVE_TRAINING: readCreditCost(settings.liveTrainingCreditCost, CREDIT_COSTS.LIVE_TRAINING),
    LIVE_SIMULATION: readCreditCost(settings.liveSimulationCreditCost, CREDIT_COSTS.LIVE_SIMULATION),
    STORY_BUILDER: readCreditCost(settings.storyBuilderCreditCost, CREDIT_COSTS.STORY_BUILDER),
    VIDEO_TRAINING: readCreditCost(settings.liveTrainingCreditCost, CREDIT_COSTS.VIDEO_TRAINING),
    VIDEO_SIMULATION: readCreditCost(settings.liveSimulationCreditCost, CREDIT_COSTS.VIDEO_SIMULATION)
  };
}

function readCreditCost(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) return fallback;
  return Math.floor(number);
}

module.exports = new UsersService();
module.exports.UsersService = UsersService;
module.exports.buildFreeLimits = buildFreeLimits;
module.exports.buildCreditCosts = buildCreditCosts;
