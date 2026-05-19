// The canonical correct-answer text for any question instance. Pure and
// DOM-free so both the quiz UI and the printable worksheet builder can
// share one definition. Works for both "mcq" and "numeric" questions.
export function correctAnswerText(q) {
  return q.type === "mcq"
    ? q.choices.find((c) => c.correct).text
    : String(q.answer.value);
}
