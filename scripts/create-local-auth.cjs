/**
 * Run from the music_stream_app project root:
 *   set LOCAL_AUTH_PASSWORD=YourLocalTestPassword123!
 *   node create-local-auth.cjs
 *
 * Creates data/local/auth.json for use with Firebase Auth Emulator.
 * This does NOT import users into the emulator; your Auth seed must read auth.json.
 */
const fs = require('node:fs');
const path = require('node:path');

const dir = path.resolve(process.cwd(), 'data', 'local');
const input = path.join(dir, 'users.json');
const output = path.join(dir, 'auth.json');
const password = process.env.LOCAL_AUTH_PASSWORD;

if (!password || password.length < 6) {
  console.error('Set LOCAL_AUTH_PASSWORD to a test password of at least 6 characters.');
  process.exit(1);
}
if (!fs.existsSync(input)) {
  console.error('Missing ' + input);
  process.exit(1);
}
if (fs.existsSync(output)) {
  console.error('auth.json already exists. Back it up or remove it before regenerating.');
  process.exit(1);
}

let raw;
try { raw = JSON.parse(fs.readFileSync(input, 'utf8')); }
catch (e) { console.error('Invalid users.json:', e.message); process.exit(1); }

const list = Array.isArray(raw) ? raw : (Array.isArray(raw.users) ? raw.users : Array.isArray(raw.documents) ? raw.documents : null);
if (!list) {
  console.error('Expected users.json to contain an array, {users:[...]}, or {documents:[...]}.');
  process.exit(1);
}
const auth = [];
const ids = new Set();
const emails = new Set();
for (let i = 0; i < list.length; i++) {
  const item = list[i];
  const data = item?.data && typeof item.data === 'object' ? item.data : item;
  const uid = String(item?.uid ?? data?.uid ?? item?.id ?? data?.id ?? '').trim();
  if (!uid || uid.includes('/')) throw new Error(`Missing/invalid uid or id at users[${i}]; check its structure before creating Auth accounts`);
  const email = String(data?.email ?? `${uid.replace(/[^a-zA-Z0-9._-]/g, '_')}@example.test`).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Invalid email at users[${i}]: ${email}`);
  if (ids.has(uid) || emails.has(email)) throw new Error(`Duplicate UID/email at users[${i}]: ${uid}, ${email}`);
  ids.add(uid); emails.add(email);
  auth.push({
    uid,
    email,
    displayName: String(data?.displayName ?? data?.name ?? '').trim(),
    password,
    emailVerified: true,
    disabled: false
  });
}
fs.writeFileSync(output, JSON.stringify(auth, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
console.log(`Created ${output} with ${auth.length} Auth Emulator accounts.`);
console.log('IMPORTANT: auth.json contains local test passwords; do not commit or upload it.');
console.log('Creating auth.json does NOT register accounts in Firebase Auth Emulator.');
