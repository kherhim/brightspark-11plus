// Schema v3 -> v4 migration MUST preserve real saved progress (the app is
// already live with progress on a device) and never wipe it.

import { suite, test, assert, assertEq } from "./harness.js";
import {
  migrate,
  importJSON,
  freshState,
  SCHEMA_VERSION,
  START_LEVEL,
} from "../js/store.js";
import { TOPICS } from "../js/topics.js";

function v3() {
  return {
    schemaVersion: 3,
    createdAt: 111,
    updatedAt: 222,
    global: { totalAnswered: 30, totalCorrect: 21, sessionCount: 4 },
    lastTopicId: "fractions",
    topics: {
      fractions: {
        level: 5,
        streakCorrect: 1,
        streakWrong: 0,
        attempts: 20,
        correct: 15,
        mastery: 0.7,
        timeMs: 120000,
        lastSeenAt: 999,
        seenCount: 20,
        mastered: false,
        recentMistakes: [
          { qid: "fractions:L5:s=1", level: 5, chosenKey: "B",
            chosenText: "3/4", correctText: "2/3", misconceptionId: "f_add", at: 500 },
          { qid: "fractions:L4:s=2", level: 4, chosenKey: null,
            chosenText: "x", correctText: "y", misconceptionId: null, at: 600 },
        ],
      },
      decimals: {
        level: 3, streakCorrect: 0, streakWrong: 2, attempts: 10, correct: 6,
        mastery: 0.4, timeMs: 30000, lastSeenAt: 800, seenCount: 10,
        mastered: false, recentMistakes: [],
      },
    },
  };
}

suite("migration v3 -> v4");

test("preserves all existing progress fields", () => {
  const m = migrate(v3());
  assertEq(m.schemaVersion, SCHEMA_VERSION, "bumped to v4");
  assertEq(m.topics.fractions.level, 5, "level kept");
  assertEq(m.topics.fractions.attempts, 20, "attempts kept");
  assertEq(m.topics.fractions.correct, 15, "correct kept");
  assertEq(m.topics.fractions.mastery, 0.7, "mastery kept");
  assertEq(m.topics.decimals.streakWrong, 2, "streak kept");
  assertEq(m.global.totalAnswered, 30, "global answered kept");
  assertEq(m.global.totalCorrect, 21, "global correct kept");
  assertEq(m.lastTopicId, "fractions", "lastTopicId kept");
  assertEq(m.createdAt, 111, "createdAt kept");
  assertEq(m.topics.fractions.recentMistakes.length, 2, "ring kept");
});

test("adds v4 fields without losing data", () => {
  const m = migrate(v3());
  assert(typeof m.deviceId === "string", "deviceId minted");
  assert(m.profile && m.profile.board === null, "profile.board null");
  assertEq(m.profile.dailyGoal, 10, "dailyGoal default");
  assert(m.streaks && m.streaks.current === 0, "streaks present");
  assert(m.leitner && typeof m.leitner.boxes === "object", "leitner present");
  assert(Array.isArray(m.mockHistory), "mockHistory present");
  assert(Array.isArray(m.topics.fractions.paceMs), "paceMs added");
  assert(
    m.topics.fractions.misconceptionCounts &&
      typeof m.topics.fractions.misconceptionCounts === "object",
    "misconceptionCounts added"
  );
  assertEq(
    m.global.totalTimeMs,
    150000,
    "totalTimeMs summed from topic timeMs (120000+30000)"
  );
});

test("seeds the persistent mistakeLog from the 10-item rings", () => {
  const m = migrate(v3());
  assert(Array.isArray(m.mistakeLog), "mistakeLog is an array");
  assertEq(m.mistakeLog.length, 2, "both fraction mistakes carried over");
  assert(
    m.mistakeLog.every((x) => x.topicId === "fractions"),
    "entries tagged with topicId"
  );
  assert(
    m.mistakeLog.every((x) => x.source === "practice"),
    "entries tagged source=practice"
  );
});

test("auto-initialises topics absent from the old save", () => {
  const m = migrate(v3());
  for (const t of TOPICS) assert(m.topics[t.id], `topic ${t.id} present`);
  assertEq(m.topics.algebra.level, START_LEVEL, "new topic at START_LEVEL");
  assertEq(m.topics.algebra.attempts, 0, "new topic zeroed");
});

test("migration is idempotent (running again keeps data)", () => {
  const once = migrate(v3());
  const twice = migrate(JSON.parse(JSON.stringify(once)));
  assertEq(twice.schemaVersion, SCHEMA_VERSION, "still v4");
  assertEq(twice.topics.fractions.level, 5, "level still kept");
  assertEq(twice.mistakeLog.length, 2, "log not duplicated on re-run");
});

test("importing an old exported file upgrades cleanly", () => {
  const m = importJSON(JSON.stringify(v3()));
  assertEq(m.schemaVersion, SCHEMA_VERSION, "imported file is v4");
  assertEq(m.topics.fractions.correct, 15, "progress survived import");
});

suite("migration safety");

test("garbage / pre-v3 resets to a fresh v4 state", () => {
  const a = migrate(null);
  assertEq(a.schemaVersion, SCHEMA_VERSION, "null -> fresh v4");
  const b = migrate({ schemaVersion: 2, topics: {} });
  assertEq(b.schemaVersion, SCHEMA_VERSION, "v2 -> fresh v4");
  assertEq(b.global.totalAnswered, 0, "fresh is zeroed");
  for (const t of TOPICS) assert(b.topics[t.id], `fresh has ${t.id}`);
});

test("a fresh v4 state passes through unchanged", () => {
  const f = freshState();
  const m = migrate(JSON.parse(JSON.stringify(f)));
  assertEq(m.schemaVersion, SCHEMA_VERSION, "stays v4");
  assertEq(Object.keys(m.topics).length, TOPICS.length, "all topics intact");
});
