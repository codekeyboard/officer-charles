require('dotenv').config({ path: '.env' });

const mailService = require('../src/services/MailService');

async function main() {
  const to = String(process.argv[2] || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.error('Usage: npm run email:test -- recipient@example.com');
    process.exit(1);
  }

  const code = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  const result = await mailService.sendVerificationCode({
    to,
    name: 'Test User',
    code
  });

  console.log(`Test OTP email sent to ${to}`);
  console.log(`Provider: ${result.provider || 'dev-log'}`);
  console.log(`Code: ${code}`);
}

main().catch((error) => {
  console.error('Test email failed:', error.message);
  process.exit(1);
});
