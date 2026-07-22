const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AppErrorModule = require('@src/utils/classes/AppError');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  getAccessExpiry,
  getRefreshExpiry
} = require('@src/services/AuthTokenService');
const { createAuthRepository } = require('@src/services/AuthRepository');
const notificationService = require('@src/services/NotificationService');
const mailService = require('@src/services/MailService');

const AppError = AppErrorModule.default || AppErrorModule.AppError;

class AuthService {
  constructor({ repository = createAuthRepository() } = {}) {
    this.repository = repository;
  }

  async register({ name, email, password }) {
    this.validateRegistration({ name, email, password });
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await this.repository.findUserByEmail(normalizedEmail);
    if (existing && existing.status !== 'pending_verification') {
      throw this.error(409, 'Email is already registered.', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = existing
      ? await this.repository.updateUserForRegistration(existing, { name: String(name).trim(), passwordHash })
      : await this.repository.createUser({
          name: String(name).trim(),
          email: normalizedEmail,
          passwordHash,
          status: 'pending_verification'
        });

    const code = await this.createAndSendVerificationCode(user);
    return {
      verificationRequired: true,
      email: normalizedEmail,
      expiresInMinutes: this.verificationExpiryMinutes(),
      ...(process.env.NODE_ENV === 'test' || process.env.EMAIL_VERIFICATION_EXPOSE_CODE === 'true' ? { devCode: code } : {})
    };
  }

  async verifyRegistration({ email, code }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedCode = String(code || '').replace(/\D/g, '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !/^\d{6}$/.test(normalizedCode)) {
      throw this.error(400, 'A valid email and 6-digit code are required.', 'VALIDATION_ERROR');
    }

    const user = await this.repository.findUserByEmail(normalizedEmail);
    if (!user) throw this.error(404, 'Verification request not found.', 'VERIFICATION_NOT_FOUND');
    if (user.status === 'active' && user.emailVerifiedAt) return this.issueSession(user);

    const verification = await this.repository.findLatestEmailVerificationCode({ userId: user.id, purpose: 'registration' });
    if (!verification) throw this.error(404, 'Verification code not found. Please request a new code.', 'VERIFICATION_NOT_FOUND');
    if (Number(verification.attempts || 0) >= 5) {
      throw this.error(429, 'Too many incorrect attempts. Please request a new code.', 'VERIFICATION_TOO_MANY_ATTEMPTS');
    }
    if (new Date(verification.expiresAt).getTime() < Date.now()) {
      throw this.error(410, 'Verification code expired. Please request a new code.', 'VERIFICATION_EXPIRED');
    }

    const matches = await bcrypt.compare(normalizedCode, verification.codeHash);
    if (!matches) {
      await this.repository.incrementEmailVerificationAttempts(verification.id);
      throw this.error(400, 'Verification code is incorrect.', 'VERIFICATION_CODE_INVALID');
    }

    await this.repository.consumeEmailVerificationCode(verification.id);
    const verifiedUser = await this.repository.markEmailVerified(user.id);

    await notificationService.createForUser(user.id, {
      title: 'Welcome to Officer Charles',
      body: 'Your account is ready. Start a chat or live interview when you are ready.',
      type: 'system'
    });

    return this.issueSession(verifiedUser || user);
  }

  async resendRegistrationCode({ email }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw this.error(400, 'Valid email is required.', 'VALIDATION_ERROR');
    }
    const user = await this.repository.findUserByEmail(normalizedEmail);
    if (!user) throw this.error(404, 'Verification request not found.', 'VERIFICATION_NOT_FOUND');
    if (user.status === 'active' && user.emailVerifiedAt) {
      throw this.error(409, 'Email is already verified.', 'EMAIL_ALREADY_VERIFIED');
    }
    const code = await this.createAndSendVerificationCode(user);
    return {
      verificationRequired: true,
      email: normalizedEmail,
      expiresInMinutes: this.verificationExpiryMinutes(),
      ...(process.env.NODE_ENV === 'test' || process.env.EMAIL_VERIFICATION_EXPOSE_CODE === 'true' ? { devCode: code } : {})
    };
  }

  async login({ email, password }) {
    if (!email || !password) {
      throw this.error(400, 'Email and password are required.', 'INVALID_CREDENTIALS');
    }

    const user = await this.repository.findUserByEmail(String(email).trim().toLowerCase());
    if (!user || !user.passwordHash) {
      throw this.error(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw this.error(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'active') {
      if (user.status === 'pending_verification') {
        throw this.error(403, 'Please verify your email before signing in.', 'EMAIL_VERIFICATION_REQUIRED');
      }
      throw this.error(403, 'User account is not active.', 'USER_INACTIVE');
    }

    return this.issueSession(user);
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw this.error(401, 'Refresh token is required.', 'REFRESH_TOKEN_REQUIRED');
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw this.error(401, 'Refresh token is invalid.', 'INVALID_REFRESH_TOKEN');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.repository.findRefreshToken(tokenHash);
    if (!stored || stored.revokedAt || new Date(stored.expiresAt).getTime() < Date.now()) {
      throw this.error(401, 'Refresh token is invalid or expired.', 'INVALID_REFRESH_TOKEN');
    }

    const user = await this.repository.findUserById(payload.sub);
    if (!user || user.status !== 'active') {
      throw this.error(401, 'User session is no longer valid.', 'INVALID_REFRESH_TOKEN');
    }

    await this.repository.revokeRefreshToken(tokenHash);
    return this.issueSession(user);
  }

  async logout(refreshToken) {
    if (refreshToken) {
      await this.repository.revokeRefreshToken(hashToken(refreshToken));
    }
    return { loggedOut: true };
  }

  async getCurrentUser(userId) {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw this.error(404, 'User not found.', 'USER_NOT_FOUND');
    }
    return { user: this.repository.toPublicUser(user) };
  }

  async findOrCreateGoogleUser(profile) {
    if (!profile?.email || !profile?.googleId) {
      throw this.error(400, 'Google profile is missing required fields.', 'GOOGLE_PROFILE_INVALID');
    }

    let user = await this.repository.findUserByGoogleId(profile.googleId);
    if (!user) {
      user = await this.repository.findUserByEmail(profile.email);
      if (user && !user.googleId) {
        user = await this.repository.updateGoogleId(user, profile.googleId);
      }
    }

    if (!user) {
      user = await this.repository.createUser({
        name: profile.name || profile.email.split('@')[0],
        email: profile.email,
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl || null,
        emailVerifiedAt: new Date()
      });
      await notificationService.createForUser(user.id, {
        title: 'Welcome to Officer Charles',
        body: 'Your Google account is connected and your dashboard is ready.',
        type: 'system'
      });
    }

    return this.issueSession(user);
  }

  async issueSession(user) {
    const publicUser = this.repository.toPublicUser(user);
    const accessToken = signAccessToken(publicUser);
    const refreshToken = signRefreshToken(publicUser);
    const accessTokenExpiresAt = getAccessExpiry();
    const refreshTokenExpiresAt = getRefreshExpiry();
    await this.repository.saveRefreshToken({
      userId: publicUser.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt
    });

    return {
      user: publicUser,
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString()
    };
  }

  validateRegistration({ name, email, password }) {
    if (!String(name || '').trim()) {
      throw this.error(400, 'Name is required.', 'VALIDATION_ERROR');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) {
      throw this.error(400, 'Valid email is required.', 'VALIDATION_ERROR');
    }
    if (!password || String(password).length < 8) {
      throw this.error(400, 'Password must be at least 8 characters.', 'VALIDATION_ERROR');
    }
  }

  async createAndSendVerificationCode(user) {
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 12);
    const expiresAt = new Date(Date.now() + this.verificationExpiryMinutes() * 60 * 1000);
    await this.repository.createEmailVerificationCode({
      userId: user.id,
      codeHash,
      expiresAt,
      purpose: 'registration'
    });
    await mailService.sendVerificationCode({
      to: user.email,
      name: user.name,
      code
    });
    return code;
  }

  verificationExpiryMinutes() {
    const value = Number(process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES || 10);
    return Number.isFinite(value) && value > 0 ? value : 10;
  }

  error(statusCode, publicMessage, errorCode) {
    return new AppError({
      statusCode,
      publicMessage,
      internalMessage: publicMessage,
      errorCode
    });
  }
}

module.exports = new AuthService();
module.exports.AuthService = AuthService;
