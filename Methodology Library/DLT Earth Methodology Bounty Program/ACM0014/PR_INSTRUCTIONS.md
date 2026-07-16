# Opening this as a PR

This is my local git repository, already on branch `fix/acm0014-policy-c-gaps`, with all fixes committed under my name. The email is a placeholder -- update it to whatever's registered to my GitHub account, or commits won't link to my profile:

```bash
cd acm0014-policy-c-fixes
git config user.email "my-real-github-email@example.com"
git commit --amend --reset-author --no-edit
```

Then push and open the PR:

```bash
git remote add origin https://github.com/<username>/<fork>.git
git push -u origin fix/acm0014-policy-c-gaps

gh pr create --title "fix(ACM0014): resolve engine evaluation bugs, quarantine dead cross-methodology blocks, add public-facing documentation" \
  --body-file .github/PULL_REQUEST_TEMPLATE.md \
  --base main
```

If the target is an existing repo rather than a fresh fork:

```bash
git checkout -b fix/acm0014-policy-c-gaps
cp /path/to/unzipped/policy/policy.json ./path/in/target/repo/policy.json
git add -A
git commit -m "fix: ACM0014 Policy C engine + quarantine + guard fixes"
git push -u origin fix/acm0014-policy-c-gaps
```

## Contents

- `policy/policy.json` -- raw fixed policy JSON, for readable diffs.
- `policy/ACM0014_v8_0_Policy_C_BOUNTY_SUBMISSION.policy` -- packaged file, ready to import into Guardian.
- `.github/PULL_REQUEST_TEMPLATE.md` -- PR description, at the path GitHub auto-populates from.
- `tests/ACM0014_test_fixture.json` -- exact field values I used in two confirmed successful live test runs.
- `tests/ACM0014_Policy_Integrity_Test_baseline.json` -- Guardian 3.6 Policy Integrity Test specification. Read the caveat at the top before use -- register the real baseline through Guardian's own UI using these values.
- `tests/ACM0014_Monitoring_Report_Realistic_Test_Data.md` -- full derivation of my test fixture's numbers.
- `docs/ACM0014_Bounty_Readiness_Summary.md` -- reviewer-facing summary.
- `README.md` -- package overview.
