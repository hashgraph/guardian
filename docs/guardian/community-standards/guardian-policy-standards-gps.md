# Guardian Policy Standards (GPS)

## Introduction

Guardian Policy Standards (GPS) are an essential part of the Guardian ecosystem. They provide the standards for creating, evaluating, and approving open-source policies that underpin the creation of tokenized sustainability assets like Renewable Energy Certificates (RECs) or carbon offsets. The overarching goal of the standards is to ensure that policies endorsed by the Guardian community represent science-based and verifiable claims on environmental impact.

## The Role and Importance of GPS

GPS plays a vital role in enabling a more efficient onboarding of new ecosystem participants, who may want to leverage policies for common asset standards. This is achieved by ensuring that the policies included in the Guardian repository (the "Methodology Library") are easy to understand and implement.

Additionally, policies accepted into the Methodology Library can be seen as having been implicitly endorsed by the Guardian ecosystem. As a result, it is essential for the reputation and credibility of the Guardian to only accept science-based methodologies accepted in the broader market. The GPS process and requirements ensure that the community can thoroughly understand and vet new policies before they are published to the repo.

## GPS Proposal Process

The GPS proposal process involves several stages:

**Idea:** A proposer conceives an idea for a new policy that they believe will benefit the Guardian ecosystem.

**Draft:** The proposer drafts a GPS proposal following the requirements outlined above and submits it to the Guardian repository for review. In the case of a policy revision, release notes must be provided that detail the differences between the prior version of the policy and the new proposer.

**Review:** The responsibility lies with the proposer to drive community review and acceptance. The proposer should solicit feedback and address any questions or concerns raised by the community.

**Accepted:** If the proposal is well-received and meets the requirements for GPS proposals, it will be accepted for development.

**Development:** The proposer or another party works on developing the proposed policy. This includes creating all the required artifacts for acceptance into the Methodology Library.

**Final:** After successful development and community review, the policy is merged into the Methodology Library. The policy owner (as defined in the GPS proposal) is responsible for ongoing maintenance of the policy, and any updates to the policy will adhere to the above process.

## Requirements for GPS Proposals

When drafting a GPS proposal, proposers should ensure that their proposal includes:

**Policy Description:** This should provide a comprehensive overview of the policy, a description of the workflow, a workflow diagram, and a YouTube video explaining the policy in detail, including the workflow and policy execution.

**User Guide:** This should offer clear and detailed instructions on how to implement the policy.

**Automated Policy Workflow with Valid Sample Input Data:** The proposal should include all valid sample input data required to run the policy from start to end.

**IPFS Timestamps and Files:** The proposal should include all IPFS policy timestamps of all the versions of the policy and all types of files such as .policy, .schema, .module (if any), and .JSON (if any).

**Compatibility:** The proposal should specify with which version(s) of the Guardian it is compatible.

**Maintenance and Support Details:** The proposal should provide clear information about the following:

* **Policy Owner:** Proposers must provide clear contact information for the policy owner, enabling users to address any issues or questions directly to the policy owner.
* **Update Schedule:** Proposers should provide an anticipated schedule for reviewing and updating the policy. This schedule could be a regular update (e.g., every three months, annually, etc.), or based on other relevant factors. If no regular updates are planned, this should be clearly stated. The policy submission in the Methodology Library should contain a markdown file that states the date of the last policy update or review, and the subsequent scheduled review.
* **Support Information:** Proposers should outline the level of support users can expect, ranging from community-based assistance to premium commercial support options.

## Policy Maintenance and Updates

Once a policy is approved and included in the Methodology Library, it may require updates or maintenance due to changes in scientific understanding, technological advancements, updates to the Guardian, or community feedback. Proposers should provide a clear plan for maintaining and updating their policy, and the following standards should be followed by the community and maintainers to enforce such plans.

### Maintenance

Maintenance refers to the ongoing development and upkeep of the policy. It is a requirement to ensure the policy remains current and functional within the Guardian ecosystem. The policy owner is the entity defined within the proposal who is responsible for:

* Keeping the policy up-to-date with the latest scientific understanding and relevant standards.
* Addressing any reported issues or bugs within a 1-month period; proposals with active issues that prevent the effective implementation of the policy are moved back to the Development stage until fixes have been implemented.
* Following through with the update schedule as outlined in the GPS proposal, or providing attestation via an updated markdown file to confirm the policy's continued validity if an update is not required.

Should a policy lapse beyond 3 months past its established update schedule without the required attestation or updates, or fail to address reported issues within the 1-month period, it will be considered non-maintained. Non-maintained policies are moved to an archived folder in the repository.

When an update to an existing policy is being submitted, the proposal flows through the existing GPS process, starting at Draft stage, all required artifacts must be present in the proposal, and an additional set of release notes detailing changes must be submitted to streamline the review process and ensure users of the policy understand changes.

### Support

Support for a policy is optional but must be indicated appropriately. Support may be provided by the policy owner or other entities. There are two kinds of support:

**Community Support:** Here, the support comes from the community itself. It might be provided by volunteers, contributors, or other policy users.

**Commercial Support:** This indicates that there is a formal, probably paid, support option. This could be provided by the policy owner, a commercial entity, or a professional services organization.

The level and type of support available for each policy should be clearly communicated to provide clarity for policy users, allowing them to understand what kind of assistance they can expect and where they can find it.

## Conclusion

The Guardian Policy Standards serve as a critical conduit ensuring effective communication and clear delineation of responsibilities between policy proposers, policy owners, and policy users. These standards aim to promote transparency, predictability, and accountability within the Guardian ecosystem. By adhering to these standards, the Guardian community can ensure the development and upkeep of high-quality, science-based policies, thereby fostering an ecosystem where sustainability assets are accurately represented, effectively communicated, and efficiently tokenized.
