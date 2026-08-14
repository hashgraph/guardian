# 2025 Hackathon Submissions

Welcome! This folder is where 2025 hackathon teams can share the Guardian policies they built, so the wider community — methodology authors, VVBs, and other developers — can discover and learn from your work.

## How to submit

1. **Create your team folder** under this directory:
   ```
   Methodology Library/Community Contributions/2025-Hackathon/<your-team-name>/
   ```
2. **Add your files:**
   - Your exported Guardian policy file (`.policy`)
   - Your schema file(s)
   - A `policy-manifest.yml` (see example below — copy it and fill in your details)
3. **Open a pull request** against the `develop` branch. When creating your PR, select the **Hackathon Submission** template so the right fields are pre-filled for you.
4. **Get it in early** — the sooner your PR is in, the more likely we can mention your contribution in an upcoming release or community update.

## Example `policy-manifest.yml`

```yaml
id: hackathon-2025-regen-atlas
name: Regen Atlas
version: "1.0.0"
description: >
  Environmental intelligence policy for AI agents, tracking and verifying
  environmental data claims via Guardian.

policy_type: proof-of-concept
status: draft
license: Apache-2.0

category: other
category_note: AI agent environmental intelligence

authors:
  - name: Pat Smith
    type: individual
    github: pat-smith

tags:
  - hackathon
  - community
  - ai-agents

maintainers:
  - name: Pat Smith
    email: pat@ecofrontiers.xyz

resources:
  - type: other
    label: Demo video
    url: https://example.com/demo
  - type: other
    label: Pitch deck
    url: https://example.com/deck

support: https://github.com/example/regen-atlas/issues
thumbnail: assets/thumbnail.png   # optional, 400x300 px, PNG preferred, max 200 KB
```

**Notes:**
- `policy_type: proof-of-concept` is the recommended default for hackathon submissions — MANIFEST_SPEC.md calls this out explicitly ("typically found in Hackathon/ ... Examples: Hackathon submissions").
- `category` is **required**. If nothing in the enum fits your project, use `other` and fill in `category_note`.
- Use the canonical tags `hackathon` and `community`. Add 1-2 thematic tags on top describing what your project actually does.
- Contact info goes under `maintainers[].email`, not `authors` — the schema's `authors` objects don't have an email field.
- Want to share a demo video, deck, or repo link? Use the `resources[]` array, not a custom field.
- Don't add a `publications` field. Publication history is tracked separately in an auto-generated `publications.json` — you won't need this until you actually publish to testnet/mainnet.

## Questions or feedback?

- 📅 Stay in the loop on future events and calls: [lu.ma/guardian](https://lu.ma/guardian)
- 💬 Questions, feedback, or help with your PR: **guardian-feedback@hashgraph.com**
