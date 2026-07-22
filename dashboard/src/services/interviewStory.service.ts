import api, { unwrap } from "./api";

export type StoryVisaType = "F1" | "B1_B2";

export interface StoryTurn {
  id: string;
  question: string;
  answer: string;
  category: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface StoryState {
  turns: StoryTurn[];
  readyToGenerate: boolean;
  lastAssistantQuestion?: string;
  lastCategory?: string;
  activeTurnOffset?: number;
  currentQuestionIndex?: number;
}

export interface InterviewStory {
  id: string;
  userId: string;
  visaType: StoryVisaType;
  answers: StoryState;
  storyText: string;
  status: "draft" | "generated" | string;
  generatedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface StoryPayload {
  story: InterviewStory | null;
  flow?: StoryFlow;
  creditCost: number;
}

export interface StoryListPayload {
  stories: InterviewStory[];
  creditCost: number;
}

export interface StoryFlowQuestion {
  id: string;
  category: string;
  question: string;
  inputType?: "text" | "textarea" | "options";
  options?: string[];
  allowOther?: boolean;
  placeholder?: string;
  defaultFrom?: string;
  index: number;
  answer: string;
  answered: boolean;
}

export interface StoryFlow {
  question: StoryFlowQuestion | null;
  questionIndex: number;
  totalQuestions: number;
  answers: StoryFlowQuestion[];
  answeredCount: number;
  complete: boolean;
  readyToGenerate: boolean;
}

export interface StoryFlowResponse extends StoryPayload {
  flow: StoryFlow;
}

export const interviewStoryService = {
  list: () => api.get("/interview-stories").then(unwrap<StoryListPayload>),
  get: (visaType: StoryVisaType) =>
    api.get(`/interview-stories/${visaType}`).then(unwrap<StoryPayload>),
  startFlow: (visaType: StoryVisaType, reset = false) =>
    api.post(`/interview-stories/${visaType}/flow/start`, { reset }).then(unwrap<StoryFlowResponse>),
  saveFlowAnswer: (visaType: StoryVisaType, payload: { questionId: string; answer: string; direction?: "next" | "previous" | "stay"; nextIndex?: number }) =>
    api.patch(`/interview-stories/${visaType}/flow/answer`, payload).then(unwrap<StoryFlowResponse>),
  reviewFlow: (visaType: StoryVisaType) =>
    api.get(`/interview-stories/${visaType}/flow/review`).then(unwrap<StoryFlowResponse>),
  generate: (visaType: StoryVisaType) =>
    api.post(`/interview-stories/${visaType}/generate`).then(unwrap<{ story: InterviewStory; creditCost: number; operationId: string }>),
  updateStoryText: (visaType: StoryVisaType, storyText: string) =>
    api.patch(`/interview-stories/${visaType}/story`, { storyText }).then(unwrap<StoryPayload>),
};
