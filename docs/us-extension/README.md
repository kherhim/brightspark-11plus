# Brightspark US extension — portable handoff

Prepared: 22 September 2026

Copy this directory's **contents** into `forSyon/docs/us-extension/`. The files link to each other locally; code paths inside the documents are relative to the `forSyon` repository root. This pack contains planning documents and an illustrative data example, not application code or credentials.

## Start here

The founder wants to extend the existing Brightspark product to **US elementary math, science and social studies**, as a **solo founder using AI with venture-scale ambition**. The user chose broad curriculum coverage; do not silently reduce the product to a fractions app, English-language-arts product or UK-only exam business.

K–5, a Grade 3 first delivery cohort, and the reference state are recommendations, not confirmed choices. The implementation team should preserve that distinction and resolve the remaining decisions together rather than reopening the confirmed ones.

## Reading order

1. [Scope and decisions](01-scope-and-decisions.md)
2. [Stack and repository assessment](02-stack-and-repo-assessment.md)
3. [Curriculum and data design](03-curriculum-and-data-design.md)
4. [Foundation implementation plan](04-foundation-implementation-plan.md)
5. [Delivery and validation](05-delivery-and-validation.md)
6. [Copyable next-session prompt](06-starting-prompt.md)
7. [Primary reference sources](07-reference-sources.md)

An [illustrative three-subject curriculum record](examples/us-grade3-curriculum.sample.json) accompanies the design. All its skills are drafts, not approved lessons or a complete curriculum.

## First repository session

- Read the repository's current instructions and inspect its current state.
- Compare HEAD with the reviewed commit: `9d1d980ab37c823681627605443e8de5690e40e7`.
- Run the existing client and Worker tests. The last review observed 430 client checks and 15 Worker tests passing.
- Inspect the known answer ambiguity and local-only progress implementation before relying on this pack's descriptions.
- Finalise the remaining product decisions, then execute the first bounded plan in an isolated branch/worktree.

The first plan covers a reproduced question ambiguity and a non-disruptive curriculum registry. Later milestones cover scoped learner progress, subject renderers, content, cloud sync and commercial launch; they need their own detailed plans. Do not execute the whole product roadmap as one unreviewed change.

## Stack verdict

**Keep the existing engine and Cloudflare backend. Improve their structure and operational tooling. Move commercial frontend hosting off GitHub Pages.** There is no current evidence that a wholesale React/Next.js rewrite or a new database provider is necessary.

## Evidence boundaries

The review checked code, selected live interfaces and automated tests. It did not establish educational efficacy, paid traction, complete curriculum alignment, a full security audit or scalable unit economics. No live app was changed while producing this pack.
