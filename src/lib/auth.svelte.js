import { api, setUnauthorizedHandler } from './api.js';
import { db, loadData, resetLocal, replaceAll, flash } from './db.svelte.js';

// status: 'loading' | 'signed-out' | 'signed-in'
export const auth = $state({ status: 'loading', user: null });

function signedOut() {
  auth.user = null;
  auth.status = 'signed-out';
  resetLocal();
}

setUnauthorizedHandler(signedOut);

async function enter(user) {
  await loadData();
  auth.user = user;
  auth.status = 'signed-in';
  offerBrowserImport();
}

// The first version of this app kept data in localStorage. Offer to move it
// into the database once, if the account is still empty.
const LEGACY_KEY = 'freelance-crm-v1';
async function offerBrowserImport() {
  let legacy;
  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null');
  } catch {
    return;
  }
  if (!legacy) return;
  const empty = !db.companies.length && !db.contacts.length && !db.leads.length;
  if (!empty) return;
  const count = ['companies', 'contacts', 'leads'].reduce((n, k) => n + (legacy[k]?.length ?? 0), 0);
  if (!count) return;
  // Let the app render first so the prompt isn't shown over a blank screen.
  await new Promise((r) => setTimeout(r, 50));
  if (confirm(`Found ${count} records saved in this browser from before. Import them into your account?`)) {
    try {
      await replaceAll(legacy);
      localStorage.removeItem(LEGACY_KEY);
      flash('Imported your browser data.');
    } catch (err) {
      flash(`Import failed: ${err.message}`);
    }
  } else {
    localStorage.removeItem(LEGACY_KEY);
  }
}

export async function init() {
  try {
    const { user } = await api('GET', '/api/me');
    await enter(user);
  } catch {
    signedOut();
  }
}

export async function login(email, password) {
  const { user } = await api('POST', '/api/login', { email, password });
  await enter(user);
}

export async function logout() {
  await api('POST', '/api/logout').catch(() => {});
  signedOut();
}

export const changePassword = (current, next) => api('POST', '/api/password', { current, next });
