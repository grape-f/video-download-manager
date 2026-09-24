import { Router, type Request } from 'express';
import {
  clearSyncedCookies,
  getCookieAuthStatus,
  getPairingToken,
  saveSyncedCookies,
  validatePairingToken,
} from '../services/cookieAuth';
import { AppError } from '../utils/errors';
import { wrap } from '../utils/asyncHandler';

const router = Router();
const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const PAIRING_FAILURE_LIMIT = 10;
const PAIRING_FAILURE_WINDOW_MS = 60_000;
const pairingFailures = new Map<string, number[]>();

function clientAddress(req: Request): string {
  return req.socket.remoteAddress || req.ip || 'unknown';
}

function isLoopback(req: Request): boolean {
  const raw = clientAddress(req);
  const normalized = raw.replace(/^::ffff:/, '');
  return LOOPBACK_ADDRESSES.has(raw) || LOOPBACK_ADDRESSES.has(normalized);
}

function requireLoopback(req: Request): void {
  if (!isLoopback(req)) {
    throw new AppError('FORBIDDEN', '该接口只允许本机访问', 403);
  }
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (pairingFailures.get(ip) || []).filter(
    (at) => now - at < PAIRING_FAILURE_WINDOW_MS,
  );
  pairingFailures.set(ip, recent);
  return recent.length >= PAIRING_FAILURE_LIMIT;
}

function registerFailure(ip: string): void {
  const now = Date.now();
  const recent = (pairingFailures.get(ip) || []).filter(
    (at) => now - at < PAIRING_FAILURE_WINDOW_MS,
  );
  recent.push(now);
  pairingFailures.set(ip, recent);
}

function requireToken(req: Request): void {
  const ip = clientAddress(req);
  if (isRateLimited(ip)) {
    throw new AppError('RATE_LIMITED', '配对尝试次数过多，请稍后重试', 429);
  }
  if (!validatePairingToken(req.header('x-pairing-token') || undefined)) {
    registerFailure(ip);
    throw new AppError('UNAUTHORIZED', '配对 token 无效', 401);
  }
}

router.get(
  '/auth/status',
  wrap(async (req, res) => {
    requireLoopback(req);
    res.json({ status: getCookieAuthStatus(), token: getPairingToken() });
  }),
);

router.get(
  '/auth/ping',
  wrap(async (req, res) => {
    requireLoopback(req);
    requireToken(req);
    res.json({ ok: true });
  }),
);

router.post(
  '/auth/cookies',
  wrap(async (req, res) => {
    requireLoopback(req);
    requireToken(req);
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    if (!content) throw new AppError('INVALID', 'cookies 内容为空', 400);
    res.json({ ok: true, status: saveSyncedCookies(content) });
  }),
);

router.delete(
  '/auth/cookies',
  wrap(async (req, res) => {
    requireLoopback(req);
    requireToken(req);
    clearSyncedCookies();
    res.json({ ok: true, status: getCookieAuthStatus() });
  }),
);

export default router;
