'use strict';

const QUESTIONS = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    visa_type: 'F1',
    question_text: 'Why did you choose this university?',
    category: 'university_choice',
    difficulty: 'medium'
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    visa_type: 'F1',
    question_text: 'Who will sponsor your studies?',
    category: 'finance',
    difficulty: 'medium'
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    visa_type: 'F1',
    question_text: 'What are your plans after graduation?',
    category: 'home_ties',
    difficulty: 'hard'
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    visa_type: 'B1_B2',
    question_text: 'What is the purpose of your visit to the United States?',
    category: 'travel_purpose',
    difficulty: 'easy'
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    visa_type: 'B1_B2',
    question_text: 'Who will pay for your trip?',
    category: 'finance',
    difficulty: 'medium'
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    visa_type: 'B1_B2',
    question_text: 'What ties do you have to your home country?',
    category: 'home_ties',
    difficulty: 'hard'
  }
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkDelete('interview_questions', { id: QUESTIONS.map((item) => item.id) });
    await queryInterface.bulkInsert('interview_questions', QUESTIONS.map((item) => ({
      ...item,
      is_active: true,
      created_at: now,
      updated_at: now
    })));
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('interview_questions', { id: QUESTIONS.map((item) => item.id) });
  }
};
