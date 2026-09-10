---
description: Understand the Guardian Methodology Library and what it provides.
icon: album-collection
tags:
  - tag: new
    primary: true
  - guide
---

# Methodology Library

The Methodology Library is Guardian's collection of ready-to-use policies and schemas that already digitize real-world environmental methodologies and standards. It is the world's largest open-source repository of digital environmental policies, spanning CDM, Verra, Gold Standard, GHG Protocol, iREC, and community-contributed methodologies.

**The problem it solves**

Digitizing a methodology from scratch is a significant undertaking: designing schemas, encoding a standard's rules into a workflow, and validating it against the source methodology. Most Standard Registries don't need to do this from zero — someone has likely already digitized the methodology they need. The Methodology Library solves this by giving registries a working starting point: import an existing policy, adapt it if needed, and publish, instead of building one from first principles.

**How it works**

Every methodology in the library lives in its own folder, organized by issuing standard (Clean Development Mechanism, Verra, Gold Standard, Climate Action Reserve, iREC, GHG Protocol, and others), alongside community contributions and hackathon submissions. Each folder contains the policy bundle (the digital workflow) and its schema (the data definitions the workflow collects), plus a `policy.yml` manifest describing the policy's id, version, status (`draft`, `candidate`, `active`, `deprecated`, or `superseded`), category, tags, and authors. That manifest is validated in CI against a published schema and tag taxonomy, which is what powers search and filtering across the library.

To use one, a Standard Registry downloads the policy file for the methodology they need and imports it directly into their Guardian instance, where it can be published, tested, and adapted like any other policy.

**Key distinctions**

The Methodology Library is a catalog of already-digitized policies, ready to import. The Methodology Digitalization Handbook is the guide for digitizing a _new_ methodology that isn't in the library yet — use the Library first, and reach for the Handbook when nothing there fits.

A policy is the general Guardian construct for a digital workflow. The Methodology Library is a curated source of pre-built policies, not a platform feature of Guardian itself.

**Related**

* Task: [Import a Policy from the Methodology Library](../guardian/getting-started/hello-world-tutorial.md)
* Reference: [Policy Manifest Spec RFC](../community-and-contributing/community-standards/rfcs/policy_manifest_prd.md)
* Concept: [Methodology Digitalization Best Practices](methodology-digitalization-best-practices.md)
* Concept: [Policies](../guardian/workspace/policies/)
