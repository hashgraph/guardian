---
description: This protocol comes into effect beginning with Guardian 1.3.0
---

# ℹ Policy Versioning & Deprecation Policy

Guardian Policy documents capture policy workflows – a combination of policy actions, information flows and rules under which the run-time sequence of steps is constructed and executed. The content of Guardian Policies is determined by the specific sustainability use-case they are designed to address. As such there three main driving forces for the changes in the area of policy definition and management:

* The evolution of the sustainability industry use-case targeted by the policy in questions.
* Introduction of new use-cases and corresponding policies.
* The evolution of Guardian Policy Engine technology, where new capabilities are added existing modified or removed.

These forces result in the following events:

* New versions of policies created periodically with arbitrary modifications to the workflow, user roles and information requirements.
* New elements (blocks) added to the policy definition language, and/or existing augmented or removed.

To avoid breaking existing users, Guardian Policies follow a versioning and deprecation protocol for aspects of the Policies that are targeted to be modified or removed.

### Policy Versioning

The Guardian Policies are versioned using semantic versioning in the major.minor.micro format. Each number incremented sequentially to denote the following changes:

* major: the Policy version contains breaking changes.
* minor: the Policy version contains notable new capabilities and non-breaking changes.
* micro: the Policy release contains non-breaking changes only.

Guardian system does not generate versions automatically, it is the responsibility of the Policy authors (Standard Registry) to keep track of its policies/versions and correctly reflect changes in the version number.

Wherever possible and relevant, Guardian Policy version header contains a reference to the original (paper) document version from the guiding which this policy represents.

### Version Compatibility

Guardian Policy authors should take care to ensure that policy workflow blocks, their sequence, properties and parameters are preserved to be backward compatible with earlier versions. A new Policy element should be added to the policy if/when it is necessary to make a non-backward compatible change. Policy workflow sequence or existing elements should be removed/changed in accordance with the Policy deprecation policy.

### Non - Breaking changes

The non-breaking changes to the Policy which do not warrant the change in the major version number are changes in:

* Descriptive UI properties of the block, such as Title, Description, Field Name.
* Default state of the element.
* Permissions (which actor/entity has rights to interact at this part of the workflow).
* Error handling sequence, messages and actions.

### Breaking changes

* Removing or renaming a block, changing any of its non-descriptive properties.
* Changing used schema version to a new one with breaking changes.
* Changing workflow sequence, dependencies or bind block.
* Introducing new, or changing existing external data source.

### Policy Version Deprecation

Deprecation notice is used to inform the API users that a specific Policy version is now considered obsolete and thus no longer advised for the use in applications. The notice is issued at least 2 months before the end-of-life date, or for the duration or by a deadline mandated by the governing regulation/policy.

The notice is issued via a notice message in the corresponding Hedera Topic, and via the Release Notes where the end-of-life date is also specified. On the date of the version expiry, a VC revocation notice is issued into the Hedera Topic.

A Policy may be discontinued without prior warning if the existing behavior if incorrect or to patch a security vulnerability.

### Policy Definition language (PDL)

For the purposes of backwards compatibility Guardian differentiates between existing policies and the creation of new policies and implements separate rules accordingly.

Guardian Policy documents feature two independent version numbers, one describing the version, in other words ‘iteration’, of the policy itself (as described in the section above), and the other one describing the version of the PDL that this version of the policy is expressed in. Like the former, the latter uses semantic versioning in the major.minor.micro format. Each number incremented sequentially, the difference in numbers between two documents denote the following differences:

* major: PDL in documents contains breaking changes, manual conversion on import is required.
* minor: PDL in the newer document contains notable new capabilities and non-breaking changes, the policy will be converted into the new format on import automatically.
* micro: the PDL versions contains non-breaking changes only.

Guardian generates PDL versions for Policy document automatically. Each new release of Guardian may or may not bring a new PDL version. However, new PDL versions can only be introduced as part of the new release of Guardian.

### Existing Policies

Due to long-term nature of some sustainability projects Policy Engine (PE) maintains unlimited ‘read’ backward compatibility with 'old’ policy definition language elements. In other words, new PE versions will recognize and be able to process all existing valid policies defined starting from the beginning of Guardian existence.

This does not guarantee that all policy elements will be processed in the same way as they previously were, nor displayed in the UI or accessed via APIs in the same way. New versions of Guardian would always recognize blocks/elements correctly, maintain the original policy workflow and meaning of the blocks and elements.

A Policy element may become unsupported (ignored for processing triggering a warning) without prior warning if the existing behavior if incorrect or to patch a security vulnerability.

### New Policies

Each new version of Guardian may introduce changes to the policy language definition without prior notice. All changes will be reflected in the documentation for the release.

Furthermore, the use of ‘obsolete’ elements may become prohibited in the new versions/policies created by the release. To clarify, on such occasions any ‘old’ versions or policies would continue be supported in-use (in already established and/or new projects). However, any new policies, including when created by copying the ‘old’ valid policy, containing the obsolete elements would not be accepted for ‘publishing’. The authors would be required to remove/replace the ‘obsolete’ blocks with new ones to create an acceptable policy definition.
