# Reference sources and evidence boundaries

Checked for this handoff on 22 September 2026. Recheck current technical limits and regulatory requirements when implementing. Standards publications can be older and still be the published reference; their date is not a claim of newly revised content.

## Technical platform

- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits): commercial SaaS/online-business hosting restriction.
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/): static frontend files and Worker code can be deployed together.
- [Cloudflare KV consistency](https://developers.cloudflare.com/kv/concepts/how-kv-works/): eventual consistency and atomic-operation limitations.
- [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/): database size, per-database serial processing and workload considerations.

## Curriculum and instruction

- [Common Core Grade 3 fractions](https://www.thecorestandards.org/Math/Content/3/NF/): candidate baseline for one maths unit, including permitted denominators.
- [Common Core Grade 4 fractions](https://www.thecorestandards.org/Math/Content/4/NF/): progression and assessment boundaries.
- [Common Core Grade 5 fractions](https://www.thecorestandards.org/Math/Content/5/NF/): subsequent operations and applications.
- [NGSS three-dimensional learning](https://www.nextgenscience.org/glossary/three-dimensional-learning): ideas, practices and crosscutting concepts should be integrated.
- [NGSS 3-PS2-1](https://www.nextgenscience.org/pe/3-ps2-1-motion-and-stability-forces-and-interactions): illustrative Grade 3 investigation standard and its boundaries.
- [California history/social-science framework](https://www.cde.ca.gov/ci/HS/cf/hssframework.asp): candidate state reference, not a nationwide sequence.
- [Nebraska explanation of the C3 framework](https://www.education.ne.gov/socialstudies/c3-framework-and-inquiry-based-learning/): purpose of the inquiry framework.
- [Texas TEKS](https://tea.texas.gov/curriculum-and-instruction/texas-essential-knowledge-and-skills-teks): evidence that state-specific standards require deliberate mapping.
- [IES fractions practice guide](https://ies.ed.gov/ncee/WWC/PracticeGuide/15/Published): instructional design reference, not evidence for Brightspark's effectiveness.

## Learner data

- [FTC COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions): guidance for covered child-directed services; use the current rule for detailed requirements.
- [Education Department vendor guidance](https://studentprivacy.ed.gov/resources/responsibilities-third-party-service-providers-under-ferpa): relevant when school data/contracts enter scope.

## Local evidence

Source review: `forSyon` commit `9d1d980ab37c823681627605443e8de5690e40e7`. Tests observed: 430 client checks and 15 Worker tests. Selected deployed interfaces were inspected. Question ambiguity reproduced directly using the existing template and seeded generator.

No customer interviews, independent educator efficacy trial, paid conversion data, complete question-bank semantic audit or comprehensive security audit was performed. This pack must not be presented as evidence of any of those activities.
