// Seeded pseudo-random number generator (mulberry32).
// Deterministic: the same seed always yields the same sequence, so any
// generated question can be reproduced exactly from its seed (used for
// parent review and for the test suite).

export function makeRng(seed) {
  let a = seed >>> 0;
  if (a === 0) a = 0x9e3779b9; // avoid the degenerate all-zero state
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const api = {
    seed,
    // float in [0, 1)
    float: next,
    // integer in [min, max] inclusive
    int(min, max) {
      if (max < min) [min, max] = [max, min];
      return min + Math.floor(next() * (max - min + 1));
    },
    // pick one element of an array
    pick(arr) {
      return arr[api.int(0, arr.length - 1)];
    },
    // pick `n` distinct elements
    sample(arr, n) {
      return api.shuffle(arr.slice()).slice(0, n);
    },
    // in-place Fisher–Yates shuffle, returns the array
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = api.int(0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    // true with probability p
    chance(p) {
      return next() < p;
    },
  };
  return api;
}

// A fresh, unpredictable seed for a brand-new question instance.
export function freshSeed() {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}
