const crypto = require('crypto');
const db = require('@src/models');

function plain(row) {
  return typeof row?.get === 'function' ? row.get({ plain: true }) : row;
}

function normalizeInterview(row) {
  const item = plain(row);
  if (!item) return null;
  return {
    id: item.id,
    userId: item.userId || item.user_id,
    interviewType: item.interviewType || item.interview_type,
    visaType: item.visaType || item.visa_type,
    mode: item.mode,
    status: item.status,
    currentQuestion: item.currentQuestion || item.current_question || null,
    finalScore: item.finalScore ?? item.final_score ?? null,
    finalFeedback: item.finalFeedback || item.final_feedback || null,
    strengths: item.strengths || [],
    weaknesses: item.weaknesses || [],
    recommendations: item.recommendations || [],
    finalEvaluation: item.finalEvaluation || item.final_evaluation || null,
    startedAt: item.startedAt || item.started_at || item.createdAt || item.created_at,
    endedAt: item.endedAt || item.ended_at || null,
    createdAt: item.createdAt || item.created_at || null
  };
}

function normalizeMessage(row) {
  const item = plain(row);
  if (!item) return null;
  return {
    id: item.id,
    interviewId: item.interviewId || item.interview_id,
    userId: item.userId || item.user_id,
    role: item.role,
    content: item.content,
    question: item.question || null,
    score: item.score ?? null,
    feedback: item.feedback || null,
    metadata: item.metadata || null,
    createdAt: item.createdAt || item.created_at
  };
}

class SequelizeInterviewRepository {
  async createInterview(data) {
    const interview = await db.Interview.create({
      id: data.id,
      userId: data.userId,
      interviewType: data.interviewType,
      visaType: data.visaType,
      mode: data.mode,
      status: data.status || 'ACTIVE',
      currentQuestion: data.currentQuestion || null,
      startedAt: data.startedAt || new Date()
    });
    return normalizeInterview(interview);
  }

  async findById(id) {
    return normalizeInterview(await db.Interview.findByPk(id));
  }

  async updateInterview(id, updates) {
    const interview = await db.Interview.findByPk(id);
    if (!interview) return null;
    await interview.update(updates);
    return normalizeInterview(interview);
  }

  async saveMessage(data) {
    const message = await db.InterviewMessage.create({
      interviewId: data.interviewId,
      userId: data.userId,
      role: data.role,
      content: data.content,
      question: data.question || null,
      score: data.score ?? null,
      feedback: data.feedback || null,
      metadata: data.metadata || null
    });
    return normalizeMessage(message);
  }

  async listMessages(interviewId) {
    const messages = await db.InterviewMessage.findAll({
      where: { interviewId },
      order: [['createdAt', 'ASC']]
    });
    return messages.map(normalizeMessage);
  }

  async listForUser(userId, filters = {}) {
    const where = { userId };
    if (filters.type) where.interviewType = String(filters.type).toUpperCase();
    if (filters.visaType) where.visaType = String(filters.visaType).toUpperCase();
    if (filters.status) where.status = String(filters.status).toUpperCase();
    const page = Math.max(Number(filters.page || 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit || 20), 1), 100);
    const offset = (page - 1) * limit;
    const result = await db.Interview.findAndCountAll({
      where,
      order: [['startedAt', 'DESC']],
      limit,
      offset
    });
    return {
      page,
      limit,
      total: result.count,
      items: result.rows.map(normalizeInterview)
    };
  }

  async countCompletedByType(userId) {
    const rows = await db.Interview.findAll({
      where: { userId, status: 'COMPLETED' },
      attributes: ['interviewType', [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']],
      group: ['interviewType']
    });
    return rows.reduce((acc, row) => {
      const item = plain(row);
      acc[item.interviewType] = Number(item.count || 0);
      return acc;
    }, {});
  }

  async countCompletedByTypeAndMode(userId) {
    const rows = await db.Interview.findAll({
      where: { userId, status: 'COMPLETED' },
      attributes: ['interviewType', 'mode', [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']],
      group: ['interviewType', 'mode']
    });
    return rows.reduce((acc, row) => {
      const item = plain(row);
      acc[bucketKey(item.interviewType, item.mode)] = Number(item.count || 0);
      return acc;
    }, {});
  }

  async countActiveByTypeAndMode(userId) {
    const rows = await db.Interview.findAll({
      where: { userId, status: 'ACTIVE' },
      attributes: ['interviewType', 'mode', [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']],
      group: ['interviewType', 'mode']
    });
    return rows.reduce((acc, row) => {
      const item = plain(row);
      acc[bucketKey(item.interviewType, item.mode)] = Number(item.count || 0);
      return acc;
    }, {});
  }

  async listActiveByTypeAndMode(userId, interviewType, mode) {
    const rows = await db.Interview.findAll({
      where: {
        userId,
        interviewType: String(interviewType || '').toUpperCase(),
        mode: String(mode || '').toUpperCase(),
        status: 'ACTIVE'
      },
      order: [['startedAt', 'ASC']]
    });
    return rows.map(normalizeInterview);
  }

  async countActiveLiveByMode(userId, mode) {
    const [rows] = await db.sequelize.query(
      `
        SELECT COUNT(*)::int AS count
        FROM live_interview_sessions AS lis
        INNER JOIN interviews AS i ON i.id = lis.interview_id
        WHERE lis.user_id = :userId
          AND i.interview_type = 'LIVE'
          AND i.mode = :mode
          AND i.status = 'ACTIVE'
          AND lis.status = 'active'
          AND lis.ended_at IS NULL
      `,
      { replacements: { userId, mode } }
    );
    return Number(rows[0]?.count || 0);
  }

  async listActiveLiveByMode(userId, mode) {
    const rows = await db.LiveInterviewSession.findAll({
      where: {
        userId,
        status: 'active',
        endedAt: null
      },
      include: [{
        model: db.Interview,
        as: 'interview',
        where: {
          userId,
          interviewType: 'LIVE',
          mode: String(mode || '').toUpperCase(),
          status: 'ACTIVE'
        }
      }],
      order: [['startedAt', 'ASC']]
    });
    return rows.map((row) => {
      const session = plain(row);
      return {
        ...session,
        interview: normalizeInterview(session.interview)
      };
    });
  }

  async createLiveSession(data) {
    const session = await db.LiveInterviewSession.create(data);
    return plain(session);
  }

  async findLiveSession(sessionId) {
    return plain(await db.LiveInterviewSession.findByPk(sessionId));
  }

  async updateLiveSession(sessionId, updates) {
    const session = await db.LiveInterviewSession.findByPk(sessionId);
    if (!session) return null;
    await session.update(updates);
    return plain(session);
  }

  async saveLiveTranscript(data) {
    const transcript = await db.LiveTranscript.create(data);
    return plain(transcript);
  }

  async listLiveTranscripts(sessionId) {
    const rows = await db.LiveTranscript.findAll({
      where: { sessionId },
      order: [['createdAt', 'ASC']]
    });
    return rows.map(plain);
  }

  async saveAiEvent(data) {
    const event = await db.AiEventLog.create(data);
    return plain(event);
  }

  async listAll(filters = {}) {
    const where = {};
    if (filters.type) where.interviewType = String(filters.type).toUpperCase();
    if (filters.visaType) where.visaType = String(filters.visaType).toUpperCase();
    if (filters.mode) where.mode = String(filters.mode).toUpperCase();
    if (filters.status) where.status = String(filters.status).toUpperCase();
    const page = Math.max(Number(filters.page || 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit || 20), 1), 100);
    const result = await db.Interview.findAndCountAll({
      where,
      order: [['startedAt', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });
    return { page, limit, total: result.count, items: result.rows.map(normalizeInterview) };
  }

  async getAdminDetail(interviewId) {
    const interview = await this.findById(interviewId);
    if (!interview) return null;
    return {
      interview,
      messages: await this.listMessages(interviewId),
      transcripts: await db.LiveTranscript.findAll({ where: { interviewId }, order: [['createdAt', 'ASC']] }).then((rows) => rows.map(plain)),
      usageLogs: await db.UsageLog.findAll({ where: { interviewId }, order: [['createdAt', 'ASC']] }).then((rows) => rows.map(plain))
    };
  }

  async analytics() {
    const all = await db.Interview.findAll();
    return summarizeInterviews(all.map(normalizeInterview));
  }

  async aiUsageSummary() {
    const rows = await db.UsageLog.findAll();
    return summarizeUsage(rows.map(plain));
  }
}

class MemoryInterviewRepository {
  constructor() {
    this.interviews = new Map();
    this.messages = new Map();
    this.liveSessions = new Map();
    this.liveTranscripts = new Map();
    this.aiEvents = [];
  }

  async createInterview(data) {
    const now = new Date().toISOString();
    const interview = {
      id: data.id,
      userId: data.userId,
      interviewType: data.interviewType,
      visaType: data.visaType,
      mode: data.mode,
      status: data.status || 'ACTIVE',
      currentQuestion: data.currentQuestion || null,
      finalScore: null,
      finalFeedback: null,
      strengths: [],
      weaknesses: [],
      recommendations: [],
      finalEvaluation: null,
      startedAt: data.startedAt || now,
      endedAt: null,
      createdAt: now
    };
    this.interviews.set(interview.id, interview);
    return normalizeInterview(interview);
  }

  async findById(id) {
    return normalizeInterview(this.interviews.get(id));
  }

  async updateInterview(id, updates) {
    const existing = this.interviews.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.interviews.set(id, updated);
    return normalizeInterview(updated);
  }

  async saveMessage(data) {
    const message = {
      id: crypto.randomUUID(),
      interviewId: data.interviewId,
      userId: data.userId,
      role: data.role,
      content: data.content,
      question: data.question || null,
      score: data.score ?? null,
      feedback: data.feedback || null,
      metadata: data.metadata || null,
      createdAt: new Date().toISOString()
    };
    const list = this.messages.get(data.interviewId) || [];
    list.push(message);
    this.messages.set(data.interviewId, list);
    return normalizeMessage(message);
  }

  async listMessages(interviewId) {
    return [...(this.messages.get(interviewId) || [])].map(normalizeMessage);
  }

  async listForUser(userId, filters = {}) {
    let items = [...this.interviews.values()].filter((item) => item.userId === userId);
    if (filters.type) items = items.filter((item) => item.interviewType === String(filters.type).toUpperCase());
    if (filters.visaType) items = items.filter((item) => item.visaType === String(filters.visaType).toUpperCase());
    if (filters.status) items = items.filter((item) => item.status === String(filters.status).toUpperCase());
    items.sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
    const page = Math.max(Number(filters.page || 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit || 20), 1), 100);
    const start = (page - 1) * limit;
    return {
      page,
      limit,
      total: items.length,
      items: items.slice(start, start + limit).map(normalizeInterview)
    };
  }

  async countCompletedByType(userId) {
    return [...this.interviews.values()]
      .filter((item) => item.userId === userId && item.status === 'COMPLETED')
      .reduce((acc, item) => {
        acc[item.interviewType] = (acc[item.interviewType] || 0) + 1;
        return acc;
      }, {});
  }

  async countCompletedByTypeAndMode(userId) {
    return [...this.interviews.values()]
      .filter((item) => item.userId === userId && item.status === 'COMPLETED')
      .reduce((acc, item) => {
        const key = bucketKey(item.interviewType, item.mode);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
  }

  async countActiveByTypeAndMode(userId) {
    return [...this.interviews.values()]
      .filter((item) => item.userId === userId && item.status === 'ACTIVE')
      .reduce((acc, item) => {
        const key = bucketKey(item.interviewType, item.mode);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
  }

  async listActiveByTypeAndMode(userId, interviewType, mode) {
    const type = String(interviewType || '').toUpperCase();
    const normalizedMode = String(mode || '').toUpperCase();
    return [...this.interviews.values()]
      .filter((item) => (
        item.userId === userId
        && item.interviewType === type
        && item.mode === normalizedMode
        && item.status === 'ACTIVE'
      ))
      .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)))
      .map(normalizeInterview);
  }

  async countActiveLiveByMode(userId, mode) {
    return [...this.liveSessions.values()].filter((session) => {
      const interview = this.interviews.get(session.interviewId);
      return session.userId === userId
        && session.status === 'active'
        && !session.endedAt
        && interview?.interviewType === 'LIVE'
        && interview?.mode === mode
        && interview?.status === 'ACTIVE';
    }).length;
  }

  async listActiveLiveByMode(userId, mode) {
    const normalizedMode = String(mode || '').toUpperCase();
    return [...this.liveSessions.values()]
      .filter((session) => {
        const interview = this.interviews.get(session.interviewId);
        return session.userId === userId
          && session.status === 'active'
          && !session.endedAt
          && interview?.interviewType === 'LIVE'
          && interview?.mode === normalizedMode
          && interview?.status === 'ACTIVE';
      })
      .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)))
      .map((session) => ({
        ...session,
        interview: normalizeInterview(this.interviews.get(session.interviewId))
      }));
  }

  async createLiveSession(data) {
    const now = new Date().toISOString();
    const session = {
      id: data.id || crypto.randomUUID(),
      interviewId: data.interviewId,
      userId: data.userId,
      provider: data.provider,
      status: data.status || 'active',
      connectionStatus: data.connectionStatus || 'created',
      connectionInfo: data.connectionInfo || {},
      sessionConfig: data.sessionConfig || {},
      enableAvatar: Boolean(data.enableAvatar),
      expiresAt: data.expiresAt || null,
      startedAt: data.startedAt || now,
      endedAt: null,
      createdAt: now
    };
    this.liveSessions.set(session.id, session);
    return session;
  }

  async findLiveSession(sessionId) {
    return this.liveSessions.get(sessionId) || null;
  }

  async updateLiveSession(sessionId, updates) {
    const existing = this.liveSessions.get(sessionId);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.liveSessions.set(sessionId, updated);
    return updated;
  }

  async saveLiveTranscript(data) {
    const transcript = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };
    const list = this.liveTranscripts.get(data.sessionId) || [];
    list.push(transcript);
    this.liveTranscripts.set(data.sessionId, list);
    return transcript;
  }

  async listLiveTranscripts(sessionId) {
    return [...(this.liveTranscripts.get(sessionId) || [])];
  }

  async saveAiEvent(data) {
    const event = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString()
    };
    this.aiEvents.push(event);
    return event;
  }

  async listAll(filters = {}) {
    let items = [...this.interviews.values()];
    if (filters.type) items = items.filter((item) => item.interviewType === String(filters.type).toUpperCase());
    if (filters.visaType) items = items.filter((item) => item.visaType === String(filters.visaType).toUpperCase());
    if (filters.mode) items = items.filter((item) => item.mode === String(filters.mode).toUpperCase());
    if (filters.status) items = items.filter((item) => item.status === String(filters.status).toUpperCase());
    const page = Math.max(Number(filters.page || 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit || 20), 1), 100);
    const start = (page - 1) * limit;
    return { page, limit, total: items.length, items: items.slice(start, start + limit).map(normalizeInterview) };
  }

  async getAdminDetail(interviewId) {
    const interview = await this.findById(interviewId);
    if (!interview) return null;
    return {
      interview,
      messages: await this.listMessages(interviewId),
      transcripts: [...this.liveTranscripts.values()].flat().filter((item) => item.interviewId === interviewId),
      usageLogs: []
    };
  }

  async analytics() {
    return summarizeInterviews([...this.interviews.values()].map(normalizeInterview));
  }

  async aiUsageSummary() {
    return summarizeUsage([]);
  }
}

function summarizeInterviews(items) {
  return items.reduce((acc, item) => {
    if (item.interviewType === 'CHAT') acc.chatInterviews += 1;
    if (item.interviewType === 'LIVE') acc.liveInterviews += 1;
    if (item.status === 'COMPLETED') acc.completedInterviews += 1;
    return acc;
  }, { chatInterviews: 0, liveInterviews: 0, completedInterviews: 0 });
}

function summarizeUsage(rows) {
  const totals = rows.reduce((acc, row) => {
    const model = row.modelName || row.model_name || row.provider || 'unknown';
    if (!acc.byModel[model]) acc.byModel[model] = { model, inputTokens: 0, outputTokens: 0, audioSeconds: 0, estimatedCost: 0 };
    acc.inputTokens += Number(row.inputTokens ?? row.input_tokens ?? 0);
    acc.outputTokens += Number(row.outputTokens ?? row.output_tokens ?? 0);
    acc.audioSeconds += Number(row.audioSeconds ?? row.audio_seconds ?? 0);
    acc.byModel[model].inputTokens += Number(row.inputTokens ?? row.input_tokens ?? 0);
    acc.byModel[model].outputTokens += Number(row.outputTokens ?? row.output_tokens ?? 0);
    acc.byModel[model].audioSeconds += Number(row.audioSeconds ?? row.audio_seconds ?? 0);
    return acc;
  }, { inputTokens: 0, outputTokens: 0, audioSeconds: 0, byModel: {} });
  return { ...totals, byModel: Object.values(totals.byModel) };
}

function bucketKey(interviewType, mode) {
  return `${String(interviewType || '').toUpperCase()}_${String(mode || '').toUpperCase()}`;
}

let repositorySingleton = null;

function createInterviewRepository() {
  if (repositorySingleton) return repositorySingleton;
  if (process.env.AUTH_STORAGE === 'memory' || process.env.NODE_ENV === 'test') {
    repositorySingleton = new MemoryInterviewRepository();
    return repositorySingleton;
  }
  repositorySingleton = new SequelizeInterviewRepository();
  return repositorySingleton;
}

module.exports = {
  SequelizeInterviewRepository,
  MemoryInterviewRepository,
  createInterviewRepository
};
