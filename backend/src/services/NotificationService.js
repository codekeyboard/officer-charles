const crypto = require('crypto');
const db = require('@src/models');
const AppErrorModule = require('@src/utils/classes/AppError');

const AppError = AppErrorModule.default || AppErrorModule.AppError;

function plain(row) {
  return typeof row?.get === 'function' ? row.get({ plain: true }) : row;
}

class SequelizeNotificationRepository {
  async createForUser(userId, data = {}) {
    const row = await db.Notification.create({
      userId,
      title: data.title,
      body: data.body || null,
      type: data.type || 'system'
    });
    return plain(row);
  }

  async listForUser(userId) {
    const rows = await db.Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    return rows.map(plain);
  }

  async markRead(userId, notificationId) {
    const notification = await db.Notification.findOne({ where: { id: notificationId, userId } });
    if (!notification) return null;
    await notification.update({ readAt: new Date() });
    return plain(notification);
  }

  async markAllRead(userId) {
    const [updatedCount] = await db.Notification.update(
      { readAt: new Date() },
      { where: { userId, readAt: null } }
    );
    return { updatedCount };
  }
}

class MemoryNotificationRepository {
  constructor() {
    this.notifications = new Map();
  }

  seedWelcome(userId) {
    if (this.notifications.has(userId)) return;
    this.notifications.set(userId, [{
      id: crypto.randomUUID(),
      userId,
      title: 'Welcome to Officer Charles',
      body: 'Your interview dashboard is ready.',
      type: 'system',
      readAt: null,
      createdAt: new Date().toISOString()
    }]);
  }

  async listForUser(userId) {
    this.seedWelcome(userId);
    return this.notifications.get(userId) || [];
  }

  async createForUser(userId, data = {}) {
    const notification = {
      id: crypto.randomUUID(),
      userId,
      title: data.title,
      body: data.body || null,
      type: data.type || 'system',
      readAt: null,
      createdAt: new Date().toISOString()
    };
    const list = this.notifications.get(userId) || [];
    list.unshift(notification);
    this.notifications.set(userId, list);
    return notification;
  }

  async markRead(userId, notificationId) {
    this.seedWelcome(userId);
    const list = this.notifications.get(userId) || [];
    const item = list.find((notification) => notification.id === notificationId);
    if (!item) return null;
    item.readAt = new Date().toISOString();
    return item;
  }

  async markAllRead(userId) {
    this.seedWelcome(userId);
    const now = new Date().toISOString();
    const list = this.notifications.get(userId) || [];
    let updatedCount = 0;
    for (const item of list) {
      if (!item.readAt) {
        item.readAt = now;
        updatedCount += 1;
      }
    }
    return { updatedCount };
  }
}

class NotificationService {
  constructor({
    repository = process.env.AUTH_STORAGE === 'memory' || process.env.NODE_ENV === 'test'
      ? new MemoryNotificationRepository()
      : new SequelizeNotificationRepository()
  } = {}) {
    this.repository = repository;
  }

  async listForUser(userId) {
    return this.repository.listForUser(userId);
  }

  async createForUser(userId, data = {}) {
    const title = String(data.title || '').trim();
    if (!userId || !title) return null;
    return this.repository.createForUser(userId, { ...data, title });
  }

  async markRead(userId, notificationId) {
    const notification = await this.repository.markRead(userId, notificationId);
    if (!notification) {
      throw new AppError({
        statusCode: 404,
        publicMessage: 'Notification not found.',
        internalMessage: 'Notification not found for user.',
        errorCode: 'NOTIFICATION_NOT_FOUND'
      });
    }
    return notification;
  }

  async markAllRead(userId) {
    return this.repository.markAllRead(userId);
  }
}

module.exports = new NotificationService();
module.exports.NotificationService = NotificationService;
module.exports.MemoryNotificationRepository = MemoryNotificationRepository;
module.exports.SequelizeNotificationRepository = SequelizeNotificationRepository;
