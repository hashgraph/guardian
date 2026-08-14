---
description: Historical foundations for publishing and tracing Guardian data on Hedera.
---

# Discovering Environmental assets on Hedera

{% hint style="info" %}
HIP-19 and HIP-28 established foundational Hedera capabilities used by Guardian.
{% endhint %}

Guardian publishes policy workflow data to Hedera through these capabilities. They support the discovery and traceability of digital environmental assets.

Guardian records Hedera Consensus Service transactions in topics. A token mint transaction can include a memo identifier that points to a Hedera message timestamp. That message contains the URL of the related Verifiable Presentation (VP).

The VP links the Verifiable Credentials produced by the policy workflow. Together, these records provide the starting point for tracing the documents behind a token.

[HIP-19](https://hips.hedera.com/hip/hip-19) and [HIP-28](https://hips.hedera.com/hip/hip-28) define this foundational approach. Guardian builds on it through the [TrustChain](../platform/trustchain.md).
