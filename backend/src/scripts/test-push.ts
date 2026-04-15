/**
 * Push Notification Test Script
 *
 * Usage:
 *   npm run test:push
 *   npm run test:push -- --email=owner@joymorocco.com --password=Joy2026!
 *   npm run test:push -- --email=owner@joymorocco.com --password=Joy2026! --title="Custom" --body="Custom message"
 */
import 'dotenv/config';

const BASE_URL = process.env.API_URL || 'http://localhost:3100';

const args = process.argv.slice(2).reduce<Record<string, string>>((acc, arg) => {
  const [key, val] = arg.replace('--', '').split('=');
  acc[key] = val;
  return acc;
}, {});

const email = args.email || 'owner@joymorocco.com';
const password = args.password || 'owner@joymorocco.com';
const title = args.title || '🔔 Push Test';
const body = args.body || `Test sent at ${new Date().toLocaleTimeString()}`;

async function run() {
  console.log(`\n🚀 Joy Platform — Push Notification Test`);
  console.log(`   API: ${BASE_URL}`);
  console.log(`   User: ${email}\n`);

  // Step 1: Login
  process.stdout.write('1. Logging in... ');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    console.error(`❌ Login failed: ${loginRes.status} ${await loginRes.text()}`);
    process.exit(1);
  }

  const cookies = loginRes.headers.get('set-cookie') || '';
  const cookieHeader = cookies
    .split(',')
    .map(c => c.split(';')[0].trim())
    .join('; ');
  const { user } = await loginRes.json();
  console.log(`✅ Logged in as ${user.name} (${user.role})`);

  // Step 2: Check subscriptions
  process.stdout.write('2. Checking push subscriptions... ');
  const subsRes = await fetch(`${BASE_URL}/notifications/subscriptions`, {
    headers: { Cookie: cookieHeader },
  });

  if (!subsRes.ok) {
    console.error(`❌ Failed to fetch subscriptions: ${subsRes.status}`);
    process.exit(1);
  }

  const subs = await subsRes.json();
  console.log(`✅ Found ${subs.count} subscription(s)`);

  if (subs.count === 0) {
    console.log('\n⚠️  No push subscriptions found for this user.');
    console.log('   → Open the app in a browser, log in, and allow notifications when prompted.');
    console.log('   → Then run this script again.\n');
    process.exit(0);
  }

  subs.endpoints.forEach((ep: string, i: number) => {
    console.log(`   [${i + 1}] ${ep}`);
  });

  // Step 3: Send test notification
  process.stdout.write(`\n3. Sending push notification...\n   Title: "${title}"\n   Body:  "${body}"\n   → `);

  const testRes = await fetch(`${BASE_URL}/notifications/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({ title, body }),
  });

  if (!testRes.ok) {
    const err = await testRes.json().catch(() => ({ message: testRes.statusText }));
    console.error(`❌ Failed: ${err.message}`);
    process.exit(1);
  }

  const result = await testRes.json();
  console.log(`✅ Sent to ${result.subscriptionsReached}/${subs.count} device(s)\n`);

  if (result.subscriptionsReached === 0 && subs.count > 0) {
    console.log('⚠️  0 subscriptions reached — the push endpoint may have expired.');
    console.log('   → Re-subscribe in the browser (notifications permission prompt).\n');
  } else {
    console.log('✅ Success! Check your browser/device for the notification.\n');
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
