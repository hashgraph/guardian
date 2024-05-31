# 👏 Policies,Projects and Topics Mapping Architecture

**Note:**&#x20;

Guardian data migration is supported for published Policy instances which are yet to generate any data, i.e. are 'empty'.

As visible from the below Topic Architecture diagram, for each published Policy instance, irrespective of it being a new version of existing Policy or a new Policy altogether, a corresponding new Topic is created in Hedera. This action is coupled with a notification message sent to an appropriate topic, for the former it is the 'new version' message which is posted into the top-level original Policy Topic, for the latter it is the 'new policy' message which is posted into the Standard Registry Topic.

When Policy instance data is migrated into a new Policy instance, Guardian traverses all corresponding Topics and reposts all the messages, and resubmits all the previously generated documents into the new Topic structure (belonging to the new Policy instance). The documents may also be re-signed by the new Standard Registry if they have been modified (extended) during migration. Each of the messages and documents refer to original message/document in the corresponding "evidence" section of the document JSON.

Thus, the newly migrated data is useable as a stand-alone data tree and is backward compatible with all existing Guardian and 3rd party tools, while at the same time the original trail of documents is referenced and accessible which allows for incontrovertible trail of evidence for data provenance.

<figure><img src="../../.gitbook/assets/Policies,Projects and Topics Mapping Architecture.png" alt=""><figcaption></figcaption></figure>
