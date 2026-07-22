const FoundryResponsesClientModule = require('@src/utils/classes/FoundryResponsesClient');
const LoggerModule = require('@src/utils/classes/Logger');
const AppErrorModule = require('@src/utils/classes/AppError');

const FoundryResponsesClient = FoundryResponsesClientModule.default || FoundryResponsesClientModule.FoundryResponsesClient;
const Logger = LoggerModule.default || LoggerModule.Logger;
const AppError = AppErrorModule.default || AppErrorModule.AppError;
const { ERROR_CODES } = AppErrorModule;

const RUBRIC_VERSION = 'visa-practical-v1';
const SCORING_AUTHORITY = 'foundry_agent';
const FINAL_EVALUATION_TIMEOUT_MS = Number(process.env.FOUNDRY_FINAL_EVALUATION_TIMEOUT_MS || 45000);
const RUBRIC = Object.freeze({
  relevanceAndDirectness: { label: 'Relevance and directness', max: 15 },
  visaPurposeAndFit: { label: 'Visa purpose and fit', max: 20 },
  fundingAndEvidence: { label: 'Funding and evidence', max: 20 },
  homeTiesAndReturnIntent: { label: 'Home ties and return intent', max: 20 },
  consistencyAndCredibility: { label: 'Consistency and credibility', max: 15 },
  communicationClarity: { label: 'Communication clarity', max: 10 }
});

const VISA_RULES = Object.freeze({
  F1: [
    'University and program fit',
    'Academic background connected to the intended study',
    'Sponsor, funding source, and financial evidence',
    'Post-study career plan outside the United States',
    'Home-country family, career, property, or community ties',
    'Clear intent to return after study'
  ],
  B1_B2: [
    'Clear temporary travel purpose',
    'Specific itinerary, duration, destination, and activities',
    'Payer, affordability, employment, business, or income evidence',
    'Family, job, business, property, or other home-country ties',
    'Travel history and prior visa compliance where relevant',
    'Clear plan to leave the United States on time'
  ]
});

class FoundryFinalEvaluationService {
  constructor({
    foundryClient = new FoundryResponsesClient(),
    logger = new Logger()
  } = {}) {
    this.foundryClient = foundryClient;
    this.logger = logger;
  }

  async evaluate(input = {}) {
    const normalizedInput = this.normalizeInput(input);
    try {
      const rawText = await this.requestEvaluation(normalizedInput);
      const parsed = this.parseJson(rawText);
      return this.validateAndNormalize(parsed, normalizedInput);
    } catch (error) {
      if (error?.errorCode === ERROR_CODES.EVALUATION_UNAVAILABLE) throw error;
      this.logger.warn('Foundry final evaluation unavailable', { error });
      throw this.unavailableError(error);
    }
  }

  async requestEvaluation(input) {
    const mock = this.getTestMockResponse(input);
    if (mock) return mock;
    if (!this.foundryClient) {
      throw new Error('Foundry final evaluation client is not configured.');
    }
    const prompt = this.buildEvaluationPrompt(input);
    const options = {
      interviewId: input.interviewId,
      timeoutMs: FINAL_EVALUATION_TIMEOUT_MS,
      metadata: {
        interviewId: input.interviewId,
        purpose: 'final_evaluation'
      }
    };
    const response = typeof this.foundryClient.createJsonResponse === 'function'
      ? await this.foundryClient.createJsonResponse(prompt, options)
      : await this.foundryClient.sendMessage(prompt, options);
    return response?.outputText || response?.output_text || response?.text || response?.message || '';
  }

  getTestMockResponse(input) {
    if (process.env.NODE_ENV !== 'test') return null;
    const mode = process.env.FOUNDRY_FINAL_EVALUATION_MOCK;
    if (mode === 'invalid') {
      return JSON.stringify({
        rubricVersion: RUBRIC_VERSION,
        scoringAuthority: SCORING_AUTHORITY,
        totalScore: 100,
        label: 'GOOD',
        categoryScores: {
          relevanceAndDirectness: { score: 1, evidence: [] }
        }
      });
    }
    if (mode !== 'valid') return null;
    return JSON.stringify(this.buildMockEvaluation(input));
  }

  buildEvaluationPrompt(input) {
    const rubricLines = Object.entries(RUBRIC)
      .map(([key, item]) => `- ${key}: ${item.max} points (${item.label})`)
      .join('\n');
    const visaRules = (VISA_RULES[input.visaType] || [])
      .map((rule) => `- ${rule}`)
      .join('\n');
    const transcript = input.answerPairs.length
      ? input.answerPairs.map((item, index) => [
        `Question ${index + 1}: ${item.question}`,
        `Answer ${index + 1}: ${item.answer}`
      ].join('\n')).join('\n\n')
      : 'No applicant answers were captured.';

    return [
      'You are the Foundry agent scoring a completed US visa interview practice session.',
      'Return JSON only. Do not include markdown, prose outside JSON, or comments.',
      `Rubric version: ${RUBRIC_VERSION}`,
      `Required scoringAuthority: ${SCORING_AUTHORITY}`,
      `Interview type: ${input.interviewType}`,
      `Visa type: ${input.visaType}`,
      `Mode: ${input.mode}`,
      '',
      'Practical 100-point rubric:',
      rubricLines,
      '',
      'Visa-specific rules to apply:',
      visaRules || '- Apply only general visa credibility, purpose, funding, ties, and communication rules.',
      '',
      'Scoring rules:',
      '- Score every category from 0 to its maximum.',
      '- totalScore must equal the exact sum of all category scores.',
      '- Every scored category must include at least one specific evidence item from the transcript.',
      '- Include per-question reviews tied to the actual question and answer.',
      '- Include ruleHits for facts that helped the score.',
      '- Include redFlags for contradictions, missing evidence, vague funding, weak ties, or immigrant-intent risks. Use an empty array only if none are present.',
      '- Do not guarantee visa approval or denial.',
      '',
      'Required JSON shape:',
      JSON.stringify({
        rubricVersion: RUBRIC_VERSION,
        scoringAuthority: SCORING_AUTHORITY,
        totalScore: 0,
        label: 'EXCELLENT | GOOD | NEEDS_IMPROVEMENT | WEAK',
        categoryScores: Object.fromEntries(Object.entries(RUBRIC).map(([key, item]) => [key, {
          score: 0,
          max: item.max,
          evidence: ['Specific transcript evidence for this category']
        }])),
        questionReviews: [{
          question: 'Question asked',
          answerSummary: 'Specific applicant answer summary',
          score: 0,
          evidence: ['Specific transcript evidence'],
          strengths: ['What worked'],
          weaknesses: ['What needs improvement'],
          recommendation: 'How to improve this answer'
        }],
        ruleHits: ['Specific rule or evidence that affected scoring'],
        redFlags: ['Specific concern or risk, or empty array if none'],
        summary: 'Concise readiness summary tied to the transcript',
        strengths: ['Overall strength'],
        weaknesses: ['Overall weakness or risk'],
        recommendations: ['Practical next step'],
        disclaimer: 'Practice assessment only. This does not predict or guarantee a visa outcome.'
      }),
      '',
      'Transcript:',
      transcript
    ].join('\n');
  }

  validateAndNormalize(value, input = {}) {
    const evaluation = value?.finalEvaluation || value;
    if (!evaluation || typeof evaluation !== 'object' || Array.isArray(evaluation)) {
      throw this.validationError('Evaluation JSON object is required.');
    }
    if (evaluation.rubricVersion !== RUBRIC_VERSION) {
      throw this.validationError('rubricVersion is missing or unsupported.');
    }
    if (evaluation.scoringAuthority !== SCORING_AUTHORITY) {
      throw this.validationError('scoringAuthority must be foundry_agent.');
    }
    const categoryScores = this.normalizeCategoryScores(evaluation.categoryScores);
    const categoryTotal = Object.values(categoryScores).reduce((sum, item) => sum + item.score, 0);
    const totalScore = toInteger(evaluation.totalScore);
    if (totalScore !== categoryTotal) {
      throw this.validationError('totalScore must equal the sum of category scores.');
    }
    const questionReviews = this.normalizeQuestionReviews(evaluation.questionReviews, input.answerPairs.length);
    const ruleHits = requiredList(evaluation.ruleHits, 'ruleHits');
    const redFlags = optionalList(evaluation.redFlags);
    const strengths = requiredList(evaluation.strengths, 'strengths');
    const weaknesses = optionalList(evaluation.weaknesses);
    const recommendations = requiredList(evaluation.recommendations, 'recommendations');
    const summary = requiredString(evaluation.summary, 'summary');
    const label = requiredString(evaluation.label, 'label');
    const disclaimer = String(evaluation.disclaimer || 'Practice assessment only. This does not predict or guarantee a visa outcome.').trim();

    const normalized = {
      rubricVersion: RUBRIC_VERSION,
      scoringAuthority: SCORING_AUTHORITY,
      interviewId: input.interviewId,
      interviewType: input.interviewType,
      visaType: input.visaType,
      mode: input.mode,
      totalScore,
      label,
      categoryScores,
      questionReviews,
      ruleHits,
      redFlags,
      summary,
      strengths,
      weaknesses,
      recommendations,
      disclaimer
    };
    return {
      ...normalized,
      title: 'Final Interview Evaluation',
      message: this.buildMessage(normalized)
    };
  }

  normalizeCategoryScores(value = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw this.validationError('categoryScores object is required.');
    }
    return Object.fromEntries(Object.entries(RUBRIC).map(([key, rubric]) => {
      const item = value[key];
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw this.validationError(`categoryScores.${key} is required.`);
      }
      const score = toInteger(item.score);
      if (score < 0 || score > rubric.max) {
        throw this.validationError(`categoryScores.${key}.score is out of range.`);
      }
      const evidence = requiredList(item.evidence, `categoryScores.${key}.evidence`);
      return [key, {
        label: rubric.label,
        score,
        max: rubric.max,
        evidence
      }];
    }));
  }

  normalizeQuestionReviews(value = [], answerCount = 0) {
    if (!Array.isArray(value)) throw this.validationError('questionReviews must be an array.');
    if (answerCount > 0 && value.length === 0) throw this.validationError('questionReviews must include at least one review.');
    return value.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw this.validationError(`questionReviews.${index} must be an object.`);
      }
      return {
        question: requiredString(item.question, `questionReviews.${index}.question`),
        answerSummary: requiredString(item.answerSummary, `questionReviews.${index}.answerSummary`),
        score: clamp(toInteger(item.score), 0, 100),
        evidence: requiredList(item.evidence, `questionReviews.${index}.evidence`),
        strengths: optionalList(item.strengths),
        weaknesses: optionalList(item.weaknesses),
        recommendation: requiredString(item.recommendation, `questionReviews.${index}.recommendation`)
      };
    });
  }

  normalizeInput(input = {}) {
    const interview = input.interview || input.session || {};
    const interviewId = input.interviewId || interview.id || input.liveSession?.interviewId || '';
    const interviewType = String(input.interviewType || interview.interviewType || '').toUpperCase();
    const visaType = String(input.visaType || interview.visaType || '').toUpperCase();
    const mode = String(input.mode || interview.mode || '').toUpperCase();
    return {
      interviewId,
      interviewType,
      visaType,
      mode,
      answerPairs: this.buildAnswerPairs(input)
    };
  }

  buildAnswerPairs(input = {}) {
    if (Array.isArray(input.answerPairs)) {
      return input.answerPairs.map((item) => ({
        question: String(item.question || 'Interview question').trim(),
        answer: String(item.answer || '').trim()
      })).filter((item) => item.answer);
    }
    if (Array.isArray(input.answers)) {
      return input.answers.map((item) => ({
        question: String(item.question || 'Interview question').trim(),
        answer: String(item.answer || item.content || '').trim()
      })).filter((item) => item.answer);
    }
    if (Array.isArray(input.messages)) return this.answerPairsFromMessages(input.messages);
    if (Array.isArray(input.transcripts)) return this.answerPairsFromTranscripts(input.transcripts);
    return [];
  }

  answerPairsFromMessages(messages = []) {
    let lastAssistant = '';
    return messages.reduce((pairs, message) => {
      if (message.role === 'assistant') {
        lastAssistant = message.question || message.content || lastAssistant;
        return pairs;
      }
      if (message.role === 'user') {
        pairs.push({
          question: String(message.question || lastAssistant || 'Interview question').trim(),
          answer: String(message.content || '').trim()
        });
      }
      return pairs;
    }, []).filter((item) => item.answer);
  }

  answerPairsFromTranscripts(transcripts = []) {
    let lastAssistant = '';
    return dedupeFinalTranscriptItems(transcripts).reduce((pairs, item) => {
      if (item.speaker === 'assistant') {
        lastAssistant = item.text || lastAssistant;
        return pairs;
      }
      if (item.speaker === 'user') {
        pairs.push({
          question: String(lastAssistant || 'Live interview question').trim(),
          answer: String(item.text || '').trim()
        });
      }
      return pairs;
    }, []).filter((item) => item.answer);
  }

  buildMockEvaluation(input) {
    const first = input.answerPairs[0] || { question: 'Interview question', answer: 'Applicant answer.' };
    const categoryScores = Object.fromEntries(Object.entries(RUBRIC).map(([key, item]) => [key, {
      score: Math.max(1, item.max - 3),
      max: item.max,
      evidence: [`The transcript includes evidence for ${item.label.toLowerCase()}.`]
    }]));
    const totalScore = Object.values(categoryScores).reduce((sum, item) => sum + item.score, 0);
    return {
      rubricVersion: RUBRIC_VERSION,
      scoringAuthority: SCORING_AUTHORITY,
      totalScore,
      label: totalScore >= 70 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      categoryScores,
      questionReviews: [{
        question: first.question,
        answerSummary: first.answer.slice(0, 180),
        score: totalScore,
        evidence: ['The applicant gave a specific answer in the transcript.'],
        strengths: ['The answer includes relevant visa interview details.'],
        weaknesses: ['The answer can be strengthened with more document-level evidence.'],
        recommendation: 'Add concise details about documents, dates, funding, and return plans.'
      }],
      ruleHits: [`Applied ${input.visaType || 'visa'} practical interview rules.`],
      redFlags: [],
      summary: 'The applicant gave usable answers with some specific supporting details.',
      strengths: ['Relevant answers were provided.'],
      weaknesses: ['More concrete evidence would improve credibility.'],
      recommendations: ['Practice concise answers with documents, dates, funding, and home-tie details.'],
      disclaimer: 'Practice assessment only. This does not predict or guarantee a visa outcome.'
    };
  }

  buildMessage(evaluation) {
    const categoryLines = Object.entries(evaluation.categoryScores).map(([, item]) => {
      return `- ${item.label}: ${item.score}/${item.max}. Evidence: ${item.evidence.join('; ')}`;
    });
    const reviewLines = evaluation.questionReviews.flatMap((review, index) => [
      `${index + 1}. Question: ${review.question}`,
      `   Answer summary: ${review.answerSummary}`,
      `   Evidence: ${review.evidence.join('; ')}`,
      `   What worked: ${review.strengths.join('; ') || 'A relevant answer was provided.'}`,
      `   Needs improvement: ${review.weaknesses.join('; ') || 'No major weakness recorded.'}`,
      `   Recommendation: ${review.recommendation}`
    ]);
    return [
      `Final evaluation - ${evaluation.label} (${evaluation.totalScore}/100)`,
      '',
      'Readiness summary',
      evaluation.summary,
      '',
      'Category scorecard',
      ...categoryLines,
      '',
      'Question-by-question review',
      ...(reviewLines.length ? reviewLines : ['No answered questions were available for review.']),
      '',
      'Rule hits',
      ...evaluation.ruleHits.map((item) => `- ${item}`),
      '',
      'Red flags',
      ...(evaluation.redFlags.length ? evaluation.redFlags : ['No major red flags recorded.']).map((item) => `- ${item}`),
      '',
      'Strengths',
      ...evaluation.strengths.map((item) => `- ${item}`),
      '',
      'Weaknesses / risks',
      ...(evaluation.weaknesses.length ? evaluation.weaknesses : ['No major weakness recorded.']).map((item) => `- ${item}`),
      '',
      'Recommendations',
      ...evaluation.recommendations.map((item) => `- ${item}`),
      '',
      'Note',
      evaluation.disclaimer
    ].join('\n');
  }

  parseJson(text) {
    const raw = String(text || '').trim();
    if (!raw) throw this.validationError('Foundry returned an empty evaluation.');
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonText = fenced?.[1] || raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    if (!jsonText || !jsonText.trim().startsWith('{')) {
      throw this.validationError('Foundry response did not contain a JSON object.');
    }
    try {
      return JSON.parse(jsonText);
    } catch {
      throw this.validationError('Foundry response JSON could not be parsed.');
    }
  }

  validationError(message) {
    return this.unavailableError(new Error(message));
  }

  unavailableError(error) {
    return new AppError({
      statusCode: 503,
      publicMessage: 'Evaluation is temporarily unavailable. Please retry.',
      internalMessage: error?.message || 'Foundry final evaluation unavailable.',
      errorCode: ERROR_CODES.EVALUATION_UNAVAILABLE
    });
  }
}

function dedupeFinalTranscriptItems(transcripts = []) {
  const seen = new Set();
  return transcripts.filter((item) => item.isFinal).filter((item) => {
    const key = [
      item.speaker,
      String(item.text || '').trim().toLowerCase(),
      item.timestampMs ?? ''
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function requiredString(value, field) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${field} is required.`);
  return text;
}

function optionalList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function requiredList(value, field) {
  const list = optionalList(value);
  if (!list.length) throw new Error(`${field} must include at least one item.`);
  return list;
}

function toInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return -1;
  return Math.round(number);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

module.exports = FoundryFinalEvaluationService;
module.exports.FoundryFinalEvaluationService = FoundryFinalEvaluationService;
module.exports.RUBRIC = RUBRIC;
module.exports.RUBRIC_VERSION = RUBRIC_VERSION;
module.exports.SCORING_AUTHORITY = SCORING_AUTHORITY;
