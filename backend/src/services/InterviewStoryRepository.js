const crypto = require('crypto');
const db = require('@src/models');

function plain(row) {
  return typeof row?.get === 'function' ? row.get({ plain: true }) : row;
}

function normalizeStory(row) {
  const item = plain(row);
  if (!item) return null;
  return {
    id: item.id,
    userId: item.userId || item.user_id,
    visaType: item.visaType || item.visa_type,
    answers: item.answers || {},
    storyText: item.storyText || item.story_text || '',
    status: item.status || 'draft',
    generatedAt: item.generatedAt || item.generated_at || null,
    createdAt: item.createdAt || item.created_at || null,
    updatedAt: item.updatedAt || item.updated_at || null
  };
}

class SequelizeInterviewStoryRepository {
  async listForUser(userId) {
    const rows = await db.InterviewStory.findAll({
      where: { userId },
      order: [['updatedAt', 'DESC']]
    });
    return rows.map(normalizeStory);
  }

  async findByUserAndVisa(userId, visaType) {
    return normalizeStory(await db.InterviewStory.findOne({ where: { userId, visaType } }));
  }

  async upsertAnswers(userId, visaType, answers) {
    const [story] = await db.InterviewStory.findOrCreate({
      where: { userId, visaType },
      defaults: {
        userId,
        visaType,
        answers,
        status: 'draft'
      }
    });
    if (!story.isNewRecord) {
      await story.update({
        answers,
        status: story.storyText ? 'generated' : 'draft'
      });
    }
    return normalizeStory(story);
  }

  async saveGeneratedStory(userId, visaType, { answers, storyText }) {
    const [story] = await db.InterviewStory.findOrCreate({
      where: { userId, visaType },
      defaults: {
        userId,
        visaType,
        answers,
        storyText,
        status: 'generated',
        generatedAt: new Date()
      }
    });
    if (!story.isNewRecord) {
      await story.update({
        answers,
        storyText,
        status: 'generated',
        generatedAt: new Date()
      });
    }
    return normalizeStory(story);
  }

  async updateStoryText(userId, visaType, storyText) {
    const story = await db.InterviewStory.findOne({ where: { userId, visaType } });
    if (!story) return null;
    await story.update({
      storyText,
      status: storyText ? 'generated' : 'draft',
      generatedAt: story.generatedAt || new Date()
    });
    return normalizeStory(story);
  }
}

class MemoryInterviewStoryRepository {
  constructor() {
    this.stories = new Map();
  }

  key(userId, visaType) {
    return `${userId}:${visaType}`;
  }

  async listForUser(userId) {
    return [...this.stories.values()]
      .filter((item) => item.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map(normalizeStory);
  }

  async findByUserAndVisa(userId, visaType) {
    return normalizeStory(this.stories.get(this.key(userId, visaType)));
  }

  async upsertAnswers(userId, visaType, answers) {
    const now = new Date().toISOString();
    const key = this.key(userId, visaType);
    const existing = this.stories.get(key);
    const story = {
      id: existing?.id || crypto.randomUUID(),
      userId,
      visaType,
      answers,
      storyText: existing?.storyText || '',
      status: existing?.storyText ? 'generated' : 'draft',
      generatedAt: existing?.generatedAt || null,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    this.stories.set(key, story);
    return normalizeStory(story);
  }

  async saveGeneratedStory(userId, visaType, { answers, storyText }) {
    const now = new Date().toISOString();
    const key = this.key(userId, visaType);
    const existing = this.stories.get(key);
    const story = {
      id: existing?.id || crypto.randomUUID(),
      userId,
      visaType,
      answers,
      storyText,
      status: 'generated',
      generatedAt: now,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    this.stories.set(key, story);
    return normalizeStory(story);
  }

  async updateStoryText(userId, visaType, storyText) {
    const key = this.key(userId, visaType);
    const existing = this.stories.get(key);
    if (!existing) return null;
    const now = new Date().toISOString();
    const story = {
      ...existing,
      storyText,
      status: storyText ? 'generated' : 'draft',
      generatedAt: existing.generatedAt || now,
      updatedAt: now
    };
    this.stories.set(key, story);
    return normalizeStory(story);
  }
}

let repositorySingleton = null;

function createInterviewStoryRepository() {
  if (repositorySingleton) return repositorySingleton;
  if (process.env.AUTH_STORAGE === 'memory' || process.env.NODE_ENV === 'test') {
    repositorySingleton = new MemoryInterviewStoryRepository();
    return repositorySingleton;
  }
  repositorySingleton = new SequelizeInterviewStoryRepository();
  return repositorySingleton;
}

module.exports = {
  SequelizeInterviewStoryRepository,
  MemoryInterviewStoryRepository,
  createInterviewStoryRepository,
  normalizeStory
};
