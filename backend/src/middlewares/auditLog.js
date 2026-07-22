const adminService = require('@src/services/AdminService');

function auditLog(action) {
  return (req, res, next) => {
    res.once('finish', () => {
      adminService.audit({
        adminUserId: req.user?.id || null,
        action,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        metadata: {
          params: req.params,
          query: req.query
        }
      }).catch(() => {});
    });
    next();
  };
}

module.exports = auditLog;
module.exports.auditLog = auditLog;
