describe('database seeders', () => {
  test('admin seeder creates an active admin user from env', async () => {
    process.env.ADMIN_EMAIL = 'admin.test@example.com';
    process.env.ADMIN_PASSWORD = 'Password123!';
    process.env.ADMIN_NAME = 'Admin Test';

    const rows = {};
    const queryInterface = {
      bulkDelete: jest.fn(),
      bulkInsert: jest.fn((table, values) => {
        rows[table] = values;
      })
    };

    const seeder = require('../../src/database/seeders/20260712193000-seed-admin-user');
    await seeder.up(queryInterface);

    expect(rows.users[0].email).toBe('admin.test@example.com');
    expect(rows.users[0].role).toBe('admin');
    expect(rows.users[0].status).toBe('active');
    expect(rows.users[0].password_hash).toEqual(expect.any(String));
  });
});
