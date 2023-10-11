---
description: This policy comes into effect beginning with Guardian 1.2.0
---

# ℹ API Versioning & Deprecation Policy

Guardian platform is evolving rapidly, the development team is constantly adding new capabilities to expand the set of supported use-cases. Additionally, sustainability industry is evolving at a fast pace, which further accelerated the speed of evolution of the platform. As much as the development team would like to have a permanently stable API, changes in the underlying platform functionality must be reflected in the API to ‘expose’ them to the end users and enable the development of new applications or new integrations. Inevitably this can result in some features needed to be removed, some APIs becoming obsolete, which means they eventually need to be replaced with new more advanced versions.

To avoid breaking existing users, Guardian follows a deprecation policy for aspects of the system that are slated to be removed.

### API Versioning

The Guardian API is versioned using semantic versioning in the major.minor.micro format. Each number incremented sequentially to denote the following changes:

* major: the API release contains breaking changes.
* minor: the API release contains notable new capabilities and non-breaking changes.
* micro: the API release contains non-breaking changes only.

### Compatibility policy

Wherever possible, API resources, operations, parameters, and models are kept backward compatible with earlier versions. A new API element is created if/when it is necessary to make a non-backward compatible change. The old API element is maintained in accordance with the API deprecation policy.

#### Non-Breaking changes

The non-breaking changes to the API which do not warrant the change in the major version number include two types:

* Additions
  * New optional fields and headers
  * New allowed value
  * New HTTP method to an API interface
  * New resource URI extending existing endpoint
  * New error condition covered by an existing error message
* Changes in the description

#### Breaking changes

* Removing an API endpoint, HTTP method or enum value
* Renaming an API endpoint, HTTP method or enum value
* Changing the type of the field
* Changing behavior of an API requests

### Deprecation policy

Deprecation notice is used to inform the API users that a specific API facility is now considered obsolete and thus no longer advised for the use in applications. The notice is issued at least 4 months before the end-of-life date.

The notice is issued via Swagger, where API being deprecated are marked with the deprecated tag, and via the Release Notes where the end-of-life date is also specified.

An API may be changed without prior warning if the existing behavior if incorrect or to patch a security vulnerability.
