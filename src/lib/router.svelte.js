// Tiny hash router: #/contacts/abc?x=1 -> parts ['contacts', 'abc'], query { x: '1' }
const current = () => location.hash.replace(/^#/, '') || '/';

let path = $state(current());

// A page with unsaved changes can register a blocker that may cancel navigation.
let blocker = null;
let reverting = false;

window.addEventListener('hashchange', (e) => {
  if (reverting) {
    reverting = false;
    return;
  }
  if (blocker && !blocker()) {
    reverting = true;
    location.hash = new URL(e.oldURL).hash;
    return;
  }
  path = current();
});

export const router = {
  get path() {
    return path;
  },
  get parts() {
    return path.split('?')[0].split('/').filter(Boolean);
  },
  get query() {
    return Object.fromEntries(new URLSearchParams(path.split('?')[1] ?? ''));
  }
};

export function go(to, { replace = false } = {}) {
  if (replace) location.replace(`#${to}`);
  else location.hash = to;
}

/** Register a navigation guard; returns a function that removes it. */
export function setBlocker(fn) {
  blocker = fn;
  return () => {
    if (blocker === fn) blocker = null;
  };
}
