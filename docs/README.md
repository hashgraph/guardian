# Welcome

## The official [Hedera Guardian](https://guardian.hedera.com/) documentation

The Hedera Guardian is an open-source platform for creating, managing, and issuing digital environmental assets such as carbon credits, renewable energy certificates, emission disclosures, and others on the Hedera network. It leverages a customizable workflow engine, calculation engine, verifiable-credential based identity management, and web3 technology to ensure transparent and fraud-proof operations, making it a key tool for transforming sustainability practices & environmental markets.

**The problem it solves**

Environmental markets depend on trust: trust that issued credits represent real and verifiable outcomes, that data hasn't been altered, and that the methodology behind a claim is sound. Today that trust is enforced through manual audits, closed registries, and siloed spreadsheets. Guardian makes it programmable — policies encode methodology rules directly, the Hedera Network provides an immutable audit trail, and verifiable credentials let any participant confirm the chain of custody without needing to trust a central intermediary. This helps to lower costs, improve speed and efficiency, and accelerate collaboration across domains such as finance, technology, and ecology.

**Platform at a glance**

Guardian is built around a number of core aspects and understanding how they relate is a good foundation to navigate the docs further.

* **Guardian Policies** are the rules of an environmental methodology — they can include data collection forms, role-based approval workflows, calculations, and dMRV endpoints — as executable software rather than PDF documents. A policy for Verra VM0047 specifies exactly what a project proponent submits, what a verifier approves, and how credits are calculated and issued.
* **Schemas** define the structure of every data submission within a policy — fields, types, and validation rules that make data submissions consistent and machine-readable.
* **Calculation Engine** powered by math blocks and formula linked definitions can be included inGuardian Policies. These are used to calculate emission reductions and application baselines, project, and net GHG emissions, applying leakage, uncertainty, and buffer-pool deductions, as well as converting verified results into credit quantities for token issuance.&#x20;
* **Tokens** are the digital environmental assets produced at key points within a policy workflow and represent outcomes recorded on the Hedera network as fungible or non-fungible tokens.
* **TrustChain** is the verifiable audit trail that links every token back to the original submissions, approvals, and calculations that produced it. Any participant can inspect the full chain of custody without relying on a central intermediary.
* **Standard Registry** is the platform role that publishes policies, onboards project participants, and manages credit issuance. It is the organizing entity for everything that happens in Guardian.
* **Methodology Library** is the world's largest open source repository of digitalized environmental methodologies. Anyone can download, import, inspect, test, and run these methodologies. The authoring process continues to be improved through global collaborations and feedback helping to bring costs down for all.

**Platform adopters and ecosystem**

Adoption of the Guardian has grown from an early concept in 2020 to a platform being used by dozens of companies in climate finance, including the world’s leading carbon standards, auditors, project developers, and enterprises. Ecosystem members have shared back 100+ open source contributors via GitHub, successfully issued numerous types of environmental assets, formed commercial partnerships, and developed the worlds largest open source methodology library. As you explore the platform, you'll notice mature capabilities developed in collaboration with a global ecosystem of stakeholders and community members — who we're grateful and proud of.

**Where to start**

| I want to…                            | Start here                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Understand how Guardian works         | Core Concepts                                                                                                |
| Install and run Guardian              | [Getting Started](<README (1).md>)                                                                           |
| Create and publish policies           | [Standard Registry](guardian/standard-registry/)                                                             |
| Digitize an environmental methodology | [Methodology Digitization Handbook](https://app.gitbook.com/s/bKnJV8vV7zUxRwKIsJKg/methodology-digitization) |
| Build on the Guardian API             | [API Reference](https://app.gitbook.com/o/-LuC734MpqlgwA6zyhAO/s/EmXQ5yJXkOnwN84YXjVq/)                      |

**Open source community**

Establishing trust across climate and environmental markets is a hard, shared problem. No single organization can build the infrastructure that markets need on its own. Guardian exists because the problem requires open collaboration — on methodology digitalization, on verification standards, and technical workflows — to accelerate solutions to tough challenges.

Guardian is open source under the Apache 2.0 License and developed collaboratively by Hashgraph alongside carbon registries, auditors, project developers, governments, and enterprises building on the platform. Policies in the Methodology Library are contributed by organizations worldwide by registries, methodology authors, and independent developers.

Community calls, hands-on training sessions, and design workshops are regularly hosted. If you are building on the Guardian, digitizing a methodology, or improving the platform itself — contributions and feedback is welcome.

* [contributing](community-and-contributing/contributing/ "mention")
* [community-standards](community-and-contributing/community-standards/ "mention")
* [Methodology Library](https://github.com/hashgraph/guardian/tree/main/Methodology%20Library)
* [GitHub Milestones](https://github.com/hashgraph/guardian/milestones?sort=due_date\&direction=asc)
* [Share feedback or suggestions](mailto:guardian-feedback@hashgraph.com)

**Related**

* Concepts: Key Concepts
* Concepts: [Architecture](guardian/architecture/)
* Guide: [Methodology Digitization Handbook](https://app.gitbook.com/s/bKnJV8vV7zUxRwKIsJKg/methodology-digitization)

***

_Guardian is open source under the Apache 2.0 License._
