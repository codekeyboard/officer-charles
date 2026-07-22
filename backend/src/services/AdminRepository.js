const crypto = require('crypto');
const db = require('@src/models');

function plain(row) {
  return typeof row?.get === 'function' ? row.get({ plain: true }) : row;
}

const DEFAULT_SETTINGS = {
  trainingMaxRetries: 3,
  trainingMaxQuestions: 8,
  simulationMaxQuestions: 10,
  enableVoiceLive: false,
  freeChatTrainingLimit: 3,
  freeChatSimulationLimit: 1,
  freeLiveTrainingLimit: 1,
  freeLiveSimulationLimit: 1,
  chatTrainingCreditCost: 5,
  chatSimulationCreditCost: 10,
  liveTrainingCreditCost: 15,
  liveSimulationCreditCost: 25,
  storyBuilderCreditCost: 10
};

class SequelizeAdminRepository {
  async audit(data) {
    return plain(await db.AdminAuditLog.create(data));
  }

  async getSettings() {
    const rows = await db.AppSetting.findAll();
    if (rows.length === 0) return { ...DEFAULT_SETTINGS };
    return rows.reduce((acc, row) => {
      const item = plain(row);
      acc[item.key] = item.value;
      return acc;
    }, { ...DEFAULT_SETTINGS });
  }

  async updateSettings(settings) {
    await Promise.all(Object.entries(settings).map(([key, value]) =>
      db.AppSetting.upsert({ key, value })
    ));
    return this.getSettings();
  }

  async listQuestions(filters = {}) {
    const where = {};
    if (filters.visaType) where.visaType = String(filters.visaType).toUpperCase();
    if (filters.category) where.category = filters.category;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.includeInactive !== 'true') where.isActive = true;
    const rows = await db.InterviewQuestion.findAll({ where, order: [['createdAt', 'DESC']] });
    return rows.map(plain);
  }

  async createQuestion(data) {
    return plain(await db.InterviewQuestion.create(data));
  }

  async updateQuestion(id, updates) {
    const question = await db.InterviewQuestion.findByPk(id);
    if (!question) return null;
    await question.update(updates);
    return plain(question);
  }
}

class MemoryAdminRepository {
  constructor() {
    this.auditLogs = [];
    this.settings = { ...DEFAULT_SETTINGS };
    this.questions = new Map();
  }

  async audit(data) {
    const log = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() };
    this.auditLogs.push(log);
    return log;
  }

  async getSettings() {
    return { ...this.settings };
  }

  async updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    return this.getSettings();
  }

  async listQuestions(filters = {}) {
    let questions = [...this.questions.values()];
    if (filters.visaType) questions = questions.filter((item) => item.visaType === String(filters.visaType).toUpperCase());
    if (filters.category) questions = questions.filter((item) => item.category === filters.category);
    if (filters.difficulty) questions = questions.filter((item) => item.difficulty === filters.difficulty);
    if (filters.includeInactive !== 'true') questions = questions.filter((item) => item.isActive !== false);
    return questions;
  }

  async createQuestion(data) {
    const question = {
      id: crypto.randomUUID(),
      isActive: true,
      createdAt: new Date().toISOString(),
      ...data
    };
    this.questions.set(question.id, question);
    return question;
  }

  async updateQuestion(id, updates) {
    const question = this.questions.get(id);
    if (!question) return null;
    const updated = { ...question, ...updates };
    this.questions.set(id, updated);
    return updated;
  }
}

let repositorySingleton = null;

function createAdminRepository() {
  if (repositorySingleton) return repositorySingleton;
  repositorySingleton = process.env.AUTH_STORAGE === 'memory' || process.env.NODE_ENV === 'test'
    ? new MemoryAdminRepository()
    : new SequelizeAdminRepository();
  return repositorySingleton;
}

module.exports = {
  DEFAULT_SETTINGS,
  SequelizeAdminRepository,
  MemoryAdminRepository,
  createAdminRepository
};
