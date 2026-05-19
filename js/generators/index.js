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

// Verbal Reasoning (Phase 4A)
import vrVocab from "./vrVocab.js";
import vrAnalogy from "./vrAnalogy.js";
import vrOdd from "./vrOdd.js";
import vrLetters from "./vrLetters.js";
import vrCodes from "./vrCodes.js";
import vrLogic from "./vrLogic.js";
import vrWords from "./vrWords.js";
// Non-Verbal Reasoning (Phase 4A)
import nvrSeries from "./nvrSeries.js";
import nvrMatrix from "./nvrMatrix.js";
import nvrOdd from "./nvrOdd.js";
import nvrAnalogy from "./nvrAnalogy.js";
import nvrRotation from "./nvrRotation.js";
// English (Phase 4A)
import enSpelling from "./enSpelling.js";
import enGrammar from "./enGrammar.js";
import enPunctuation from "./enPunctuation.js";
import enVocab from "./enVocab.js";
import enCloze from "./enCloze.js";
import enComprehension from "./enComprehension.js";

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

  [vrVocab.topicId]: vrVocab,
  [vrAnalogy.topicId]: vrAnalogy,
  [vrOdd.topicId]: vrOdd,
  [vrLetters.topicId]: vrLetters,
  [vrCodes.topicId]: vrCodes,
  [vrLogic.topicId]: vrLogic,
  [vrWords.topicId]: vrWords,

  [nvrSeries.topicId]: nvrSeries,
  [nvrMatrix.topicId]: nvrMatrix,
  [nvrOdd.topicId]: nvrOdd,
  [nvrAnalogy.topicId]: nvrAnalogy,
  [nvrRotation.topicId]: nvrRotation,

  [enSpelling.topicId]: enSpelling,
  [enGrammar.topicId]: enGrammar,
  [enPunctuation.topicId]: enPunctuation,
  [enVocab.topicId]: enVocab,
  [enCloze.topicId]: enCloze,
  [enComprehension.topicId]: enComprehension,
};

export const ALL_GENERATORS = Object.values(GENERATORS);
