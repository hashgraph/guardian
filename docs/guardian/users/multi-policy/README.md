# ✖ Multi Policy

It is possible to ‘join’ multiple independent policies, which are hosted/ran by different Guardian instances, into a group in which one policy would be ‘primary’ and the rest ‘dependent’ or ‘secondary’.

In this setup (only) ’primary’ policies are responsible for minting tokens, which thus can be certified to be compliant with other (‘secondary’) policies via links to VPs issued by the ‘secondary’ policies.

The tokens are only minted when the necessary quorum of approvals (by the ‘secondary’ policies) are reached. This enables the creation of tokens for projects which are compliant with multiple policies codifying different methodologies, issued independently by different Standard Registries.

{% hint style="info" %}
**Note:**

1. Synchronization of the policy ‘approvals’ and mints is performed through the Header topic of the ‘primary’ policy.
2. Guardian instances check the topic for the synchronization message on schedule.
{% endhint %}
