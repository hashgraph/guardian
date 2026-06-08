# VMR0015 Mint Pipeline Bug Analysis

> **Status:** Root cause confirmed from policy binary analysis (2026-06-09)  
> **Branch:** `feat/vmr0015-dryrun-validated`  
> **File analysed:** exported `.policy` binary (302 KB, full policy block graph)

---

## Summary

Two bugs in the policy block graph prevent the SR Approve → Mint → VP creation pipeline from completing. The `mintToken` block (`mintDocumentBlock`) exists in the policy but **never fires** due to these two defects.

---

## BUG-A — `stopPropagation: true` on `saveissuancerequestdb`

| Property | Value |
|---|---|
| Block tag | `saveissuancerequestdb` |
| Block type | `sendToGuardianBlock` |
| Affected property | `stopPropagation` |
| Current value | `true` ← **BUG** |
| Required value | `false` |

### Event chain that breaks

```
creatissuancerequest  (requestVcDocumentBlock, schema 9d32399f)
  → saveissuancerequesthedera  [Hedera, RunEvent]
  → saveissuancerequestdb      [DB, stopPropagation: TRUE ← kills chain here]
  → mintToken                  [mintDocumentBlock — NEVER REACHED]
```

### Fix

In the Guardian Policy Configuration UI:
1. Open the `srmonitoringpipeline` container
2. Find block `saveissuancerequestdb`
3. Set **Stop Propagation → OFF** (`false`)
4. Verify the outgoing `RunEvent → mintToken` event wire is intact
5. Re-export the policy

---

## BUG-B — `rule: field6` references wrong schema field

| Property | Value |
|---|---|
| Block tag | `mintToken` |
| Block type | `mintDocumentBlock` |
| Affected property | `rule` |
| Current value | `field6` ← **BUG** |
| Token | `token1` (uses template) |
| Schema on block | `4c592093` (Monitoring Report) |
| Schema of incoming doc | `9d32399f` (Issuance Request) |

### Why it fails

The `mintDocumentBlock` receives the **Issuance Request VC** (schema `9d32399f-5635-415d-983e-a52166a39700`) from `saveissuancerequestdb`. The rule `field6` is a field name from the **Monitoring Report schema** (`4c592093-d637-4eee-9c09-36aa148c9a2c`). Since `field6` does not exist on the Issuance Request VC, Guardian resolves the mint quantity to `null` or `0` and silently skips the mint operation.

### Fix

1. Open schema `9d32399f-5635-415d-983e-a52166a39700` (Issuance Request) in Guardian Schema Editor
2. Identify the field that holds the **CER quantity** (the number to mint) — typically `field0` or named `cerQuantity` / `amount`
3. In the `mintToken` block, set **Rule** to the correct field path, e.g.:
   - `document.credentialSubject.0.field0` (if the quantity is field0 on the Issuance Request)
4. Re-export the policy

---

## Combined Impact

With both bugs present:
- SR clicks **Approve** on a Monitoring Report
- `srsaveapprovedreport` fires (status = `Minted` written to DB) ✓
- `srreassignapprovedreport` → Hedera → DB chain completes ✓
- `createissuancerequest` dialog appears and PP submits ✓
- `saveissuancerequestdb` saves to DB — then **STOPS** (Bug A)
- `mintToken` never fires → no VP created → Token History empty → Trustchain broken

This explains the two orphaned VP hashes (`BTkWTF…` / `G9Lf5e…`) seen in the
dry-run: they were created in a prior test cycle where the issuance request
dialog appeared twice in quick succession (~3 seconds apart), but neither
resulted in an actual mint because Bug A killed propagation both times.

---

## Files That Need Re-Export After Fix

The `.policy` binary is a Guardian export artifact — it cannot be patched via Git.
After fixing both bugs in the Guardian UI:

1. Re-export the policy: **Policy → Export → Download .policy file**
2. Replace the existing `.policy` file in this PR with the new export
3. Run the full dry-run lifecycle again to confirm:
   - Token History shows minted CERs after SR approves MR
   - VP grid shows a new VP linked to the project
   - Trustchain shows the complete chain: Project → MR (Verified) → MR (Approved) → Mint Token
