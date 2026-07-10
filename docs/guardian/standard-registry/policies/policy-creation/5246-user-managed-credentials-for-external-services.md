---
tags:
  - new
---

# User Managed Credentials for External Services

### Overview

External Service Credentials allow Standard Registries (SRs) and users to configure their own API keys for third-party data services used by policy integration blocks (Global Forest Watch, Kanop.io, NASA FIRMS).

By default, Guardian uses instance-level API keys configured in environment variables. With this feature, SRs and users can override these defaults at two levels:

* Global — applies to all policies
* Per policy — applies to a specific policy only

Credentials can also be configured separately for Production and Dry Run execution modes.

#### Precedence Chain

When a policy block calls an external service, the system resolves credentials in this order:

1. User + Policy — current user's credential for this specific policy
2. User + Global — current user's global credential
3. SR + Policy — policy owner's credential for this specific policy
4. SR + Global — policy owner's global credential
5. Instance-level — environment variable (e.g., GLOBAL\_FOREST\_WATCH\_API\_KEY)

The first non-empty credential found is used. Levels are never merged.

### SR Configuration

#### Accessing Credentials Settings

Navigate to Profile → Credentials tab.

<br>

<img src="../../../../.gitbook/assets/unknown (4).png" alt="" height="184" width="665">

#### Adding Global Credentials

1. On the Global (all policies) sub-tab, click + Add Credential
2. Select the Service (e.g., Global Forest Watch)
3. Select the Mode (Production or Dry Run)
4. Enter the API key / token
5. Click Save

The credential appears in the table showing Service, Mode, Updated date, and a Delete action.

<br>

<img src="../../../../.gitbook/assets/unknown (5).png" alt="" height="192" width="665">

#### Adding Per-Policy Credentials

1. Switch to the Per policy sub-tab
2. Select a policy from the dropdown
3. Click + Add Credential
4. Fill in Service, Mode, and token value
5. Click Save

Note: credentials will shown only when policy selected. Note: Credentials are shown only when a policy is selected.

#### Deleting Credentials

Click the trash icon next to any credential entry. The secret is removed from both the metadata database and the secure key storage.

### User Configuration

#### Accessing Credentials Settings

Navigate to Profile → Credentials tab.

Credentials set up by the SR are shown with the **Set by SR** label. If a user tries to save their own credentials in this case, the system asks for confirmation.

<br>

<img src="../../../../.gitbook/assets/unknown (8).png" alt="" height="419" width="665">

#### Adding Credentials

The interface is identical to the SR configuration. Users can add credentials at:

* Global (all policies) — applies wherever the user participates
* Per policy — overrides global for a specific policy

<br>

<img src="../../../../.gitbook/assets/unknown (9).png" alt="" height="219" width="665">

Note: User-level credentials take priority over SR-level credentials. If a user sets their own API key for a service, it will be used instead of the SR's key. Note: User-level credentials take priority over SR-level credentials. If a user sets their own API key for a service, Guardian uses it instead of the SR key.

### Credential Resolution

#### How It Works

When an Integration Button Block executes in a policy, the system automatically resolves credentials:

1. Checks the precedence chain (User+Policy → User+Global → SR+Policy → SR+Global)
2. If a credential is found, it is retrieved from secure storage and passed to the integration service
3. If no credential is found at any custom level, the service falls back to the instance-level environment variable

#### Dry Run vs Production

Credentials are stored separately per execution mode:

* When a policy runs in Dry Run mode, only credentials marked as Dry Run are resolved
* When a policy runs in Production mode, only Production credentials are resolved
* If no mode-specific credential exists, the instance-level environment variable is used as fallback (no mode separation at instance level)

#### Security

* Credential secret values are never returned in API responses
* The credentials table shows only metadata: service type, mode, and last updated date
* Secrets are stored in the configured Secret Manager backend (Vault, AWS, Azure, GCP, or database in dev mode)
* Credentials are not included in policy export artifacts

#### Supported Services

| Service             | Required Field | Environment Variable Fallback   |
| ------------------- | -------------- | ------------------------------- |
| Global Forest Watch | API Key        | GLOBAL\_FOREST\_WATCH\_API\_KEY |
| Kanop.io            | Bearer Token   | KANOP\_IO\_AUTH\_TOKEN          |
| NASA FIRMS          | Map Key        | FIRMS\_AUTH\_TOKEN              |

Note: World Bank API does not require authentication and is not listed in the credentials management interface.

#### Policy Deletion

When a policy is deleted, all credentials scoped to that policy (both SR-level and user-level) are automatically cleaned up from the database and secure storage.

## Related Issues

* [https://github.com/hashgraph/guardian/issues/5246](https://github.com/hashgraph/guardian/issues/1987)<br>
