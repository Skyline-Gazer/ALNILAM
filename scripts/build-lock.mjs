// Advisory lock over a shared build-state directory. Contention fails fast;
// a lock is reclaimable only after its holder process is confirmed absent.
// Elapsed time alone never makes an active build safe to evict.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";


const MAX_STEAL_ATTEMPTS = 10;

function readLock(lockPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    return typeof parsed?.pid === "number" && typeof parsed?.startedAt === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

function isStale(lock) {
  if (!Number.isInteger(lock.pid) || lock.pid <= 0) return false;
  return !processIsAlive(lock.pid);
}

/**
 * Returns { acquire, release } for `dir/lockName` (default `.compose-lock`).
 * acquire() exclusively creates the lock or reclaims it only after confirming
 * the recorded holder process has exited. Reclamation uses a unique atomic
 * rename and verifies the moved token. release() removes only its own token.
 */
export function createBuildLock(dir, { pid = process.pid, lockName = ".compose-lock" } = {}) {
  const lockPath = path.join(dir, lockName);
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
            if (observed === null || !isStale(observed)) {
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
