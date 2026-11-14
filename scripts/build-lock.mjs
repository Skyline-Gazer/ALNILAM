// Advisory lock over a shared build-state directory. Contention fails fast.
// Stale locks require explicit operator recovery; automatic eviction cannot
// safely preserve exclusion with portable filesystem primitives.
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
 * acquire() exclusively creates the lock and fails closed if one already
 * exists, including a stale lock. release() removes only its own token.
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
            if (observed === null) {
              throw new Error("Unverifiable build lock; refusing automatic recovery: " + lockPath);
            }
            if (isStale(observed)) {
              throw new Error(
                `Stale compose lock (pid ${observed.pid}); verify no ALNILAM build is active, then remove it manually: ${lockPath}`,
              );
            }
            throw new Error("Another compose is building this Site revision (build state is locked)");
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
