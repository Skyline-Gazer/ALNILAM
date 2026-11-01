import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createBuildLock } from "../build-lock.mjs";

const lockPath = (dir) => path.join(dir, ".compose-lock");
const writeLock = (dir, lock) => fs.writeFileSync(lockPath(dir), JSON.stringify(lock));
const readLock = (dir) => JSON.parse(fs.readFileSync(lockPath(dir), "utf8"));

test("build lock is exclusive and fails closed on contention", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  fs.rmSync(dir, { recursive: true, force: true });
  // acquire creates the directory and an exclusive lock file.
  const first = createBuildLock(dir, { pid: 1 });
  first.acquire();
  assert.equal(readLock(dir).pid, 1);
  assert.match(readLock(dir).startedAt, /^\d{4}-\d{2}-\d{2}T/);
  const second = createBuildLock(dir, { pid: 2 });
  assert.throws(() => second.acquire(), /Another compose is building this Site revision/);
  // The rejected contender must not have damaged the holder's lock.
  assert.equal(readLock(dir).pid, 1);
  first.release();
  assert.equal(fs.existsSync(lockPath(dir)), false, "release must remove the holder's own lock");
});

test("build lock steals a stale lock and never evicts a live holder", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  // A lock left by a crashed build seven hours ago is stolen.
  writeLock(dir, { pid: 1, startedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString() });
  const thief = createBuildLock(dir, { pid: 2 });
  thief.acquire();
  assert.equal(readLock(dir).pid, 2, "stale lock must be stolen");
  assert.equal(fs.existsSync(lockPath(dir) + ".stealing-2"), false, "steal must not leave debris");
  thief.release();
  assert.equal(fs.existsSync(lockPath(dir)), false);
});

test("a fresh lock is never stolen, even when staleness would allow it", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  // A live holder recreated its lock after the contender observed a stale
  // file (the steal's TOCTOU window). The contender must verify the moved
  // bytes and fail closed instead of evicting the fresh lock.
  const fresh = { pid: 3, startedAt: new Date().toISOString() };
  writeLock(dir, fresh);
  const contender = createBuildLock(dir, { pid: 2 });
  assert.throws(() => contender.acquire(), /Another compose is building this Site revision/);
  assert.deepEqual(readLock(dir), fresh, "a live holder's lock must not be evicted");
  assert.equal(fs.existsSync(lockPath(dir) + ".stealing-2"), false);
});

test("build lock release never removes a replaced lock", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  const holder = createBuildLock(dir, { pid: 1 });
  holder.acquire();
  // Another holder takes over the lock file (e.g. after a steal); our release
  // must be a no-op so the replacement survives.
  writeLock(dir, { pid: 9, startedAt: new Date().toISOString() });
  holder.release();
  assert.equal(readLock(dir).pid, 9, "release must not delete another holder's lock");
  // (The real holder's own release removing the lock is covered by the
  // exclusivity test above; here the replacement must simply survive.)
  assert.equal(fs.existsSync(lockPath(dir)), true);
});
