const usersService = require('@src/services/UsersService');

exports.getMe = async (req, res, next) => {
  try {
    const data = await usersService.getProfile(req.user.id);
    res.json({ success: true, message: 'User profile loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const data = await usersService.updateProfile(req.user.id, req.body || {});
    res.json({ success: true, message: 'User profile updated.', data });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const data = await usersService.changePassword(req.user.id, req.body || {});
    res.json({ success: true, message: 'Password updated.', data });
  } catch (error) {
    next(error);
  }
};

exports.getUsage = async (req, res, next) => {
  try {
    const data = await usersService.getUsage(req.user.id);
    res.json({ success: true, message: 'User usage loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const data = await usersService.getNotifications(req.user.id);
    res.json({ success: true, message: 'Notifications loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    const data = await usersService.markNotificationRead(req.user.id, req.params.notificationId);
    res.json({ success: true, message: 'Notification marked read.', data });
  } catch (error) {
    next(error);
  }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    const data = await usersService.markAllNotificationsRead(req.user.id);
    res.json({ success: true, message: 'Notifications marked read.', data });
  } catch (error) {
    next(error);
  }
};

exports.getInterviews = async (req, res, next) => {
  try {
    const data = await usersService.getInterviewHistory(req.user.id, req.query || {});
    res.json({ success: true, message: 'User interviews loaded.', data });
  } catch (error) {
    next(error);
  }
};
