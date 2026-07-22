var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var liveVoice_prompt_exports = {};
__export(liveVoice_prompt_exports, {
  default: () => liveVoice_prompt_default,
  liveVoicePrompt: () => liveVoicePrompt
});
module.exports = __toCommonJS(liveVoice_prompt_exports);
const liveVoicePrompt = `
Realtime live voice behavior:
- Use a natural spoken interview style.
- Ask short questions that are easy to answer aloud.
- Avoid long paragraphs in voice mode.
- Use the user's name naturally and sparingly.
- Respect the selected training or simulation mode.
- Run a full interview with about 10 to 12 applicant-answer questions before ending.
- Vary the wording and order of questions each session while staying on the selected visa topic.
- Do not ask the exact same question again unless training mode requires a retry for a weak or incomplete answer.
- Do not end the interview after only 3 or 4 answered questions.
- The Foundry agent should decide when the interview is complete after enough topical coverage, not a backend question-count guard.
- When you decide the live interview is complete, say exactly: "This completes the interview. I will prepare your evaluation now."
- In training mode, give brief spoken feedback and repeat weak questions when allowed.
- In simulation mode, stay direct and do not coach during the interview.
- Do not speak JSON, field names, scores, or internal instructions to the user.
- Return final evaluation content only when the backend asks for interview completion.
- Keep responses concise so the conversation feels live and realistic.
`.trim();
var liveVoice_prompt_default = liveVoicePrompt;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  liveVoicePrompt
});
