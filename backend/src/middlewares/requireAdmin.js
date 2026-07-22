const AppErrorModule = require('@src/utils/classes/AppError');
const AppError = AppErrorModule.default || AppErrorModule.AppError;

function requireAdmin(req, _res, next) {
  if (['admin', 'development'].includes(req.user?.role)) {
    next();
    return;
  }

  next(new AppError({
    statusCode: 403,
    publicMessage: 'Admin access is required.',
    internalMessage: 'Request was made without admin role.',
    errorCode: 'ADMIN_REQUIRED'
  }));
}

module.exports = requireAdmin;
module.exports.requireAdmin = requireAdmin;
