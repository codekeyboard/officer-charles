'use strict';

const bcrypt = require('bcryptjs');

const ADMIN_USER_ID = '99999999-9999-4999-8999-999999999999';
const ADMIN_PROFILE_ID = '99999999-9999-4999-8999-999999999998';
const ADMIN_USAGE_ID = '99999999-9999-4999-8999-999999999997';

module.exports = {
  async up(queryInterface) {
    const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = String(process.env.ADMIN_PASSWORD || '');
    const name = String(process.env.ADMIN_NAME || 'Officer Charles Admin').trim();

    if (!email || !password) {
      console.warn('[seed-admin-user] ADMIN_EMAIL and ADMIN_PASSWORD are required to seed an admin account. Skipping.');
      return;
    }

    const now = new Date();
    await queryInterface.bulkDelete('refresh_tokens', { user_id: ADMIN_USER_ID });
    await queryInterface.bulkDelete('user_usage', { user_id: ADMIN_USER_ID });
    await queryInterface.bulkDelete('user_profiles', { user_id: ADMIN_USER_ID });
    await queryInterface.bulkDelete('users', { email });
    await queryInterface.bulkDelete('users', { id: ADMIN_USER_ID });

    await queryInterface.bulkInsert('users', [{
      id: ADMIN_USER_ID,
      name,
      email,
      password_hash: await bcrypt.hash(password, 12),
      google_id: null,
      role: 'admin',
      status: 'active',
      created_at: now,
      updated_at: now
    }]);

    await queryInterface.bulkInsert('user_profiles', [{
      id: ADMIN_PROFILE_ID,
      user_id: ADMIN_USER_ID,
      display_name: name,
      avatar_url: null,
      country: null,
      target_visa: null,
      created_at: now,
      updated_at: now
    }]);

    await queryInterface.bulkInsert('user_usage', [{
      id: ADMIN_USAGE_ID,
      user_id: ADMIN_USER_ID,
      chat_interviews_used: 0,
      live_interviews_used: 0,
      created_at: now,
      updated_at: now
    }]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('refresh_tokens', { user_id: ADMIN_USER_ID });
    await queryInterface.bulkDelete('user_usage', { user_id: ADMIN_USER_ID });
    await queryInterface.bulkDelete('user_profiles', { user_id: ADMIN_USER_ID });
    await queryInterface.bulkDelete('users', { id: ADMIN_USER_ID });
  }
};
