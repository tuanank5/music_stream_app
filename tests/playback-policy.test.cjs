const { test } = require("node:test");
require("./helpers/register-local.cjs");
const assert = require("node:assert/strict");
const {
  advancePlayback,
  mayCountPlayback,
} = require("../tools/backend/playback-policy.cjs");
const ranges = (start, end) =>
  Array.from({ length: Math.ceil((end - start) / 2) }, (_, index) => [
    start + index * 2,
    Math.min(end, start + index * 2 + 2),
  ]);
test("playback counts 30 valid seconds and enforces per-user/song receipt cooldown", () => {
  const state = advancePlayback(
    null,
    { sequence: 1, progressSeconds: 30, ranges: ranges(0, 30) },
    100,
    30,
  );
  assert.equal(state.listenedSeconds, 30);
  assert.equal(state.completed, false);
  assert.equal(mayCountPlayback(state, 100, false, 100000), true);
  assert.equal(mayCountPlayback(state, 100, true, 100000), false);
  assert.equal(mayCountPlayback(state, 100, false, 100000, 70001), false);
  assert.equal(mayCountPlayback(state, 100, false, 100000, 70000), true);
});
test("seek to end and repeatedly listening to one segment cannot fake 80 percent coverage", () => {
  let state = advancePlayback(
    null,
    { sequence: 1, progressSeconds: 100, ranges: [] },
    100,
    100,
  );
  assert.equal(state.completed, false);
  for (let sequence = 2; sequence < 45; sequence++)
    state = advancePlayback(
      state,
      { sequence, progressSeconds: 100, ranges: [[0, 2]] },
      100,
      2,
    );
  assert.ok(state.listenedSeconds > 80);
  assert.deepEqual(state.coverage, [[0, 2]]);
  assert.equal(state.completed, false);
});
test("short tracks require coverage and reaching end; completion remains sticky", () => {
  let state = advancePlayback(
    null,
    { sequence: 1, progressSeconds: 8, ranges: ranges(0, 8) },
    10,
    8,
  );
  assert.equal(state.completed, false);
  state = advancePlayback(
    state,
    { sequence: 2, progressSeconds: 10, ranges: [[8, 10]] },
    10,
    2,
  );
  assert.equal(state.completed, true);
  assert.equal(mayCountPlayback(state, 10, false, 100000), true);
  assert.equal(mayCountPlayback(state, 10, false, 100000, 99000), false);
  state = advancePlayback(
    state,
    { sequence: 3, progressSeconds: 0, ranges: [] },
    10,
    0,
  );
  assert.equal(state.completed, true);
});
test("duplicate packets cannot add time; invalid jumps/order/client-completed/time are rejected", () => {
  const packet = { sequence: 1, progressSeconds: 2, ranges: [[0, 2]] };
  const state = advancePlayback(null, packet, 100, 2);
  assert.equal(advancePlayback(state, packet, 100, 0), state);
  assert.throws(
    () => advancePlayback(state, { ...packet, sequence: 3 }, 100, 2),
    { status: 409 },
  );
  for (const invalid of [
    { ...packet, ranges: [[0, 50]] },
    { ...packet, completed: true },
    { ...packet, progressSeconds: NaN },
    { ...packet, ranges: [[-1, 0]] },
  ])
    assert.throws(() => advancePlayback(null, invalid, 100, 100), {
      status: 400,
    });
  assert.throws(() => advancePlayback(null, packet, 100, 1), { status: 400 });
});

test("client telemetry retries exact packet and preserves samples queued during failure", async () => {
  const { createPlaybackQueue } = require("../src/utils/playbackQueue.ts");
  const sent = [];
  let failing = true;
  const queue = createPlaybackQueue(
    "song",
    () => "session",
    async (id, packet) => {
      sent.push(JSON.parse(JSON.stringify({ id, packet })));
      if (packet.sequence === 1 && failing) throw Error("offline");
    },
  );
  await queue.flush();
  queue.sample(2, [0, 2]);
  await assert.rejects(queue.flush(), /offline/);
  queue.sample(4, [2, 4]);
  failing = false;
  await queue.flush();
  assert.deepEqual(sent[1], sent[2]);
  await queue.flush();
  assert.equal(sent[3].packet.sequence, 2);
  assert.deepEqual(sent[3].packet.ranges, [[2, 4]]);
});
test("expired server session creates new ID and discards old coverage samples", async () => {
  const { createPlaybackQueue } = require("../src/utils/playbackQueue.ts");
  const sent = [];
  let counter = 0;
  const queue = createPlaybackQueue(
    "song",
    () => "session-" + ++counter,
    async (id, packet) => {
      sent.push(JSON.parse(JSON.stringify({ id, packet })));
      if (id === "session-1" && packet.sequence === 1)
        throw Object.assign(Error("expired"), { status: 409 });
    },
  );
  await queue.flush();
  queue.sample(2, [0, 2]);
  await assert.rejects(queue.flush(), { status: 409 });
  assert.equal(sent[2].id, "session-2");
  assert.equal(sent[2].packet.sequence, 0);
  queue.sample(4, [2, 4]);
  await queue.flush();
  assert.deepEqual(sent[3].packet.ranges, [[2, 4]]);
  assert.equal(sent[3].packet.sequence, 1);
});
