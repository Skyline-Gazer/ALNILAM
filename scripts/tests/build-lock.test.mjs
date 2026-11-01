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

test("build lock release never removes a replaced lock, even from the same pid", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  const holder = createBuildLock(dir, { pid: 1 });
  holder.acquire();
  // A later acquire by the SAME pid (module reuse, sequential composes) takes
  // over the lock file with its own token; the first instance's release must
  // be a no-op because only the token identifies ownership.
  writeLock(dir, { pid: 1, token: "later-acquire", startedAt: new Date().toISOString() });
  holder.release();
  assert.equal(readLock(dir).token, "later-acquire", "release must not delete a same-pid successor's lock");
  // The token owner's release removes it; an unrelated release is a no-op.
  createBuildLock(dir, { pid: 2 }).release();
  assert.equal(fs.existsSync(lockPath(dir)), true, "a non-holder's release must not remove the lock");
  const owner = createBuildLock(dir, { pid: 1 });
  fs.rmSync(lockPath(dir));
  owner.acquire();
  owner.release();
});
