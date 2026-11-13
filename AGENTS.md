# Guidance for agents

## Adding a test for a code change

Every behavior change comes with a test that fails without the change and passes with it. Write the test first, see it fail for the right reason, then make it pass.

1. **Pick the lowest level that can show the behavior.**
   - Logic inside a service or a shared package: a unit test in that package's `tests/` folder (`common`, `api-gateway`, `guardian-service`, `policy-service`, `auth-service`, `worker-service`, `queue-service`, `interfaces`). They are mocha suites named `*.test.mjs` (`api-gateway` also has older `*.test.js` files), and most import the compiled output from `dist/`, so rebuild the package first (`npx tsc -p .`), then run the file with `npx mocha tests/<file> --exit` from the package folder. `api-gateway` and `worker-service` have a `.mocharc.json` that lists every spec, so a file passed on the command line would run on top of all of them: add `--no-config` to run it alone. The one in `policy-service` only loads `esmock`, so a file passed there runs alone as it is; keep the config. Look at a neighbouring test for the stubbing style (sinon, fake clients) and reuse its helpers.
   - Angular components, services and pipes in `frontend`: a `*.spec.ts` next to the code, run with `npx ng test --watch=false` from `frontend` (Vitest in headless Chromium through Playwright; the specs use the Vitest API, `vi.fn` / `vi.spyOn`). Install the browser once with `npx playwright install chromium`; in the dev container prefix it with `NODE_OPTIONS=--use-system-ca`, because the container's TLS proxy certificate is only in the system store.
   - Behavior that crosses services or needs the real stack (an HTTP contract, a policy workflow, a UI flow): an end-to-end test in `e2e-tests` (below). A unit test is still preferable for the specific defect when one can reproduce it.
2. **Test behavior, not implementation.** Assert what a caller observes (response, thrown error, stored state, emitted message). Do not assert on private calls or on how the code is structured.
3. **Bug fixes:** reproduce the bug in a test first. Keep the regression test even when the fix is one line.
4. **Do not edit or delete an existing test to make a change pass.** If a test must change because the behavior changed on purpose, say so and explain why.
5. **Run the package's tests and its linter before declaring the work done.** Report failures instead of hiding them.

## End-to-end tests (`e2e-tests`)

Read `e2e-tests/README.md` first; it explains the environment (Hedera Solo, infrastructure containers, services) and how to run a spec.

- **Where:** `cypress/e2e/api-tests/<NNN_area>/` for API specs (a spec in a new folder only runs once the folder is added to `specPattern` in `cypress.config.js`; a spec in an existing folder is picked up as it is), `policy-tests/` for policy workflows, `ui-tests/specs/<NN_area>/` for UI specs (their page objects live in `ui-tests/pages/`). Reuse the helpers in `cypress/support` (`authorization`, `api/*`, `CustomHelpers/*`, `importFlow`, `tagsExplorer`) before writing new ones.
- **Idempotent and order-independent:** a spec must pass when it is run twice in a row and in any order. Create what it needs in the spec itself with a unique name (`randomInt` from `support/random`), clean it up in an `after` hook, and never depend on data from another spec or on a fixed testnet id. Use `seededMessageId` (`support/CustomHelpers/ipfsSeeding`) for artifacts imported from Hedera messages. Things the product cannot delete (published tokens, modules, schemas) are the only acceptable leftovers; say so in a comment.
- **Cypress rules:** return a chain from `it` when you chain on it; no fixed `cy.wait(<ms>)` (use `cy.intercept` and aliases, or assert on the state); do not chain after a command that changes the subject (`click`, `clear`, `type`): re-query with `cy.get` instead; find buttons by their text, since Angular property bindings leave no attribute in the DOM.
- **Tags:** give a new API spec the tags its neighbours use so the CI scopes pick it up.
- **UI changes:** a frontend change to what a user sees or clicks (layout, selectors, visible texts) updates the page objects and specs that drive it in the same change. Find them by searching `e2e-tests/cypress` for the component selector (for example `app-geojson-type`) and for the texts that change, run them as in "Check" below, and remove the locators nothing uses anymore.
- **Product problems found by a test:** do not work around them in the test. Write a note in `e2e-tests/pending-issues/` (what was observed, how to reproduce it, the test impact), skip the affected test with a pointer to the note, and delete the note once the issue is resolved.
- **Spec files of one API folder may depend on each other** (`013_contracts/004` needs `001`–`003`), so run the whole folder when you change one of them. Specs in different folders must not.
- **Check:** run the spec twice (`npx cypress run --spec <file>` plus the `--env` flags for your environment, see the README), then `npx eslint cypress` from `e2e-tests` (see "Linting the tests" in its README). `npm run guardian:test -- <spec>` always filters on the `all` tag, so it skips a spec that does not carry it.

## Running the e2e stack from the dev container

- **Who starts what:** the user runs `npm run solo:up` and `npm run guardian:infra:up` on the host. `npm run guardian:status` from `e2e-tests` tells which of the network, the infra and the services is down; run it before digging into a run that fails or stalls. The agent runs the services in the container (`npm run guardian:services:up` / `down` from `e2e-tests`, gateway on `http://127.0.0.1:3002`) and the frontend for UI specs (see "Preparing the app for UI tests" in `e2e-tests/README.md`). Do not restart a background process the system stopped for low memory unless asked.
- **Rebuild before running** when the sources moved since the last build: `npm run guardian:build` from `e2e-tests` (it installs the workspace and builds `interfaces`, `common`, `hedera` and every service, as the CI does), then restart the services. The services run `dist/`, so a stale build silently runs old code.
- **Order and timing:** run `cypress/e2e/api-tests/000_accounts_creating/*.cy.js` first on a fresh database (users and seeded artefacts, about 2 min). A UI spec takes 20 s to a few minutes (`flow_CDM_0001` 8 to 13). Run whole suites in the background with the output in a log file. Service logs are in `e2e-tests/.local/logs/<service>-<n>.log`; MongoDB is at `mongodb://host.docker.internal:27017` from the container.
- **Policy processes:** every published or dry-run policy keeps its own process (about 280 MB) until the services stop, and a whole suite leaves about 55 of them, enough to run some machine out of memory. Run suites with `STOP_POLICIES_AFTER_TESTS=1`, or run `npm run guardian:stop-policies` from `e2e-tests` after them. Do not kill them with a signal: policy-service respawns them after 10 s.
- **Do not `pkill -f` or `pgrep -f … | kill`** with a pattern that appears in your own command line: it kills your shell. Collect the pids first and kill those (with their children).
- **Git in the container:** add explicit paths (`git add e2e-tests` also stages unrelated edits). `git diff` on the LFS-tracked `Methodology Library` hangs, because `git-lfs` is not installed: scope the pathspec. The `git-lfs` warning after a commit is harmless. There is no `gpg`, so commit with `git -c commit.gpgsign=false commit`; the user signs the commits afterwards.

## Conventions

- Anything shared or persisted (code, comments, commit messages, documentation) is in English. Markdown is not hard-wrapped.
- Keep the change scoped to what was asked; mention other improvements instead of making them.
