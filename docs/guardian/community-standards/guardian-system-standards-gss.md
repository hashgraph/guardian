# Guardian System Standards (GSS)

## Introduction

The Guardian System Standards (GSS) govern system-wide changes within the Guardian ecosystem. The GSS, inspired by the Hedera Improvement Proposals (HIPs) and Ethereum Improvement Proposals (EIPs), standardize substantial modifications to the Guardian application to ensure transparency, comprehensive documentation, and careful consideration.

## The Role and Importance of GSS

The GSS are instrumental in shaping the Guardian ecosystem's evolution. They offer a transparent, democratic, and structured process for proposing and implementing changes. Adherence to the GSS allows contributors to align their proposals with the Guardian's objectives, thereby increasing the likelihood of adoption. The GSS also serve as a historical record of all substantial system changes.

## Scope of GSS

Guardian System Standards are classified into three categories based on their impact and purpose:

**Interoperability GSS:** These GSS cover system-wide changes that impact the interaction between different Guardian components or third-party applications. They propose changes to artifacts, formats, messages, documents, encryption methods, and any other element ensuring interoperability between different Guardian instances and between Guardian and third-party systems such as indexers.

**Informational GSS:** Informational GSS proposals are designed to describe Guardian design issues or provide general guidelines or information to the Guardian community, without proposing a new feature. Although these standards do not necessarily represent a community consensus or recommendation, they contribute to the overall knowledge and understanding of the Guardian system and its operation. It is important to note that while Informational GSS provides valuable insights, users and implementers are free to ignore or follow their direction as they see fit.

**Process GSS:** Process GSS proposals outlines the processes surrounding Guardian or proposes changes to existing processes. Unlike Informational GSS proposals, these standards often require community consensus and are more than just recommendations; users are typically not free to ignore them. Examples of Process GSS proposals include procedures, guidelines, changes to the decision-making process, or any other aspect that influences how the Guardian ecosystem operates. Any meta-GSS, i.e., a proposal about the GSS process itself, is also considered a Process GSS.

Individual feature requests, while integral to the growth and evolution of the Guardian ecosystem, do not always require adherence to the GSS process. Specifically, requests that (a) propose minor, application-specific changes or additions, and (b) do not significantly impact the system's interoperability, are outside the scope of GSS process and requirements.

However, feature requests that require substantial funding or carry a broader impact on the Guardian ecosystem may still benefit from a formal proposal process akin to GSS. The GSS-like process ensures alignment with Guardian's overall goals and provides a platform for consensus-building within the community. This approach allows for a balance between flexibility in implementing new functionalities and thorough scrutiny for substantial changes.

## GSS Proposal Process

The GSS proposal process provides a structured pathway for proposing, discussing, and implementing significant changes to the Guardian ecosystem. The process consists of the following stages:

**Idea:** Initially, a proposal starts as an idea for improving the Guardian ecosystem. This idea could originate from anyone within the community - a developer, a user, or even a project sponsor. Prior to creation of a draft GSS, ideas can be discussed in a public forum such as Slack or Discord for preliminary feedback.

**Draft:** Once the idea is well-formed, it needs to be written as a draft GSS. This draft should follow the GSS proposal structure and include all the required artifacts. The draft is then submitted as a pull request, marked as \[DRAFT] in the title, to the Guardian GitHub repository, where it becomes a formal GSS proposal. At this point, the proposal is open for discussion and feedback from the community.

**Review:** After the proposal is submitted, it enters the review phase. Here, the proposal's author is responsible for driving discussion and gaining broad support from the community. The author should be prepared to revise their proposal in response to feedback.

**Last Call for Review:** If the proposal meets the necessary criteria and has received broad support, it moves into the "Last Call" stage, which is a final opportunity for the community to review and comment. This stage lasts for a minimum of 14 days.

**Accepted:** If there are no substantial objections or changes requested during the Last Call stage, the proposal becomes accepted. If a community member proposes a GSS but is unable to implement it themselves, the Project Sponsors may allocate the feature or change to the backlog of a core contributor.

**Development:** In this stage, the accepted proposal needs to be developed. Any downstream impacts or breaking changes need to be implemented, and API deprecation policies need to be followed. This stage is necessary to ensure that the proposal is technically feasible and will not disrupt the stability of the Guardian ecosystem.

**Final:** Once the development phase is complete, the Maintainer is responsible for merging the code into the Guardian repository. At this point, the proposal becomes a final GSS and serves as a permanent historical record detailing the change and the reasoning behind it.

Note that, during these stages, a proposal can be rejected by the Project Sponsors or Maintainer if it does not meet the necessary criteria, would result in breaking changes that negatively impact other ecosystem participants beyond the benefits of the proposal, or otherwise does not align with the strategic direction of the ecosystem.

## Requirements for GSS Proposals

To ensure clarity and effectiveness, GSS proposals should adhere to the following requirements:

### Proposal Structure

The proposal should be clear, concise, and well-structured to facilitate understanding and discussion. At a minimum, a GSS proposal should include:

**Preamble:** This should include details such as the GSS number, title, author, type (application, informational, or process), status, and the date of creation.

**Abstract:** A short (\~200 word) description of the technical issue being addressed.

**Motivation:** A clear justification for the proposed change. This should identify the problem being solved and why it is important to solve it.

**Specification:** A detailed description of the new feature or change. This should be detailed enough to allow someone else to implement the proposal.

**Rationale:** The reasoning behind the design decisions in the specification. This section should answer any questions about why certain design decisions were made.

**Backwards Compatibility:** An analysis of how the proposal will affect existing implementations. If the proposal is not backwards compatible, this section should include a justification for why the benefits outweigh the drawbacks.

**Test Cases:** Examples of how the proposal will work, demonstrated through test cases.

**Implementation:** A reference to the implementation of the proposal. This could be code, a detailed procedural description, or a link to a reference implementation.

**Security Considerations:** Any potential security implications of the proposed changes. This could include a discussion of possible attack vectors and their likelihood, or other security risks.

**Copyright Waiver:** A statement that the proposal is licensed under Apache 2.0 in alignment with the broader Guardian application.&#x20;

The format and structure of a GSS proposal should be designed to facilitate discussion and decision-making. It should clearly present the problem, the proposed solution, and the rationale behind the proposed solution. By following this structure, the community can effectively evaluate and decide on the proposal.

### Operational Requirements for Merging Application GSS

The Guardian repository is under constant development, and as a result, the process of merging new features or changes requires careful attention. Typically, development occurs on the develop branch, with features merged into the main branch prior to a release. It is recommended that any new changes are developed in a feature branch, which can then be merged into the develop branch following the outlined process.

Before submitting a Pull Request, it is crucial to ensure that it meets the following requirements, which serve as a checklist for successful submission:

**Includes tests:** The PR should include tests that exercise the new behavior. This ensures the implemented feature or change works as expected.

**Code Documentation:** All code, especially public and user-facing constructs, should be clearly documented. This makes it easier for others to understand the purpose and function of your code.

**Linting and Tests:** Run local linting and tests to ensure they pass successfully. This is to verify the code quality and functional correctness.

**Detailed Commit Message:** The Git commit message accompanying the PR should be detailed and include the context behind the change. This helps others to understand the reasoning behind your changes and makes future reference easier.

**Reference to Related Issues:** The PRs should help to keep track of related changes and discussions.

Adhering to this checklist before PR submission not only improves the quality of the submission but also expedites the review process, fostering a more efficient development environment.

Long-lived pull requests will present challenges due to their need for continuous rebase and integration tests, which is required to ensure that proposed changes are in sync and compatible with the latest version of the Guardian's main codebase. To improve the workflow, it is recommended that PRs to be merged are flagged for review by the Maintainer once initial testing is complete. Once the Maintainer has signaled approval for the PR as part of an upcoming release, the Contributor should rebase to the most recent version of the develop branch and perform integration tests. Once these integration tests have been completed, the Maintainer will merge the PR.

The following is the GSS process for requesting pull request approval:

**Submit a Pull Request:** Contributors should create a pull request detailing the changes made to the codebase. The branch must not be current with the develop branch when the PR is created. Moreover, the branch must have passed all the tests.

**Request Review:** Contributors should assign one or more team members to review and approve the pull request. Feedback should be requested on the changes and ensure reviewers understand the impact of these modifications.

**Rebase Changes:** After receiving feedback from reviewers and passing integration tests, contributors should rebase their changes onto the latest version of the main codebase.

**Perform Integration Tests:** After rebasing with the latest changes from the develop branch, contributors should ensure the introduced changes are compatible with the current version of the application.

**Request Merge of the Pull Request:** Once the PR is approved and all integration tests are passed, contributors should request the merge of the PR. If significant new changes have been introduced on the branch, they will require a fresh round of review before the PR can be merged.

By following this process, Guardian ensures that changes to the codebase are thoroughly reviewed, compatible, and seamlessly integrated, thereby maintaining the robustness and reliability of the software.

## Conclusion

The Guardian System Standards (GSS) play a critical role in shaping the development and progression of the Guardian project. These standards and processes ensure a comprehensive review, testing, and documentation of new features and changes, thereby strengthening the system's robustness and reliability.

The GSS are designed to foster an open, collaborative environment by providing clear guidelines for contributors. The process from the initial proposal to the final implementation is deliberately transparent and inclusive, promoting active participation from all members of the Guardian community.

Effective communication forms a cornerstone of these standards. Regular updates through the Guardian community's established communication channels ensure that all stakeholders stay informed about active GSS proposals. This is particularly important for proposals in the development phase. Clear, timely communication with all stakeholders, especially the codebase Maintainer, is crucial to the successful implementation of new features or changes. This collaborative approach ensures alignment with ongoing work in the application and helps avoid potential conflicts or roadblocks.

By adhering to these standards, we can ensure the Guardian project evolves consistently, sustainably, and beneficially for all stakeholders. These guidelines serve as a roadmap for current and future developments, driving the Guardian project towards its ambitious goal of providing a robust platform for managing and optimizing ESG assets.

\
