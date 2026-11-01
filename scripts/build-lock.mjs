// Advisory lock over a Core checkout's shared build state (apps/web/.astro).
// Concurrent composes would otherwise delete and rewrite the Astro content
// store and prerender chunks under each other. Contention fails fast; a lock
// left by a crashed build older than `staleMs` is stolen by atomic rename with
// content verification, so a lock recreated by a live holder is never evicted.
import fs from "node:fs";
import path from "node:path";

export const BUILD_LOCK_STALE_MS = 6 * 60 * 60 * 1000;

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
 * - acquire(): exclusive-create; on an existing fresh lock it fails closed;
 *   on a stale lock it steals via rename, but only after verifying the moved
 *   bytes are the stale ones it observed (a recreated lock is renamed back).
 * - release(): removes the lock file only if it still holds our own pid, so a
 *   replaced lock belonging to another holder is never deleted.
 */
export function createBuildLock(dir, { staleMs = BUILD_LOCK_STALE_MS, pid = process.pid } = {}) {
  const lockPath = path.join(dir, ".compose-lock");
  let owned = false;
  return {
    acquire() {
      fs.mkdirSync(dir, { recursive: true });
      for (let attempts = 0; ; attempts++) {
        try {
          const fd = fs.openSync(lockPath, "wx");
          fs.writeSync(fd, JSON.stringify({ pid, startedAt: new Date().toISOString() }));
          fs.closeSync(fd);
          owned = true;
          return;
        } catch (err) {
          if (err.code !== "EEXIST") throw err;
          const current = readLock(lockPath);
          if (current === null || !isStale(current, staleMs) || attempts >= 10) {
            throw new Error("Another compose is building this Site revision (build state is locked)");
          }
          const stolenPath = `${lockPath}.stealing-${pid}`;
          let stolen = null;
          try {
            fs.renameSync(lockPath, stolenPath);
            stolen = readLock(stolenPath);
          } catch {
            continue;
          }
          if (stolen && stolen.pid === current.pid && stolen.startedAt === current.startedAt) {
            fs.rmSync(stolenPath, { force: true });
            continue;
          }
          // The lock was recreated between our read and the rename: give the
          // evicted bytes back instead of evicting a live holder's lock.
          try {
            fs.renameSync(stolenPath, lockPath);
          } catch {
            // lockPath was taken meanwhile; the retry re-evaluates from scratch.
          }
        }
      }
    },
    release() {
      if (!owned) return;
      owned = false;
      const current = readLock(lockPath);
      if (current && current.pid === pid) fs.rmSync(lockPath, { force: true });
    },
  };
}
