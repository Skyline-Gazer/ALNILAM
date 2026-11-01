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
        const token = randomUUID();
        // A unique staging name per attempt: two acquires in the same process
        // (or a retry) must never rewrite or delete each other's staged file.
        const staged = `${lockPath}.staging-${pid}-${randomUUID()}`;
        fs.writeFileSync(staged, JSON.stringify({ pid, token, startedAt: new Date().toISOString() }));
        try {
          try {
            // link fails with EEXIST while the lock exists, and publishes the
            // fully written file atomically — readers never see an empty or
            // half-written lock from a killed acquire.
            fs.linkSync(staged, lockPath);
            ownedToken = token;
            return;
          } catch (err) {
            if (err.code === "ENOENT") continue; // staging was removed under us; retry with a fresh name
            if (err.code !== "EEXIST") throw err;
            const observed = readLock(lockPath);
            if (observed === null || !isStale(observed, staleMs)) {
              throw new Error("Another compose is building this Site revision (build state is locked)");
            }
            // A unique name per attempt: renameSync would silently overwrite
            // an existing target, which could destroy another acquire's
            // evicted bytes instead of only moving ours.
            const stolenPath = `${lockPath}.stealing-${pid}-${randomUUID()}`;
            // Claim the eviction atomically: after this rename lockPath is
            // gone and whatever lived there is only at stolenPath.
            try {
              fs.renameSync(lockPath, stolenPath);
            } catch {
              // lockPath was untouched (rename is atomic on failure); the
              // bounded retry budget still applies, so this cannot spin.
              continue;
            }
            // Whatever we moved must be the stale bytes we observed. A live
            // holder may have recreated the lock between our read and the
            // rename — the moved bytes then carry a different token.
            const moved = readLock(stolenPath);
            if (moved && moved.token === observed.token) {
              fs.rmSync(stolenPath, { force: true });
              continue;
            }
            // We moved bytes we cannot prove were stale: give them back.
            for (let restore = 0; restore < MAX_STEAL_ATTEMPTS; restore++) {
              try {
                fs.renameSync(stolenPath, lockPath);
                break;
              } catch {
                // lockPath was taken meanwhile; the evicted bytes stay
                // recoverable at the unique stolenPath until the restore
                // lands — never deleted, never overwritten.
              }
            }
            continue;
          }
        } finally {
          fs.rmSync(staged, { force: true });
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
