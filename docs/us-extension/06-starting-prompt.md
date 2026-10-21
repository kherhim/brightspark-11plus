# Copyable prompt for the forSyon workspace

Paste the following after copying this pack into `docs/us-extension/`:

---

We are extending Brightspark Prep from its existing UK 11+ product into a broader US elementary product covering **math, science and social studies**.

I am a solo founder using AI, with venture backing and a large-scale ambition. I have already built Brightspark and GCSE Prep. Use the existing Brightspark engine where it is appropriate; do not assume we need a new frontend framework or a new repository.

Read `docs/us-extension/README.md` and its linked documents, along with current repository instructions. The pack is based on reviewed commit `9d1d980ab37c823681627605443e8de5690e40e7`; check current code before relying on its findings.

The US market, broad elementary direction and three subjects are confirmed. K–5, Grade 3 as the first delivery grade, the reference state and the first-pilot persistence mode are recommendations to finalise. Summarise those remaining choices together, give a recommendation, and do not reopen the confirmed subject/market decisions.

Start by assessing the current code and running existing tests. Preserve UK routes, access and saved progress. In particular, do not rename or discard the legacy storage key. Check the reproduced mixed-number answer ambiguity and the mismatch between cloud-sync promises and local-only progress.

Produce the grade-by-subject curriculum inventory and finalise the first-release architecture. Treat math, science and social studies as different instructional/assessment needs sharing accounts, scheduling and progress infrastructure. Do not claim universal US standards alignment or complete curriculum coverage from a tag or generated-question count.

Use the foundation implementation plan for the first bounded change once the direction is agreed. Work in an isolated branch/worktree and provide concrete validation after each increment. The rest of the roadmap should be implemented through separate detailed plans, not one large rewrite.

Keep deployment, DNS, real payments, production data and external spending separate from local development. Check existing authorisation before any such action. The pack contains no credentials and does not itself authorise a production cutover.

The desired outcome is a maintainable, trustworthy learning product with evidence from real families—not just a larger question bank.

---
