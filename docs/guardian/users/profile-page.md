---
description: >-
  Field-level reference for the Profile page as shown to Standard Registry and
  Regular User accounts.
---

# Profile page fields

The Profile page is the account view at `/profile`, where a Standard Registry or a Regular User inspects their Hedera account, identity documents, relayer accounts, credentials, and per-account settings.

#### Tabs

| Tab                       | Standard Registry | Regular User | Description                                                                     |
| ------------------------- | ----------------- | ------------ | ------------------------------------------------------------------------------- |
| General                   | Yes               | Yes          | Account summary, Hedera network details, identity documents, and configuration. |
| Relayer Accounts          | Yes               | Yes          | Hedera accounts used to pay for transactions on the account's behalf.           |
| Decentralized Access Key  | No                | Yes          | Keys generated or imported for decentralized policy access.                     |
| Credentials               | Yes               | Yes          | External service credentials, global and per policy.                            |

#### General tab – Account card

| Property | Type   | Required | Default | Description                                                    |
| -------- | ------ | -------- | ------- | -------------------------------------------------------------- |
| Username | string | Yes      | —       | Account login name, shown with initials as an avatar.          |
| Role     | string | Yes      | —       | Account role, `Standard Registry` or `User`.                   |
| Balance  | string | Yes      | —       | Current HBAR balance of the operator account.                  |

#### General tab – Hedera network card

| Property   | Type   | Required          | Default | Description                                                                     |
| ---------- | ------ | ----------------- | ------- | ------------------------------------------------------------------------------- |
| Account ID | string | Yes               | —       | Hedera operator account ID, linked to the explorer and copyable.                |
| User Topic | string | No                | —       | Hedera topic holding the account's own messages. Hidden until the topic exists. |
| Init Topic | string | No (SR only)      | —       | Parent topic the Standard Registry was initialised from.                        |

#### General tab – Identity card

| Property          | Type   | Required        | Default | Description                                                                    |
| ----------------- | ------ | --------------- | ------- | ------------------------------------------------------------------------------ |
| Standard Registry | string | Yes (User only) | —       | DID of the Standard Registry the user is registered with.                      |
| DID               | string | Yes             | —       | Decentralized Identifier of the account, copyable.                             |
| DID Document      | action | Yes             | —       | Opens the account's DID document in a viewer dialog.                           |
| VC Document       | action | No              | —       | Opens the account's Verifiable Credential. Hidden when no VC exists.           |
| Profile           | action | Yes (User only) | —       | Downloads the profile as a file for transfer to another Guardian instance.     |

#### General tab – Configuration card

| Property                 | Type    | Required        | Default        | Description                                                      |
| ------------------------ | ------- | --------------- | -------------- | ---------------------------------------------------------------- |
| Documentation            | toggle  | No              | Off            | Shows the in-app documentation widget. HTTPS only.               |
| Experimental UI          | toggle  | No (SR only)    | Off            | Enables experimental interface features, with a feedback link.   |
| First Steps              | toggle  | No              | Off            | Shows the First Steps tutorial toggle in the side menu.          |
| Two-factor authentication| toggle  | No              | Off            | Requires an authenticator code at sign-in.                       |
| Password                 | action  | No              | —              | Opens the change-password dialog.                                |
| Theme                    | select  | No              | System         | Appearance for the current device only.                          |
| Menu layout              | select  | No              | Side rail      | Navigation as a side rail or a top bar, for the current device.  |

#### Relayer Accounts tab

| Column      | Type   | Description                                                       |
| ----------- | ------ | ----------------------------------------------------------------- |
| Account     | string | Hedera account ID, linked to the explorer.                        |
| Balance     | string | Cached HBAR balance, refreshed on demand.                         |
| Update date | string | Timestamp of the last balance refresh, with a refresh control.    |
| Name        | string | Label given to the relayer account.                               |
| Actions     | action | `Details` opens the relayer account dialog.                       |

Toolbar controls: keyword search, `Update All Accounts`, `Add Relayer Account`.

#### Decentralized Access Key tab (Regular User)

| Column      | Type   | Description                                                  |
| ----------- | ------ | ------------------------------------------------------------ |
| Date        | string | Key creation date.                                           |
| Message     | string | Hedera message ID the key was published in.                  |
| Policy Name | string | Policy the key grants access to.                             |
| –           | action | Deletes the key. Disabled while the key status is PUBLISHED. |

The toolbar shows `Generate Key` for local accounts and `Import Key` for remote accounts.

#### Credentials tab

Split into `Global` and `Per policy` sub-tabs, each a table of stored service credentials.

| Column  | Type   | Description                                                                        |
| ------- | ------ | ---------------------------------------------------------------------------------- |
| Service | string | External service the credential belongs to.                                        |
| Mode    | string | How the credential is supplied.                                                     |
| Updated | string | Last modification date.                                                             |
| Source  | string | Regular User only. Marked `Set by SR` when inherited from the Standard Registry.   |
| Actions | action | Edit or remove the credential.                                                      |

#### Setup wizard fields

Shown instead of the tabs while the account is not yet confirmed.

**Standard Registry**

| Step                      | Fields                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Hedera Account            | `Operator ID`, `Operator Key`, `Use fireblocks signing`, and when enabled `Vault ID`, `Asset ID`, `API Key`, `Private Key`.              |
| DID Document              | Generate a new DID document, or supply a custom one with a `Topic ID` and DID document JSON.                                             |
| DID Document signing keys | For each verification method: `Method` and `Key`. Shown only for custom DID documents.                                                   |
| Standard Registry Details | VC form driven by the Standard Registry schema.                                                                                          |
| Restore Data              | Alternative branch that restores an existing profile from Hedera instead of creating a new one.                                          |

**Regular User**

| Step                      | Fields                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Standard Registries       | Registry cards filtered by `Policy name` and `Geography`. One registry must be selected.                                   |
| Hedera Account            | `Operator ID` and `Operator Key`, or `Generate` for a demo account. Fireblocks fields as for the Standard Registry.        |
| Set Up Digital Identity   | Local or remote location. Remote requires `Operator ID`, `Topic ID`, and a DID document.                                   |
| DID Document signing keys | `Method` and `Key` per verification method. Local accounts with a custom DID document only.                                |
| VC Document               | VC form driven by the registry's user schema. Shown only when a custom VC document is chosen.                              |

#### Valid values

| Value              | Description                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| `STANDARD_REGISTRY`| Role that sees the Init Topic, Experimental UI toggle, and registry setup steps.  |
| `USER`             | Role that sees the Standard Registry field, profile download, and access keys.    |
| `local`            | Identity location where Guardian holds the keys; keys can be generated.           |
| `remote`           | Identity location where keys are held externally; keys must be imported.          |
| `PUBLISHED`        | Access key state in which deletion is blocked.                                     |

#### Notes

* The page renders the setup wizard until the account is confirmed; all tabs appear only afterwards.
* `Theme` and `Menu layout` are stored per device, not per account, so they do not follow the user to another browser.
* Fireblocks fields replace the operator key with a custodial signing configuration and are optional in every wizard.
* Balances are cached. The Relayer Accounts tab refreshes them per row or in bulk rather than on page load.

#### Related

* Concept: [Roles and permissions](../standard-registry/roles-and-permissions/README.md)
* Task: [User profile setup](user-profile-setup.md)
* Reference: [Profile APIs](../../developer-tools/api-reference/profile-apis/README.md)
