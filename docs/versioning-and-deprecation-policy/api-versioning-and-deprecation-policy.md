---
description: This policy comes into effect beginning with Guardian 1.2.0
---

# API Versioning & Deprecation Policy

Guardian platform is evolving rapidly, the development team is constantly adding new capabilities to expand the set of supported use-cases. Additionally, sustainability industry is evolving at a fast pace, which further accelerated the speed of evolution of the platform. As much as the development team would like to have a permanently stable API, changes in the underlying platform functionality must be reflected in the API to ‘expose’ them to the end users and enable the development of new applications or new integrations. Inevitably this can result in some features needed to be removed, some APIs becoming obsolete, which means they eventually need to be replaced with new more advanced versions.

To avoid breaking existing users, Guardian follows a deprecation policy for aspects of the system that are slated to be removed.

### API Versioning

The Guardian API is versioned using semantic versioning in the major.minor.micro format. Each number incremented sequentially to denote the following changes:&#x20;

* major: the API release contains breaking changes.&#x20;
* minor: the API release contains notable new capabilities and non-breaking changes.&#x20;
* micro: the API release contains non-breaking changes only.&#x20;

### Compatibility policy

Wherever possible, API resources, operations, parameters, and models are kept backward compatible with earlier versions. A new API element is created if/when it is necessary to make a non-backward compatible change. The old API element is maintained in accordance with the API deprecation policy.

#### Non-Breaking changes

The non-breaking changes to the API which do not warrant the change in the major version number include two types:

* Additions
  * New optional fields and headers&#x20;
  * New allowed value&#x20;
  * New HTTP method to an API interface&#x20;
  * New resource URI extending existing endpoint&#x20;
  * New error condition covered by an existing error message&#x20;
* Changes in the description&#x20;

#### Breaking changes&#x20;

* Removing an API endpoint, HTTP method or enum value&#x20;
* Renaming an API endpoint, HTTP method or enum value&#x20;
* Changing the type of the field&#x20;
* Changing behavior of an API requests&#x20;

### Deprecation policy

Deprecation notice is used to inform the API users that a specific API facility is now considered obsolete and thus no longer advised for the use in applications. The notice is issued at least 4 months before the end-of-life date.&#x20;

The notice is issued via Swagger, where API being deprecated are marked with the deprecated tag, and via the Release Notes where the end-of-life date is also specified.&#x20;

An API may be changed without prior warning if the existing behavior if incorrect or to patch a security vulnerability.&#x20;
