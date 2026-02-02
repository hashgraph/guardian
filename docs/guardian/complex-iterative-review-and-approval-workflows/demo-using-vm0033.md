---
icon: sidebar-flip
---

# Demo using VM0033

## 1. Purpose and Context

The feature addresses a core challenge in real-world carbon workflow validation — managing iterative document review cycles without external tools. It ensures that all exchanges (comments, requested changes, evidence submissions) occur within Guardian, preserving transparency and auditability.

## 2. Typical Applications

* Carbon project validation and verification processes (e.g., VCS methodologies such as VM00033)
* Continuous document improvement and feedback loops
* Regulator or auditor engagement where version control, traceability, and evidence upload are required

## 3. Example Workflow (Demo Scenario)

### 3.1 Roles Involved:

* Project Developer(Proponent)
* Validator(VVB – e.g., Green Check Team)
* Standard Registry

### 3.2 Workflow:

#### Step 1 — Project Submission

The Project Developer submits a new project description (e.g., VM00033 v2.0 methodology). Data is uploaded via JSON console or manual entry. The project document is validated and created as a Verifiable Credential.

<figure><img src="../../.gitbook/assets/image (458).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (459).png" alt=""><figcaption></figcaption></figure>

#### Step 2 — Registry Review

The Standard Registry reviews the submission and assigns it for validation. The project status transitions to "Waiting for Validation."

<figure><img src="../../.gitbook/assets/image (460).png" alt=""><figcaption></figcaption></figure>

#### Step 3 - Project Developer assigns VVB

The Project Developer now assigns the GreenCheck (validator) to the project to get it reviewed and validated.

<figure><img src="../../.gitbook/assets/image (461).png" alt=""><figcaption></figcaption></figure>

#### Step 4 — Validator Review

The Validator reviews field-level data within the document. In this example, section 2.3.7 (Community Risk and Benefits) is flagged. The Validator creates a new discussion labeled \*\*2.3.7 Review\*\*, marking it public.

<figure><img src="../../.gitbook/assets/image (473).png" alt=""><figcaption></figcaption></figure>

A comment is added:

"The project proponent must update section 2.3.7 to clarify potential risks to stakeholders."

<figure><img src="../../.gitbook/assets/image (581).png" alt=""><figcaption></figcaption></figure>

The Validator rejects the document to request revisions.

<figure><img src="../../.gitbook/assets/image (583).png" alt=""><figcaption></figcaption></figure>

#### Step 4 — Proponent Revision

The Project Developer reviews the comment thread, updates the document (version 2) addressing validator feedback, and submits a new version through the same workflow.

<figure><img src="../../.gitbook/assets/image (598).png" alt=""><figcaption></figcaption></figure>

#### Step 5 — Validator Confirmation

The Validator reviews the corrected document and creates a follow-up discussion \*\*Response 2.3.7\*\*:

\
"The project proponent has updated section 2.3.7 with clarifications. Hence, the PD is approved."

<figure><img src="../../.gitbook/assets/image (599).png" alt=""><figcaption></figcaption></figure>

\
The document is approved and validated.

<figure><img src="../../.gitbook/assets/image (606).png" alt=""><figcaption></figcaption></figure>

#### Step 6 — Validation Report

Validator uploads a supporting validation report (PDF) summarizing the exchange: title, issue, action required, proponent response, and final approval. The file is published to IPFS and linked to the workflow.

<figure><img src="../../.gitbook/assets/image (610).png" alt=""><figcaption></figcaption></figure>

Registry administrators can view the entire conversation chain, demonstrating traceable decision-making.

<figure><img src="../../.gitbook/assets/image (611).png" alt=""><figcaption></figcaption></figure>

## 4. UI Overview

Within the Guardian interface:

* Each discussion thread is linked to a document or field
* Visibility settings (Public, Role, Users) appear at creation time
* Messages can include attachments (e.g., PDF reports, evidence files)
* Rejected documents trigger a "Resubmit" option for correction cycles
* All conversation history is accessible to permitted users in read-only mode

## 5. Notes and Limitations

* Private message encryption and publishing rules are still under refinement (implementation TBD)
* Conversations and documents remain linked to their originating policy instance and cannot be transferred across policies
* Each iteration (message or update) incurs a Hedera transaction and IPFS upload, impacting performance in very large workflows
* Only authenticated Guardian users may participate in discussions

## 6. Demo Video

[Youtube](https://youtu.be/mbp0LAT2rfs?si=x4ePJbha3LuT6a_G\&t=114)

## 7. Summary

The Complex Iterative Review and Approval Workflow introduces a digital-first approach to project validation and document review. It enables continuous, verifiable, and structured dialogue between project participants, ensuring every exchange is part of the permanent trust chain.

This feature fundamentally enhances Guardian's policy authoring capabilities by embedding communication, traceability, and compliance verification directly into workflow logic.
