const STORY_BUILDER_CREDIT_COST = 10;

const STORY_BUILDER_QUESTIONS = Object.freeze({
  F1: Object.freeze([
    { id: 'country', category: 'past', question: 'What country are you from?', inputType: 'text' },
    { id: 'background', category: 'past', question: 'Tell us a little about yourself.', inputType: 'textarea', placeholder: 'Example: education, work, interests, family background' },
    {
      id: 'current_situation',
      category: 'past',
      question: 'What best describes your current situation?',
      inputType: 'options',
      options: ['Student', 'Employed', 'Self-employed', 'Business Owner', 'Unemployed', 'Other'],
      allowOther: true
    },
    { id: 'university', category: 'present', question: 'Which university admitted you?', inputType: 'text' },
    { id: 'program', category: 'present', question: 'What program will you study?', inputType: 'text' },
    { id: 'program_reason', category: 'present', question: 'Why did you choose this program?', inputType: 'textarea' },
    { id: 'university_reason', category: 'present', question: 'Why did you choose this university?', inputType: 'textarea' },
    {
      id: 'sponsor',
      category: 'present',
      question: 'Who is paying for your education?',
      inputType: 'options',
      options: ['Myself', 'Parents', 'Family Member', 'Scholarship', 'Employer', 'Other'],
      allowOther: true
    },
    {
      id: 'us_stay',
      category: 'present',
      question: 'Where will you stay in the United States?',
      inputType: 'options',
      options: ['University Housing', 'Private Apartment', 'Family/Friends', 'Other'],
      allowOther: true
    },
    { id: 'future_plan', category: 'future', question: 'After your studies, what do you plan to do?', inputType: 'textarea' },
    { id: 'return_country', category: 'future', question: 'Which country do you plan to return to?', inputType: 'text', defaultFrom: 'country' },
    { id: 'goal_help', category: 'future', question: 'How will this degree help you achieve your future goals?', inputType: 'textarea' }
  ]),
  B1_B2: Object.freeze([
    { id: 'country', category: 'past', question: 'What country are you from?', inputType: 'text' },
    { id: 'background', category: 'past', question: 'Tell us a little about yourself.', inputType: 'textarea', placeholder: 'Example: education, work, interests, family background' },
    {
      id: 'current_situation',
      category: 'past',
      question: 'What best describes your current situation?',
      inputType: 'options',
      options: ['Student', 'Employed', 'Self-employed', 'Business Owner', 'Unemployed', 'Other'],
      allowOther: true
    },
    { id: 'travel_purpose', category: 'present', question: 'Why are you traveling to the United States?', inputType: 'textarea' },
    { id: 'duration', category: 'present', question: 'How long do you plan to stay?', inputType: 'text' },
    {
      id: 'payer',
      category: 'present',
      question: 'Who is paying for your trip?',
      inputType: 'options',
      options: ['Myself', 'Parents', 'Family Member', 'Employer', 'Friend', 'Other'],
      allowOther: true
    },
    {
      id: 'us_stay',
      category: 'present',
      question: 'Where will you stay in the United States?',
      inputType: 'options',
      options: ['Hotel', 'Family/Friends', 'Airbnb', 'Other'],
      allowOther: true
    },
    { id: 'future_plan', category: 'future', question: 'After your trip, what do you plan to do?', inputType: 'textarea' },
    { id: 'return_country', category: 'future', question: 'Which country do you plan to return to?', inputType: 'text', defaultFrom: 'country' },
    { id: 'goal_help', category: 'future', question: 'How will this trip help you achieve your future goals?', inputType: 'textarea' }
  ])
});

module.exports = {
  STORY_BUILDER_CREDIT_COST,
  STORY_BUILDER_QUESTIONS
};
