const authService = require('@src/services/AuthService');
const AppErrorModule = require('@src/utils/classes/AppError');
const {
  setAuthCookies,
  clearAuthCookies,
  readRefreshToken
} = require('@src/services/AuthTokenService');

const AppError = AppErrorModule.default || AppErrorModule.AppError;

function publicSession(session) {
  return {
    user: session.user,
    accessToken: session.accessToken,
    accessTokenExpiresAt: session.accessTokenExpiresAt,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt
  };
}

exports.register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body || {});
    res.status(201).json({
      success: true,
      message: 'Verification code sent.',
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyRegistration = async (req, res, next) => {
  try {
    const session = await authService.verifyRegistration(req.body || {});
    setAuthCookies(res, session);
    res.json({
      success: true,
      message: 'Email verified.',
      data: publicSession(session)
    });
  } catch (error) {
    next(error);
  }
};

exports.resendRegistrationCode = async (req, res, next) => {
  try {
    const data = await authService.resendRegistrationCode(req.body || {});
    res.json({
      success: true,
      message: 'Verification code sent.',
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const session = await authService.login(req.body || {});
    setAuthCookies(res, session);
    res.json({
      success: true,
      message: 'Login successful.',
      data: publicSession(session)
    });
  } catch (error) {
    next(error);
  }
};

exports.google = (req, res, next) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`;
    if (!clientId) {
      res.status(501).json({
        success: false,
        message: 'Google OAuth is not configured.',
        errorCode: 'GOOGLE_OAUTH_NOT_CONFIGURED'
      });
      return;
    }

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'select_account');
    res.redirect(url.toString());
  } catch (error) {
    next(error);
  }
};

exports.googleCallback = async (req, res, next) => {
  try {
    const code = req.query.code;
    if (!code) {
      res.status(400).json({ success: false, message: 'Google authorization code is required.', errorCode: 'GOOGLE_CODE_REQUIRED' });
      return;
    }

    const profile = await fetchGoogleProfile(req, code);
    const session = await authService.findOrCreateGoogleUser(profile);
    setAuthCookies(res, session);

    const redirectUrl = process.env.AUTH_SUCCESS_REDIRECT_URL;
    if (redirectUrl) {
      res.redirect(redirectUrl);
      return;
    }

    res.json({
      success: true,
      message: 'Google login successful.',
      data: publicSession(session)
    });
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const session = await authService.refresh(readRefreshToken(req));
    setAuthCookies(res, session);
    res.json({
      success: true,
      message: 'Token refreshed.',
      data: publicSession(session)
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await authService.logout(readRefreshToken(req));
    clearAuthCookies(res);
    res.json({
      success: true,
      message: 'Logout successful.',
      data: { loggedOut: true }
    });
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    const data = await authService.getCurrentUser(req.user.id);
    res.json({
      success: true,
      message: 'Current user loaded.',
      data
    });
  } catch (error) {
    next(error);
  }
};

async function fetchGoogleProfile(req, code) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw oauthError(501, 'Google OAuth is not configured.', 'GOOGLE_OAUTH_NOT_CONFIGURED');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw oauthError(401, tokenPayload.error_description || tokenPayload.error || 'Google token exchange failed.', 'GOOGLE_TOKEN_EXCHANGE_FAILED');
  }

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
  });
  const profile = await profileResponse.json();
  if (!profileResponse.ok) {
    throw oauthError(502, profile.error?.message || 'Google profile request failed.', 'GOOGLE_PROFILE_REQUEST_FAILED');
  }

  return {
    googleId: profile.id,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.picture
  };
}

function oauthError(statusCode, publicMessage, errorCode) {
  return new AppError({ statusCode, publicMessage, internalMessage: publicMessage, errorCode });
}
