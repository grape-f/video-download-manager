import { dedupeCookies, toNetscape } from './netscape.js';

const DEFAULT_SERVER = 'http://127.0.0.1:8787';
const STORAGE_KEY = 'vdm-cookie-sync';
const PLATFORMS = [
  { key: 'youtube', label: 'YouTube', domains: ['youtube.com', 'google.com'] },
  { key: 'instagram', label: 'Instagram', domains: ['instagram.com', 'facebook.com'] },
  { key: 'tiktok', label: 'TikTok', domains: ['tiktok.com'] },
];

const serverInput = document.getElementById('server');
const tokenInput = document.getElementById('token');
const statusEl = document.getElementById('status');
const saveButton = document.getElementById('save');
const pingButton = document.getElementById('ping');
const syncButton = document.getElementById('sync');

function setStatus(message, kind = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`.trim();
}

function isLocalServer(value) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      ['127.0.0.1', 'localhost', '::1'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const settings = stored[STORAGE_KEY] || {};
  serverInput.value = settings.server || DEFAULT_SERVER;
  tokenInput.value = settings.token || '';
}

async function saveSettings() {
  const server = serverInput.value.trim() || DEFAULT_SERVER;
  const token = tokenInput.value.trim();
  if (!isLocalServer(server)) {
    setStatus('服务地址必须是 127.0.0.1 或 localhost，避免 cookies 被发到外部。', 'error');
    return false;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: { server, token } });
  setStatus('已保存。', 'success');
  return true;
}

async function readCookies() {
  const all = [];
  for (const platform of PLATFORMS) {
    for (const domain of platform.domains) {
      const cookies = await chrome.cookies.getAll({ domain });
      all.push(...cookies);
    }
  }
  return dedupeCookies(all);
}

async function ping() {
  if (!(await saveSettings())) return;
  const server = serverInput.value.trim() || DEFAULT_SERVER;
  const token = tokenInput.value.trim();
  if (!token) {
    setStatus('请先填入配对 token。', 'error');
    return;
  }
  try {
    const response = await fetch(`${server}/api/auth/ping`, {
      headers: { 'X-Pairing-Token': token },
    });
    if (response.ok) {
      setStatus('连接成功，token 有效。', 'success');
      return;
    }
    setStatus(response.status === 401 ? '配对 token 无效。' : `连接失败：HTTP ${response.status}`, 'error');
  } catch {
    setStatus('无法连接本地服务，请确认后端已启动。', 'error');
  }
}

async function sync() {
  if (!(await saveSettings())) return;
  const server = serverInput.value.trim() || DEFAULT_SERVER;
  const token = tokenInput.value.trim();
  if (!token) {
    setStatus('请先填入配对 token。', 'error');
    return;
  }

  syncButton.disabled = true;
  try {
    const cookies = await readCookies();
    if (cookies.length === 0) {
      setStatus('没有读到 cookies，请先在 Edge 登录 YouTube / Instagram / TikTok。', 'error');
      return;
    }

    const content = toNetscape(cookies);
    const response = await fetch(`${server}/api/auth/cookies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Pairing-Token': token },
      body: JSON.stringify({ content }),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus(result?.error?.message || `同步失败：HTTP ${response.status}`, 'error');
      return;
    }

    const count = result?.status?.cookieCount ?? cookies.length;
    const domains = result?.status?.domains ?? [];
    setStatus(`同步成功：${count} 条 cookies${domains.length ? `\n域名：${domains.join('、')}` : ''}`, 'success');
  } catch {
    setStatus('无法连接本地服务，请确认后端已启动。', 'error');
  } finally {
    syncButton.disabled = false;
  }
}

saveButton.addEventListener('click', () => void saveSettings());
pingButton.addEventListener('click', () => void ping());
syncButton.addEventListener('click', () => void sync());
void loadSettings();
