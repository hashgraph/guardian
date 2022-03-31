---
description: This policy comes into effect beginning with Guardian 1.3.0
---

# Schema Versioning & Deprecation Policy

Guardian schema documents specify the content of Verifiable Credentials (VCs) and Verifiable Presentations (VP), which are produced by the Policy Workflow Engine in accordance with the configuration of the specific policy being executed. Effectively, schemas define the input/output ‘data’ part of policy execution, and therefore are constituent part of policy definition. The driving forces for the evolution of policies fully apply to schemas, namely:&#x20;

* The evolution of the sustainability industry use-case targeted by the policy in question. &#x20;
* Introduction of new use-cases and corresponding policies. &#x20;
* The evolution of Guardian Policy Engine technology, where new capabilities are added existing modified or removed.&#x20;

Additionally, building blocks of Guardian schema definition language, e.g. types and other content, must conform to W3C and JSON-LD specifications and as such evolve on a separate schedule. These may require changes in the vocabulary and semantics independently of the driving forces highlighted above.&#x20;

These processes result in the following changes:&#x20;

* New version of schemas created periodically, with arbitrary modifications to the structure.&#x20;
* New elements are added to the schema vocabulary, and/or existing elements augmented or removed.&#x20;

### Schema Versioning

Guardian Schemas are versioned using semantic versioning in the major.minor.micro format. Each number incremented sequentially to denote the following changes:&#x20;

* major: the Schema version contains breaking changes.&#x20;
* minor: the Schema version contains notable new capabilities and non-breaking changes.&#x20;
* micro: the Schema release contains non-breaking changes only.&#x20;

Guardian system does not generate versions automatically, it is the responsibility of the Schema authors (Root Authority) to keep track of its policies/versions and correctly reflect changes in the version number.&#x20;

Wherever possible and relevant, Guardian Schema version header contains a reference to the original (paper) document version from the guiding which this schema represents.&#x20;

### Version Compatibility

Guardian Schema authors should take care to ensure that schema content is preserved to be backward compatible with earlier versions. A new Schema element should be added to the schema definition if/when it is necessary to make a non-backward compatible change. Schema existing elements should be removed/changed in accordance with the Schema deprecation policy.&#x20;

### Non-breaking changes&#x20;

The non-breaking changes to the Schema which do not warrant the change in the major version number are changes in:&#x20;

* Changes in value to the descriptive elements, such as title, description and comment.&#x20;
* Required/optional state of the element.&#x20;
* New enum value in the “oneOf” element.&#x20;
* New elements added to the schema not affecting existing elements in any way.&#x20;

### Breaking changes&#x20;

* Removing or renaming an element, changing any of its non-descriptive properties e.g. type or readOnly status. &#x20;
* Changing in the values of ID elements.&#x20;

### Schema version deprecation&#x20;

Deprecation notice is used to inform the API users that a specific Schema version or an element is now considered obsolete and thus no longer advised for the use in applications. The notice is issued at least 2 months before the end-of-life date.&#x20;

The notice is issued via the deprecated meta-data annotation, and via the Release Notes where the end-of-life date is also specified. On the date of the version expiry, a VC revocation notice is issued into the corresponding Hedera Topic. &#x20;

A Schema may be discontinued without prior warning if the existing behaviour if incorrect or to patch a security vulnerability.&#x20;

### Schema definition language&#x20;

For the purposes of backwards compatibility Guardian differentiates between existing schemas and the creation of new schemas, and implements separate rules accordingly.&#x20;

At this time Guardian does not version policy language definition separately from the Guardian, for the purposes over distinguishing the language definitions it is recommended to use Guardian release version numbers.&#x20;

### Existing schemas&#x20;

Due to long-term nature of some sustainability projects Policy Engine (PE) maintains unlimited ‘read’ backward compatibility with 'old’ schema definition language elements. In other words, new PE versions will recognize and be able to process all existing valid policies with schemas defined starting from the beginning of Guardian existence.&#x20;

This does not guarantee that all schema elements will be processed in the same way as they previously were, nor displayed in the UI or accessed via APIs in the same way. New versions of Guardian would always recognize blocks/elements correctly, maintain the original policy workflow and meaning of the schema elements.&#x20;

A schema element may become unsupported (ignored for processing triggering a warning) without prior warning if the existing behavior if incorrect or to patch a security vulnerability.&#x20;

### New schemas&#x20;

Each new version of Guardian may introduce changes to the schema language definition without prior notice. All changes will be reflected in the documentation for the release.&#x20;

Furthermore, the use of ‘obsolete’ elements may become prohibited in the new versions/schemas created by the release. To clarify, on such occasions any ‘old’ versions or schemas would continue be supported in-use (in already established and/or new projects). However, any new schemas, including when created by copying the ‘old’ valid schema, containing the obsolete elements would not be accepted for ‘publishing’ or including into a policy. The authors would be required to remove/replace the ‘obsolete’ elements with new ones to create a supported schema definition.&#x20;
