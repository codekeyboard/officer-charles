const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('@src/models');
const { Op } = require('sequelize');
const { FREE_SIGNUP_CREDITS } = require('@src/config/plans');

function publicUser(user) {
  if (!user) return null;
  const plain = typeof user.get === 'function' ? user.get({ plain: true }) : user;
  return {
    id: plain.id,
    name: plain.name,
    email: plain.email,
    role: plain.role,
    status: plain.status,
    googleId: plain.googleId || plain.google_id || null,
    stripeCustomerId: plain.stripeCustomerId || plain.stripe_customer_id || null,
    emailVerifiedAt: plain.emailVerifiedAt || plain.email_verified_at || null
  };
}

function publicProfile(user, profile = null) {
  const plainUser = typeof user?.get === 'function' ? user.get({ plain: true }) : user;
  const plainProfile = typeof profile?.get === 'function' ? profile.get({ plain: true }) : profile;
  return {
    id: plainUser.id,
    name: plainUser.name,
    email: plainUser.email,
    role: plainUser.role,
    status: plainUser.status,
    country: plainProfile?.country || null,
    targetVisa: plainProfile?.targetVisa || plainProfile?.target_visa || null
  };
}

class SequelizeAuthRepository {
  async findUserByEmail(email) {
    return db.User.findOne({ where: { email: String(email).toLowerCase() } });
  }

  async findUserById(id) {
    return db.User.findByPk(id);
  }

  async findUserByGoogleId(googleId) {
    return db.User.findOne({ where: { googleId } });
  }

  async findUserByStripeCustomerId(stripeCustomerId) {
    return db.User.findOne({ where: { stripeCustomerId } });
  }

  async createUser({ name, email, passwordHash = null, googleId = null, avatarUrl = null, status = 'active', emailVerifiedAt = null }) {
    return db.sequelize.transaction(async (transaction) => {
      const user = await db.User.create({
        name,
        email: String(email).toLowerCase(),
        passwordHash,
        googleId,
        role: 'user',
        status,
        emailVerifiedAt
      }, { transaction });

      await db.UserProfile.create({
        userId: user.id,
        displayName: name,
        avatarUrl,
        country: null,
        targetVisa: null
      }, { transaction });

      await db.UserUsage.create({
        userId: user.id
      }, { transaction });

      if (db.UserCreditBalance) {
        await db.UserCreditBalance.create({
          userId: user.id,
          availableCredits: FREE_SIGNUP_CREDITS,
          lifetimeGrantedCredits: FREE_SIGNUP_CREDITS
        }, { transaction });
      }

      return user;
    });
  }

  async updateGoogleId(user, googleId) {
    await user.update({ googleId });
    return user;
  }

  async updateStripeCustomerId(userId, stripeCustomerId) {
    const user = await db.User.findByPk(userId);
    if (!user) return null;
    await user.update({ stripeCustomerId });
    return user;
  }

  async updateUserForRegistration(user, { name, passwordHash }) {
    await user.update({
      name,
      passwordHash,
      status: 'pending_verification',
      emailVerifiedAt: null
    });
    const profile = await db.UserProfile.findOne({ where: { userId: user.id } });
    if (profile) await profile.update({ displayName: name });
    return user;
  }

  async markEmailVerified(userId) {
    const user = await db.User.findByPk(userId);
    if (!user) return null;
    await user.update({ status: 'active', emailVerifiedAt: new Date() });
    return user;
  }

  async createEmailVerificationCode({ userId, codeHash, expiresAt, purpose = 'registration' }) {
    await db.EmailVerificationCode.update(
      { consumedAt: new Date() },
      { where: { userId, purpose, consumedAt: null } }
    );
    return db.EmailVerificationCode.create({
      userId,
      codeHash,
      purpose,
      expiresAt,
      lastSentAt: new Date()
    });
  }

  async findLatestEmailVerificationCode({ userId, purpose = 'registration' }) {
    return db.EmailVerificationCode.findOne({
      where: { userId, purpose, consumedAt: null },
      order: [['createdAt', 'DESC']]
    });
  }

  async incrementEmailVerificationAttempts(codeId) {
    const row = await db.EmailVerificationCode.findByPk(codeId);
    if (!row) return null;
    await row.increment('attempts');
    await row.reload();
    return row;
  }

  async consumeEmailVerificationCode(codeId) {
    const row = await db.EmailVerificationCode.findByPk(codeId);
    if (!row) return null;
    await row.update({ consumedAt: new Date() });
    return row;
  }

  async saveRefreshToken({ userId, tokenHash, expiresAt }) {
    return db.RefreshToken.create({ userId, tokenHash, expiresAt });
  }

  async findRefreshToken(tokenHash) {
    return db.RefreshToken.findOne({ where: { tokenHash } });
  }

  async revokeRefreshToken(tokenHash) {
    await db.RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash, revokedAt: null } });
  }

  async getUserProfile(userId) {
    const user = await db.User.findByPk(userId, {
      include: [
        { model: db.UserProfile, as: 'profile' },
        { model: db.UserUsage, as: 'usage' }
      ]
    });
    if (!user) return null;
    return publicProfile(user, user.profile);
  }

  async updateUserProfile(userId, updates) {
    return db.sequelize.transaction(async (transaction) => {
      const user = await db.User.findByPk(userId, { transaction });
      if (!user) return null;

      if (updates.name !== undefined) {
        await user.update({ name: updates.name }, { transaction });
      }

      let profile = await db.UserProfile.findOne({ where: { userId }, transaction });
      if (!profile) {
        profile = await db.UserProfile.create({ userId, displayName: user.name }, { transaction });
      }

      const profileUpdates = {};
      if (updates.name !== undefined) profileUpdates.displayName = updates.name;
      if (updates.country !== undefined) profileUpdates.country = updates.country;
      if (updates.targetVisa !== undefined) profileUpdates.targetVisa = updates.targetVisa;
      if (Object.keys(profileUpdates).length > 0) {
        await profile.update(profileUpdates, { transaction });
      }

      return publicProfile(user, profile);
    });
  }

  async getUserUsage(userId) {
    let usage = await db.UserUsage.findOne({ where: { userId } });
    if (!usage) {
      usage = await db.UserUsage.create({ userId });
    }
    return typeof usage.get === 'function' ? usage.get({ plain: true }) : usage;
  }

  async listUsers({ page = 1, limit = 20, search, status } = {}) {
    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    const offset = (Math.max(Number(page), 1) - 1) * Math.min(Math.max(Number(limit), 1), 100);
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const result = await db.User.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        { model: db.UserProfile, as: 'profile' },
        { model: db.UserUsage, as: 'usage' }
      ]
    });
    return {
      page: Math.max(Number(page), 1),
      limit: safeLimit,
      total: result.count,
      items: result.rows.map((user) => publicProfile(user, user.profile))
    };
  }

  async updateUserStatus(userId, status) {
    const user = await db.User.findByPk(userId);
    if (!user) return null;
    await user.update({ status });
    return publicUser(user);
  }

  async updateUserPasswordHash(userId, passwordHash) {
    const user = await db.User.findByPk(userId);
    if (!user) return null;
    await user.update({ passwordHash });
    return publicUser(user);
  }

  async countUsers() {
    return db.User.count();
  }

  toPublicUser(user) {
    return publicUser(user);
  }
}

class MemoryAuthRepository {
  constructor() {
    this.users = new Map();
    this.profiles = new Map();
    this.usage = new Map();
    this.refreshTokens = new Map();
    this.emailVerificationCodes = new Map();
    this.seedAdminFromEnv();
  }

  seedAdminFromEnv() {
    const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = String(process.env.ADMIN_PASSWORD || '');
    const name = String(process.env.ADMIN_NAME || 'Officer Charles Admin').trim();
    if (!email || !password) return;

    const user = {
      id: 'dev-admin',
      name,
      email,
      passwordHash: bcrypt.hashSync(password, 12),
      googleId: null,
      stripeCustomerId: null,
      role: 'admin',
      status: 'active'
    };
    this.users.set(user.id, user);
    this.profiles.set(user.id, {
      userId: user.id,
      displayName: name,
      avatarUrl: null,
      country: null,
      targetVisa: null
    });
    this.usage.set(user.id, {
      userId: user.id,
      chatInterviewsUsed: 0,
      liveInterviewsUsed: 0
    });
  }

  async findUserByEmail(email) {
    const normalized = String(email).toLowerCase();
    return [...this.users.values()].find((user) => user.email === normalized) || null;
  }

  async findUserById(id) {
    return this.users.get(id) || null;
  }

  async findUserByGoogleId(googleId) {
    return [...this.users.values()].find((user) => user.googleId === googleId) || null;
  }

  async findUserByStripeCustomerId(stripeCustomerId) {
    return [...this.users.values()].find((user) => user.stripeCustomerId === stripeCustomerId) || null;
  }

  async createUser({ name, email, passwordHash = null, googleId = null, status = 'active', emailVerifiedAt = null }) {
    const user = {
      id: crypto.randomUUID(),
      name,
      email: String(email).toLowerCase(),
      passwordHash,
      googleId,
      stripeCustomerId: null,
      role: 'user',
      status,
      emailVerifiedAt
    };
    this.users.set(user.id, user);
    this.profiles.set(user.id, {
      userId: user.id,
      displayName: name,
      avatarUrl: null,
      country: null,
      targetVisa: null
    });
    this.usage.set(user.id, {
      userId: user.id,
      chatInterviewsUsed: 0,
      liveInterviewsUsed: 0
    });
    return user;
  }

  async updateUserForRegistration(user, { name, passwordHash }) {
    user.name = name;
    user.passwordHash = passwordHash;
    user.status = 'pending_verification';
    user.emailVerifiedAt = null;
    this.users.set(user.id, user);
    const profile = this.profiles.get(user.id);
    if (profile) {
      profile.displayName = name;
      this.profiles.set(user.id, profile);
    }
    return user;
  }

  async markEmailVerified(userId) {
    const user = this.users.get(userId);
    if (!user) return null;
    user.status = 'active';
    user.emailVerifiedAt = new Date().toISOString();
    this.users.set(userId, user);
    return user;
  }

  async createEmailVerificationCode({ userId, codeHash, expiresAt, purpose = 'registration' }) {
    for (const row of this.emailVerificationCodes?.values?.() || []) {
      if (row.userId === userId && row.purpose === purpose && !row.consumedAt) row.consumedAt = new Date().toISOString();
    }
    if (!this.emailVerificationCodes) this.emailVerificationCodes = new Map();
    const row = {
      id: crypto.randomUUID(),
      userId,
      codeHash,
      purpose,
      attempts: 0,
      expiresAt,
      consumedAt: null,
      lastSentAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    this.emailVerificationCodes.set(row.id, row);
    return row;
  }

  async findLatestEmailVerificationCode({ userId, purpose = 'registration' }) {
    const rows = [...(this.emailVerificationCodes?.values?.() || [])]
      .filter((row) => row.userId === userId && row.purpose === purpose && !row.consumedAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return rows[0] || null;
  }

  async incrementEmailVerificationAttempts(codeId) {
    const row = this.emailVerificationCodes?.get(codeId);
    if (!row) return null;
    row.attempts += 1;
    this.emailVerificationCodes.set(codeId, row);
    return row;
  }

  async consumeEmailVerificationCode(codeId) {
    const row = this.emailVerificationCodes?.get(codeId);
    if (!row) return null;
    row.consumedAt = new Date().toISOString();
    this.emailVerificationCodes.set(codeId, row);
    return row;
  }

  async updateGoogleId(user, googleId) {
    user.googleId = googleId;
    this.users.set(user.id, user);
    return user;
  }

  async updateStripeCustomerId(userId, stripeCustomerId) {
    const user = this.users.get(userId);
    if (!user) return null;
    user.stripeCustomerId = stripeCustomerId;
    this.users.set(userId, user);
    return user;
  }

  async saveRefreshToken({ userId, tokenHash, expiresAt }) {
    const token = {
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      revokedAt: null
    };
    this.refreshTokens.set(tokenHash, token);
    return token;
  }

  async findRefreshToken(tokenHash) {
    return this.refreshTokens.get(tokenHash) || null;
  }

  async revokeRefreshToken(tokenHash) {
    const token = this.refreshTokens.get(tokenHash);
    if (token) token.revokedAt = new Date();
  }

  async getUserProfile(userId) {
    const user = await this.findUserById(userId);
    if (!user) return null;
    return publicProfile(user, this.profiles.get(userId));
  }

  async updateUserProfile(userId, updates) {
    const user = await this.findUserById(userId);
    if (!user) return null;
    if (updates.name !== undefined) user.name = updates.name;
    const profile = this.profiles.get(userId) || { userId };
    if (updates.name !== undefined) profile.displayName = updates.name;
    if (updates.country !== undefined) profile.country = updates.country;
    if (updates.targetVisa !== undefined) profile.targetVisa = updates.targetVisa;
    this.users.set(userId, user);
    this.profiles.set(userId, profile);
    return publicProfile(user, profile);
  }

  async getUserUsage(userId) {
    if (!this.usage.has(userId)) {
      this.usage.set(userId, {
        userId,
        chatInterviewsUsed: 0,
        liveInterviewsUsed: 0
      });
    }
    return this.usage.get(userId);
  }

  async listUsers({ page = 1, limit = 20, search, status } = {}) {
    let items = [...this.users.values()];
    if (status) items = items.filter((user) => user.status === status);
    if (search) {
      const needle = String(search).toLowerCase();
      items = items.filter((user) => user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle));
    }
    const safePage = Math.max(Number(page), 1);
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const start = (safePage - 1) * safeLimit;
    return {
      page: safePage,
      limit: safeLimit,
      total: items.length,
      items: items.slice(start, start + safeLimit).map((user) => publicProfile(user, this.profiles.get(user.id)))
    };
  }

  async updateUserStatus(userId, status) {
    const user = this.users.get(userId);
    if (!user) return null;
    user.status = status;
    this.users.set(userId, user);
    return publicUser(user);
  }

  async updateUserPasswordHash(userId, passwordHash) {
    const user = this.users.get(userId);
    if (!user) return null;
    user.passwordHash = passwordHash;
    this.users.set(userId, user);
    return publicUser(user);
  }

  async countUsers() {
    return this.users.size;
  }

  toPublicUser(user) {
    return publicUser(user);
  }
}

let repositorySingleton = null;

function createAuthRepository() {
  if (repositorySingleton) return repositorySingleton;
  if (process.env.AUTH_STORAGE === 'memory' || process.env.NODE_ENV === 'test') {
    repositorySingleton = new MemoryAuthRepository();
    return repositorySingleton;
  }
  repositorySingleton = new SequelizeAuthRepository();
  return repositorySingleton;
}

module.exports = {
  SequelizeAuthRepository,
  MemoryAuthRepository,
  createAuthRepository,
  publicUser,
  publicProfile
};
