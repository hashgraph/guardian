# Proposal for Defining Standards

## Introduction

This document proposes a framework for the establishment and enforcement of standards within the Guardian open source project. These standards, collectively referred to as Guardian Improvement Standards (GIS), aim to ensure consistency, transparency, and quality control in the development and evolution of the Guardian ecosystem.

## Need for Standards in the Guardian Ecosystem

There have been significant efforts made across the blockchain landscape to create standards processes that encourage and enable a global set of participants to contribute to open source development initiatives. Ethereum has set a strong precedent in the open source development space with its Ethereum Improvement Proposal (EIP) process, providing a structured framework to propose, discuss, and implement changes effectively. This approach has been widely adopted in the distributed ledger technology space, demonstrating its efficacy in managing community-driven improvements.

In a similar vein, the Hedera Hashgraph ecosystem uses Hedera Improvement Proposals (HIPs) for proposing new features and collecting community input. HIPs are designed to be technically clear, concise, and as granular as possible to facilitate consensus and implementation. The HIP author is responsible for building consensus within the community and documenting dissenting opinions. Like EIPs, the HIPs are maintained as text files in a versioned repository, providing a historical record of the feature proposals.

Drawing inspiration from both EIP and HIP processes, Guardian can adopt a similar standards process, tentatively called Guardian Improvement Standards (GIS). The GIS will provide a structured framework for proposing and contributing changes and improvements to Guardian, creating a clear path from idea conception to implementation.

## Guardian Improvement Standards (GIS)

Guardian Improvement Standards (GIS) are designed to provide a clear process for proposing, discussing, and implementing improvements in the Guardian ecosystem. These standards are inspired by established practices in the open source community.

A successful GIS proposal should include a detailed description of the proposal, a rationale for the changes, any potential compatibility issues, security considerations, and where applicable, test cases and a reference implementation. The GIS will follow a series of stages and statuses similar to EIP and HIP: Idea, Draft, Review, Last Call, Final, Stagnant, and Withdrawn. This process is designed to ensure thorough review and community consensus before a proposal is implemented.

The GIS introduces two types of standards:

* **Guardian System Standards (GSS):** These standards apply to changes and improvements to the core Guardian application. This could include feature requests and enhancements that affect the operation, functionality, or interoperability of applications using Guardian. GSS are crucial to the ongoing development and refinement of the Guardian, facilitating progress while ensuring consistency and compatibility. Importantly, these changes may have downstream impacts on the wider community and could necessitate adaptations or modifications to platforms leveraging Guardian. This makes it imperative that GSS are clearly defined, widely communicated, and carefully managed to maintain the health and stability of the entire ecosystem.
* **Guardian Policy Standards (GPS):** These standards pertain to the establishment of new open source policies or modifications to existing policies within the Guardian ecosystem. Standards ensure only those policies which align with science-based reporting of ecological benefit claims receive the implicit endorsement of acceptance into the Guardian repo. Clear guidance on the scope and quality of documentation and artifacts necessary to contribute a new policy to the Guardian is critical, ensuring that new ecosystem participants can more effectively understand existing policies available on Guardian, and streamline efforts to create new policies.

## Scope of Standards

The proposed Guardian Improvement Standards cater specifically to enhancements in the form of new features, modifications to existing functionality, or policy changes within the Guardian ecosystem. They provide a platform for community-driven improvements, allowing Guardian's stakeholders to propose changes that they believe would enhance the system.

It's important to note that these standards are not intended to address bugs or issues in the implemented code. Bugs and issues should be reported and addressed through a separate process, which typically involves creating an issue on the implementation’s repository. This distinction ensures that the GIS process remains focused on forward-looking improvements, while maintaining a dedicated channel for addressing and rectifying current system bugs or issues.

## Community Governance and Roles

The success of the Guardian project relies heavily on the community's active participation and commitment. Community roles, responsibilities, and governance structures help define the ways in which various stakeholders can contribute and how decisions are made.

**Project Sponsors:** These are the individuals responsible for setting the direction of the project. They make major decisions, manage resources, and resolve disputes. They also represent the project in public and in relations with other organizations or projects.

**Core Contributors:** Core Contributors are individuals who make significant contributions to the project, such as proposing new features, optimizing existing code, or fixing bugs. They have a deep understanding of the project and its goals, and their work directly influences the project's development.

**Contributors:** Contributors are individuals who contribute to the project in any form. This can include coding, documentation, design, writing, translations, and more. Their contributions may be sporadic or sustained. Many Standard Registry users, who create policies in adherence with the standards we are defining, will be de facto contributors.

**Maintainers:** Maintainers are responsible for the day-to-day operational tasks. This includes managing the code repository, reviewing and merging pull requests, keeping the project's development infrastructure running smoothly, and generally ensuring that the project's standards and procedures are followed.

**Community Members: T**hese are individuals who engage with the project in non-development capacities. They may participate in discussions, provide feedback, test new releases, write tutorials, and help new users.

**Users:** Users are the individuals and entities who use the project's software. They may not contribute directly to the project, but their feedback and usage help guide the project's development.

## Communication Channels

Effective communication is a cornerstone of any successful open-source community. For the Guardian ecosystem, we primarily leverage three channels to facilitate dialogue and collaboration:

* **GitHub**: GitHub serves as our primary platform for code hosting, version control, and collaboration. It's where you can find the latest versions of the codebase, contribute to the project, submit issues, and review ongoing proposals.
* **Weekly Community Calls**: These scheduled calls serve as a platform for structured discussions and updates. It's an opportunity for contributors to present their proposals, share updates on ongoing work, discuss issues, and receive feedback from the Guardian team and the broader community.

## Code of Conduct

Every participant in the Guardian community is asked to adhere to the Code of Conduct, which outlines the behavioral norms we expect from all members of the community. The key points of our Code of Conduct include:

**Respect:** We expect all community members to treat each other with respect and dignity. Disagreements are inevitable in any project, but they should be handled with civility and respect.

**Collaboration:** We encourage all members to work together towards the common goal of improving the Guardian. Open collaboration is the foundation of any open-source project.

**Inclusivity:** The Guardian community is open to everyone, regardless of their background, identity, or level of experience. We strive to create an environment that is welcoming and supportive to all.

**Relevance:** All discussions and content shared within our official communication channels should directly relate to the development, use, and advancement of Guardian. We value focused, purposeful dialogue that serves to enrich our community and further our collective goals. To maintain the quality and relevance of our exchanges, we ask participants to refrain from introducing off-topic discussions, including those pertaining to speculative matters such as token prices.

**Reporting Issues:** If a community member violates the Code of Conduct, we encourage others to report it to the Guardian team, who will take appropriate action based on the severity of the violation.

## Conclusion

This document serves as an introduction to the proposed standards for the Guardian project, outlining the key concepts, roles, and communication channels which form the foundation of our collaborative environment. The necessity for standards in the Guardian ecosystem has been established, with a high-level overview of Guardian System Standards (GSS) and Guardian Policy Standards (GPS) introduced.

The structure and processes for drafting, submitting, and approving GSS and GPS proposals require a level of detail beyond the scope of this introductory document. Therefore, these mechanisms will be elaborated upon comprehensively in dedicated standards documents for each category. These subsequent documents will serve as a detailed guide for contributors seeking to propose new features or policy changes. The aim is to ensure clarity, efficiency, and consensus in the decision-making process, driving the continual improvement and evolution of the Guardian project.

By adhering to these standards, we aim to facilitate productive collaboration and innovative development within the Guardian community. We invite all community members to engage in this dynamic process, contributing to the advancement and success of the Guardian ecosystem.
