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
  const first = createBuildLock(dir, { pid: process.pid });
  first.acquire();
  assert.equal(readLock(dir).pid, process.pid);
  assert.match(readLock(dir).startedAt, /^\d{4}-\d{2}-\d{2}T/);
  const second = createBuildLock(dir, { pid: 2 });
  assert.throws(() => second.acquire(), /Another compose is building this Site revision/);
  // The rejected contender must not have damaged the holder's lock.
  assert.equal(readLock(dir).pid, process.pid);
  first.release();
  assert.equal(fs.existsSync(lockPath(dir)), false, "release must remove the holder's own lock");
});

test("stale lock requires explicit operator recovery", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const stale = { pid: 99999999, token: "stale", startedAt: new Date().toISOString() };
  writeLock(dir, stale);
  const contender = createBuildLock(dir, { pid: 2 });
  assert.throws(() => contender.acquire(), /Stale compose lock/);
  assert.deepEqual(readLock(dir), stale, "automatic recovery must not move or remove a possibly replaced lock");
  assert.deepEqual(fs.readdirSync(dir).filter((name) => name.startsWith(".compose-lock.")), [], "failed recovery must not leave staging files");

  fs.rmSync(lockPath(dir)); // Simulate an operator verifying the stale PID and removing the lock.
  contender.acquire();
  assert.equal(readLock(dir).pid, 2);
  contender.release();
  assert.equal(fs.existsSync(lockPath(dir)), false);
});

test("a live successor replacing a stale lock is never moved", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  writeLock(dir, { pid: 99999999, token: "stale-observed", startedAt: new Date().toISOString() });
  const live = { pid: process.pid, token: "live-holder", startedAt: new Date().toISOString() };
  const realKill = process.kill;
  let replaced = false;
  t.mock.method(process, "kill", (pid, signal) => {
    if (!replaced) {
      replaced = true;
      writeLock(dir, live);
      const error = new Error("simulated stale owner");
      error.code = "ESRCH";
      throw error;
    }
    return realKill(pid, signal);
  });
  const contender = createBuildLock(dir, { pid: 2 });
  assert.throws(() => contender.acquire(), /Stale compose lock/);
  assert.equal(readLock(dir).token, "live-holder", "the replacement lock must remain at lockPath");
  assert.deepEqual(fs.readdirSync(dir).filter((name) => name.startsWith(".compose-lock.")), [], "rejected recovery must not leave debris");
});

test("build lock release never removes a replaced lock, even from the same pid", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const holder = createBuildLock(dir, { pid: process.pid });
  holder.acquire();
  writeLock(dir, { pid: process.pid, token: "later-acquire", startedAt: new Date().toISOString() });
  assert.equal(readLock(dir).token, "later-acquire", "release must not delete a same-pid successor's lock");
  // A release from a lock that never acquired here is also a no-op.
  createBuildLock(dir, { pid: 2 }).release();
  assert.equal(fs.existsSync(lockPath(dir)), true, "a non-holder's release must not remove the lock");
});
