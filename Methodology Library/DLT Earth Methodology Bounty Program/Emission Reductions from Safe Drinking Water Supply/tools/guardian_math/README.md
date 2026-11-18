# guardian_math: Guardian's own math engine, offline

Two checks run from here without MGS.

- **`case.mjs`** runs both VMR0015 mathBlocks through Guardian's math engine. `../regression.py` uses it automatically once `npm install` has been run here.
- **`sim.mjs`** replays the whole workflow through the policy's block graph: Project Proponent, VVB, Standard Registry, issuance and the negative paths (82 checks).

## Setup

```
cd tools/guardian_math
npm install                  # compute-engine 0.27.0, mathjs, formulajs, ajv
python3 ../regression.py ../../policy/<file>.policy ../fixtures/v5.0A/PD.full.json ../fixtures/v5.0A/MR.full.json
mkdir /tmp/p && (cd /tmp/p && unzip -q <path>/policy/<file>.policy)
node sim.mjs /tmp/p ../../sample-data/v5.0A
```

## Where the engine comes from

- `src/math-model/*.ts` are copied unchanged from the Guardian repository (hashgraph/guardian, `main` branch, retrieved 19 October 2026). The path there is `policy-service/src/policy-engine/helpers/math-model/`. Guardian is licensed Apache-2.0.
- These are the classes `helpers/workers/math-worker.ts` uses on a Guardian server: `MathEngine.from(expression)`, `createContext()`, `setDocument(DocumentMap)`, outputs, then `Code.run()`.
- `src/gi/table-field-core.ts` is copied from `interfaces/src/helpers/table-field-core.ts`.
- `src/gi/index.ts` stands in for the `@guardian/interfaces` package. It provides `GenerateUUIDv4` (`crypto.randomUUID`) and re-exports the table helpers. The only edit to the Guardian files is the import path of that package.
- `dist/` is the TypeScript output (`npx tsc -p .`).

## What `sim.mjs` models

`sim.mjs` follows the Guardian block source:

- block events and the default next-block flow when `stopPropagation` is off;
- sendToGuardian options and entity types;
- documentsSourceAddon filters, `onlyOwnDocuments` and `onlyAssignDocuments`;
- buttons and forms bound to grid rows;
- requestVcDocument presets, and edit mode with its ReferenceEvent;
- switch conditions;
- customLogic sources;
- documentValidator conditions and source validations;
- the mint rule and token decimals.

Every submitted and calculated document is validated against its schema from the policy file.

It does not model Hedera, IPFS, signatures, the user interface or the interfaceStep page flow, so it does not replace a dry-run on MGS.
