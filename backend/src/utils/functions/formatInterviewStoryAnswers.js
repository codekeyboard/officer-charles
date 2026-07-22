function formatInterviewStoryAnswers(answers) {
  if (!answers || typeof answers !== 'object') return '';
  if (Array.isArray(answers.turns)) {
    return answers.turns
      .filter((turn) => turn?.question || turn?.answer)
      .map((turn, index) => {
        const category = turn.category ? ` [${turn.category}]` : '';
        return `${index + 1}.${category} Q: ${turn.question || 'Saved question'} A: ${turn.answer || ''}`;
      })
      .join('\n');
  }
  return Object.entries(answers)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

function interviewStoryAnswerText(answers) {
  if (!answers || typeof answers !== 'object') return '';
  if (Array.isArray(answers.turns)) {
    return answers.turns.map((turn) => String(turn.answer || '')).join(' ');
  }
  return Object.values(answers).join(' ');
}

module.exports = {
  formatInterviewStoryAnswers,
  interviewStoryAnswerText
};
