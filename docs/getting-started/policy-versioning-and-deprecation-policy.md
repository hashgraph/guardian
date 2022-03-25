---
description: This protocol comes into effect beginning with Guardian 1.3.0
---

# Policy Versioning & Deprecation Policy

Guardian Policy documents capture policy workflows – a combination of policy actions, information flows and rules under which the run-time sequence of steps is constructed and executed. The content of Guardian Policies is determined by the specific sustainability use-case they are designed to address. As such there three main driving forces for the changes in the area of policy definition and management:

* The evolution of the sustainability industry use-case targeted by the policy in questions.&#x20;
* Introduction of new use-cases and corresponding policies.&#x20;
* The evolution of Guardian Policy Engine technology, where new capabilities are added existing modified or removed.&#x20;

These forces result in the following events:&#x20;

* New versions of policies created periodically with arbitrary modifications to the workflow, user roles and information requirements.&#x20;
* New elements (blocks) added to the policy definition language, and/or existing augmented or removed.&#x20;

To avoid breaking existing users, Guardian Policies follow a versioning and deprecation protocol for aspects of the Policies that are targeted to be modified or removed.

### Policy Versioning

The Guardian Policies are versioned using semantic versioning in the major.minor.micro format. Each number incremented sequentially to denote the following changes:&#x20;

* major: the Policy version contains breaking changes.&#x20;
* minor: the Policy version contains notable new capabilities and non-breaking changes.&#x20;
* micro: the Policy release contains non-breaking changes only.&#x20;

Guardian system does not generate versions automatically, it is the responsibility of the Policy authors (Root Authority) to keep track of its policies/versions and correctly reflect changes in the version number.&#x20;

Wherever possible and relevant, Guardian Policy version header contains a reference to the original (paper) document version from the guiding which this policy represents.&#x20;

### Version Compatibility

Guardian Policy authors should take care to ensure that policy workflow blocks, their sequence, properties and parameters are preserved to be backward compatible with earlier versions. A new Policy element should be added to the policy if/when it is necessary to make a non-backward compatible change. Policy workflow sequence or existing elements should be removed/changed in accordance with the API deprecation policy.

### Non - Breaking changes

The non-breaking changes to the Policy which do not warrant the change in the major version number are changes in:&#x20;

* Descriptive UI properties of the block, such as Title, Description, Field Name.&#x20;
* Default state of the element.&#x20;
* Permissions (which actor/entity has rights to interact at this part of the workflow).&#x20;
* Error handling sequence, messages and actions.&#x20;

### Breaking changes

* Removing or renaming a block, changing any of its non-descriptive properties. &#x20;
* Changing used schema version to a new one with breaking changes.&#x20;
* Changing workflow sequence, dependencies or bind block.&#x20;
* Introducing new, or changing existing external data source.&#x20;

### Policy Version Deprecation

Deprecation notice is used to inform the API users that a specific Policy version is now considered obsolete and thus no longer advised for the use in applications. The notice is issued at least 2 months before the end-of-life date, or for the duration or by a deadline mandated by the governing regulation/policy.&#x20;

The notice is issued via a notice message in the corresponding Hedera Topic, and via the Release Notes where the end-of-life date is also specified. On the date of the version expiry, a VC revocation notice is issued into the Hedera Topic. &#x20;

A Policy may be discontinued without prior warning if the existing behavior if incorrect or to patch a security vulnerability.&#x20;

### Policy Definition language

For the purposes of backwards compatibility Guardian differentiates between existing policies and the creation of new policies, and implements separate rules accordingly.&#x20;

At this time Guardian does not version policy language definition separately from the Guardian, for the purposes over distinguishing the language definitions it is recommended to use Guardian release version numbers.&#x20;

### Existing Policies

Due to long-term nature of some sustainability projects Policy Engine (PE) maintains unlimited ‘read’ backward compatibility with 'old’ policy definition language elements. In other words, new PE versions will recognize and be able to process all existing valid policies defined starting from the beginning of Guardian existence.&#x20;

This does not guarantee that all policy elements will be processed in the same way as they previously were, nor displayed in the UI or accessed via APIs in the same way. New versions of Guardian would always recognize blocks/elements correctly, maintain the original policy workflow and meaning of the blocks and elements.&#x20;

A Policy element may become unsupported (ignored for processing triggering a warning) without prior warning if the existing behavior if incorrect or to patch a security vulnerability.&#x20;

### New Policies

Each new version of Guardian may introduce changes to the policy language definition without prior notice. All changes will be reflected in the documentation for the release.&#x20;

Furthermore, the use of ‘obsolete’ elements may become prohibited in the new versions/policies created by the release. To clarify, on such occasions any ‘old’ versions or policies would continue be supported in-use (in already established and/or new projects). However, any new policies, including when created by copying the ‘old’ valid policy, containing the obsolete elements would not be accepted for ‘publishing’. The authors would be required to remove/replace the ‘obsolete’ blocks with new ones to create an acceptable policy definition.&#x20;
