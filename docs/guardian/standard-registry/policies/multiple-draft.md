# 🪅 Multiple Draft

### Overview

In the AMS-III.AR policy workflow, users frequently enter complex data across multiple sections — such as monitoring parameters, emission reductions, and baseline calculations.\
The Draft Feature in Guardian allows users to save their progress without submitting for validation, ensuring that incomplete entries are preserved safely for later editing.

This feature supports incremental data entry, auto-saving, and role-based draft management for Project Developers (PDs), Validators (VVBs), and Reviewers.

### Workflow Summary

| **User Role**          | **Action**                                              | **Outcome**                                            |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| Project Developer (PD) | Fills monitoring or baseline data and clicks Save Draft | Draft version created; stored without validation       |
| PD or VVB              | Reopens the draft using Edit Draft                      | Data restored for continued editing                    |
| Guardian System        | Auto-saves progress every 2 minutes                     | Prevents accidental data loss                          |
| Policy Configurator    | Configures Draft Event logic                            | Differentiates new document creation vs. draft updates |

### 1. Save Draft

While entering data in the AMS-III.AR form, users can click Save Draft at any stage.\
This action creates a _VC document_ in the Guardian database that:

* Bypasses validation
* Is stored as-is
* Appears in the policy grid under “Draft Documents”

**Example Scenario**

A Project Developer begins filling the _Project Data_ section but lacks some measurements.\
They can select Save Draft to store progress safely, then return later to complete and validate the form.

<figure><img src="../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

Saved drafts can be edited, an additional option ‘EditType’ has been added to the request block for this purpose

<figure><img src="../../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### 2. Draft Event Logic in Configurator

Guardian’s Draft Event allows configurators to define workflow rules specific to drafts.\
This enables policies to handle separate logic for:

* New document creation
* Existing draft updates

Example Implementation

* Block 1 → Handles new AMS-III.AR document creation
* Block 2 → Handles updates to saved drafts

This structure ensures consistent validation flow and prevents overwriting finalized records.

<figure><img src="../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### 3. UI Enhancements — Auto-Save

Guardian includes an auto-save mechanism to prevent data loss during form entry.

#### How It Works

* Auto-save runs every 2 minutes if any changes are detected.
* Data is stored in IndexedDB (local browser storage).
*   After each save, a label shows the message:

    > “Last auto-saved at \[timestamp].”

<figure><img src="../../../.gitbook/assets/image (3) (1) (5).png" alt=""><figcaption></figcaption></figure>

#### Data Restoration

When reopening an AMS-III.AR form, Guardian prompts:

> “An autosave was found. Do you want to restore it?”

This ensures the user can always recover recent unsaved progress.

<figure><img src="../../../.gitbook/assets/image (4) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>
