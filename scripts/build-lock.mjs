// Advisory lock over a Core checkout's shared build state (apps/web/.astro).
// Concurrent composes would otherwise delete and rewrite the Astro content
// store and prerender chunks under each other. Contention fails fast; a lock
// left by a crashed build older than `staleMs` is stolen by atomic rename with
// content verification, so a lock recreated by a live holder is never evicted.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const BUILD_LOCK_STALE_MS = 6 * 60 * 60 * 1000;

const MAX_STEAL_ATTEMPTS = 10;

function readLock(lockPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    return typeof parsed?.pid === "number" && typeof parsed?.startedAt === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function isStale(lock, staleMs) {
  return Number.isFinite(Date.parse(lock.startedAt)) && Date.now() - Date.parse(lock.startedAt) >= staleMs;
}

/**
 * Returns { acquire, release } for `dir/.compose-lock`.
 * - acquire(): exclusive-create with a unique per-attempt token; on an existing
 *   fresh lock it fails closed; on a stale lock it steals via rename, but only
 *   after verifying the moved bytes are the stale ones it observed (a recreated
 *   lock is renamed back). Every steal retry is bounded so a persistently
 *   failing rename cannot spin.
 * - release(): removes the lock file only if it still holds the token this
 *   instance wrote, so a replaced lock belonging to another holder (even the
 *   same pid reused by a later acquire) is never deleted.
 */
export function createBuildLock(dir, { staleMs = BUILD_LOCK_STALE_MS, pid = process.pid } = {}) {
  const lockPath = path.join(dir, ".compose-lock");
  let ownedToken = null;
  return {
    acquire() {
      fs.mkdirSync(dir, { recursive: true });
      for (let attempts = 0; attempts < MAX_STEAL_ATTEMPTS; attempts++) {
        try {
          const fd = fs.openSync(lockPath, "wx");
          const lock = { pid, token: randomUUID(), startedAt: new Date().toISOString() };
          fs.writeSync(fd, JSON.stringify(lock));
          fs.closeSync(fd);
          ownedToken = lock.token;
          return;
        } catch (err) {
          if (err.code !== "EEXIST") throw err;
          const current = readLock(lockPath);
          if (current === null || !isStale(current, staleMs)) {
            throw new Error("Another compose is building this Site revision (build state is locked)");
          }
          const stolenPath = `${lockPath}.stealing-${pid}-${attempts}`;
          let stolen = null;
          try {
            fs.renameSync(lockPath, stolenPath);
            stolen = readLock(stolenPath);
          } catch {
            // The steal failed (permissions, ENOSPC, ...); the bounded retry
            // budget still applies, so this cannot spin forever.
            continue;
          }
          if (stolen && stolen.token === current.token) {
            fs.rmSync(stolenPath, { force: true });
            continue;
          }
          // The lock was recreated between our read and the rename: give the
          // evicted bytes back instead of evicting a live holder's lock.
          try {
            fs.renameSync(stolenPath, lockPath);
          } catch {
            // lockPath was taken meanwhile; the next attempt re-evaluates.
          }
        }
      }
      throw new Error("Another compose is building this Site revision (build state is locked)");
    },
    release() {
      if (ownedToken === null) return;
      const token = ownedToken;
      ownedToken = null;
      const current = readLock(lockPath);
      if (current && current.token === token) fs.rmSync(lockPath, { force: true });
    },
  };
}
