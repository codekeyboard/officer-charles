require('../../core/util/register-aliases');

describe('Sequelize config', () => {
  test('loads Postgres config without opening a connection', () => {
    const dbConfig = require('../../src/config/db');

    expect(dbConfig.dialect).toBe('postgres');
    expect(dbConfig.url || dbConfig.database).toBeTruthy();
  });
});
