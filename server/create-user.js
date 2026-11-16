// Usage:
//   npm run user:create -- you@example.com            (prompts for a password)
//   npm run user:create -- you@example.com --generate (random password saved to data/)
//   add --reset to change the password of an existing user
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { MIN_PASSWORD, createUser, findUserByEmail, setPassword } from './auth.js';

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith('--'));
const generate = args.includes('--generate') || !process.stdin.isTTY;
const reset = args.includes('--reset');

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run user:create -- <email> [--generate] [--reset]');
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => rl.output.write(s.startsWith(question) ? s : '');
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const existing = findUserByEmail(email);
if (existing && !reset) {
  console.error(`A user with email ${email} already exists. Pass --reset to set a new password.`);
  process.exit(1);
}

let password;
if (generate) {
  password = randomBytes(15).toString('base64url');
} else {
  password = await askHidden('Password: ');
  if (password.length < MIN_PASSWORD) {
    console.error(`Password must be at least ${MIN_PASSWORD} characters.`);
    process.exit(1);
  }
  if ((await askHidden('Confirm password: ')) !== password) {
    console.error('Passwords did not match.');
    process.exit(1);
  }
}

if (existing) await setPassword(existing.id, password);
else await createUser(email, password);

if (generate) {
  const file = 'data/initial-password.txt';
  writeFileSync(file, `${email}\n${password}\n`, { mode: 0o600 });
  console.log(`${existing ? 'Password reset' : 'User created'} for ${email}.`);
  console.log(`A generated password was written to ${file}. Sign in, change it, then delete that file.`);
} else {
  console.log(`${existing ? 'Password updated' : 'User created'} for ${email}.`);
}
