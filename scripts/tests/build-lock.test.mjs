import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createBuildLock } from "../build-lock.mjs";

const lockPath = (dir) => path.join(dir, ".compose-lock");
const writeLock = (dir, lock) => fs.writeFileSync(lockPath(dir), JSON.stringify(lock));
const readLock = (dir) => JSON.parse(fs.readFileSync(lockPath(dir), "utf8"));

test("build lock is exclusive and fails closed on contention", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
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

test("a stale lock is stolen and leaves no debris", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  // A lock left by a crashed build seven hours ago is stolen.
  writeLock(dir, { pid: 1, startedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString() });
  const thief = createBuildLock(dir, { pid: 2 });
  thief.acquire();
  assert.equal(readLock(dir).pid, 2, "stale lock must be stolen");
  assert.deepEqual(fs.readdirSync(dir).filter((n) => n.startsWith(".compose-lock.")), [], "steal must not leave debris");
  thief.release();
  assert.equal(fs.existsSync(lockPath(dir)), false);
});

test("a fresh lock fails closed without entering the steal path", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const fresh = { pid: 3, startedAt: new Date().toISOString() };
  writeLock(dir, fresh);
  const contender = createBuildLock(dir, { pid: 2 });
  assert.throws(() => contender.acquire(), /Another compose is building this Site revision/);
  assert.deepEqual(readLock(dir), fresh, "a live holder's lock must not be evicted");
  assert.deepEqual(fs.readdirSync(dir).filter((n) => n.startsWith(".compose-lock.")), [], "failed steals must not leave debris");
});

test("a steal whose stolen bytes changed mid-flight is restored, not destroyed", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const observed = { pid: 1, token: "stale-observed", startedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString() };
  writeLock(dir, observed);
  // The readFileSync mock simulates the rename-to-verify interleaving
  // without real concurrent processes.
  const realReadFileSync = fs.readFileSync;
  t.mock.method(fs, "readFileSync", (file, options) => {
    const data = realReadFileSync(file, options);
    if (typeof file === "string" && file.includes(".compose-lock.stealing-")) {
      return JSON.stringify({ ...JSON.parse(data), token: "live-holder" });
    }
    return data;
  });
  const contender = createBuildLock(dir, { pid: 2 });
  assert.throws(() => contender.acquire(), /Another compose is building this Site revision/);
  assert.equal(readLock(dir).token, "stale-observed", "the observed bytes must be restored, never destroyed");
  assert.deepEqual(fs.readdirSync(dir).filter((n) => n.startsWith(".compose-lock.")), [], "restore must not leave debris");
});

test("build lock release never removes a replaced lock, even from the same pid", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const holder = createBuildLock(dir, { pid: 1 });
  holder.acquire();
  // Writing the successor's lock directly simulates a later acquire by the
  // same pid already holding it when the first instance releases.
  writeLock(dir, { pid: 1, token: "later-acquire", startedAt: new Date().toISOString() });
  holder.release();
  assert.equal(readLock(dir).token, "later-acquire", "release must not delete a same-pid successor's lock");
  // A release from a lock that never acquired here is also a no-op.
  createBuildLock(dir, { pid: 2 }).release();
  assert.equal(fs.existsSync(lockPath(dir)), true, "a non-holder's release must not remove the lock");
});
