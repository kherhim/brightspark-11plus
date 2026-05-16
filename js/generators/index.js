// Generator registry: maps a topic id to its generator module.

import numberPlaceValue from "./numberPlaceValue.js";
import addSubtract from "./addSubtract.js";
import multiplyDivide from "./multiplyDivide.js";
import fractions from "./fractions.js";
import decimals from "./decimals.js";
import percentages from "./percentages.js";
import ratioProportion from "./ratioProportion.js";
import algebra from "./algebra.js";
import measurement from "./measurement.js";
import geometry from "./geometry.js";
import perimeterAreaVolume from "./perimeterAreaVolume.js";
import statistics from "./statistics.js";

export const GENERATORS = {
  [numberPlaceValue.topicId]: numberPlaceValue,
  [addSubtract.topicId]: addSubtract,
  [multiplyDivide.topicId]: multiplyDivide,
  [fractions.topicId]: fractions,
  [decimals.topicId]: decimals,
  [percentages.topicId]: percentages,
  [ratioProportion.topicId]: ratioProportion,
  [algebra.topicId]: algebra,
  [measurement.topicId]: measurement,
  [geometry.topicId]: geometry,
  [perimeterAreaVolume.topicId]: perimeterAreaVolume,
  [statistics.topicId]: statistics,
};

export const ALL_GENERATORS = Object.values(GENERATORS);
