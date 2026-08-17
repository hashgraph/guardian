---
description: How automated tests validate Guardian services, APIs, and user interfaces.
icon: bug
---

# Automation Testing

Automation testing verifies that Guardian code changes preserve expected behavior. It runs repeatable checks before changes are released.

{% hint style="info" %}
This article covers automated checks for the Guardian codebase. It does not cover policy authoring tests.
{% endhint %}

#### The problem it solves

Guardian combines services, APIs, and user interfaces. A change in one component can affect another component.

Manual checks are slow and inconsistent. Automated tests detect regressions early and provide repeatable release feedback.

#### How it works

The codebase uses focused unit tests and end-to-end suites. Unit tests validate service behavior in isolation.

End-to-end tests exercise workflows across the running application. The `e2e-tests` directory contains Cypress-based UI and API automation.

These suites verify API responses, user interactions, and cross-service behavior. They support development and release validation.

#### Key distinctions

Automation testing validates the Guardian codebase and its integrations. It tests whether application changes behave correctly.

[Policy Integrity Tests](../../guardian/workspace/policies/dry-run/policy-integrity-tests/) validate declared policy inputs and outputs. They test a policy's behavior, not the Guardian codebase.

[Dry Run mode](https://app.gitbook.com/s/VEIy5NWArZNH7ps6ViQU/guardian/standard-registry/policies/dry-run) simulates policy execution without affecting live systems. It supports safe workflow testing with virtual users and local artifacts.

Automation suites can use dry-run scenarios when validating policy flows. Dry Run mode is not the codebase test framework.

#### Related

* [Performing API Automation Testing](how-to-perform-api-automation-testing.md)
* [Policy Integrity Tests](../../guardian/workspace/policies/dry-run/policy-integrity-tests/)
* [Dry Run Mode Reference](https://app.gitbook.com/s/VEIy5NWArZNH7ps6ViQU/guardian/standard-registry/policies/dry-run/demo-guide-on-dry-run-operations)
