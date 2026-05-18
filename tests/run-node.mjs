// Node runner for the pure (no-DOM, no-fetch) tests. Browser-only checks
// (curated.json fetch) run via tests/test.html instead.
//   node tests/run-node.mjs
import "./generators.test.js";
import "./engine.test.js";
import "./migration.test.js";
import "./mock.test.js";
import { report } from "./harness.js";
report();
