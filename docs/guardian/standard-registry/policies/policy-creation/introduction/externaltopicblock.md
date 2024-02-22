# externalTopicBlock

This block allows to configure the link to Hedera topics established by other policy instances for monitoring of ‘document published’ messages and ingestion of the targeted VC documents.

<figure><img src="../../../../../.gitbook/assets/image (11) (3).png" alt=""><figcaption></figcaption></figure>

## 1.1 Properties

| Property Name    | Description                                                                                                                                                                                                                                                                                                  | Example                       | Status |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ------ |
| Tag              | Unique name for the logic block.                                                                                                                                                                                                                                                                             | **externalTopic**             |        |
| Permissions      | Which entity has rights to interact at this part of the workflow.                                                                                                                                                                                                                                            | Standard Registry             |        |
| Default Active   | Shows whether this block is active at this time and whether it needs to be shown.                                                                                                                                                                                                                            | Checked or Unchecked          |        |
| Stop Propagation | End processing here, don't pass control to the next block.                                                                                                                                                                                                                                                   | Checked or Unchecked          |        |
| On Errors        | Called if the system error has occurs in the Block                                                                                                                                                                                                                                                           | <p>- No action<br>- Retry</p> |        |
| Schema           | a schema containing the minimal structure/content requirements for the VC documents to comply with in order to be ingested from the topic. A compliant document can be a super set of the minimal schema, i.e. it can contain other properties/data so long as it also has what is specified in this schema. | Schema                        |        |

## 1.2 Data Format

### 1.2.1 GET

```
{
    documentTopicId – topic which contains links to documents to be ingested (optional/required depending on the stage in the workflow)
    policyTopicId – topic which contains policy messages (optional/required depending on the stage in the workflow)
    instanceTopicId – topic which contains policy instance specific messages (optional/required depending on the stage in the workflow)
    documentMessage – message with the information about the document topic(documentTopicId)
    policyMessage – message with the information about the policy topic(policyTopicId)
    policyInstanceMessage – message with the information about the policy instance topic(instanceTopicId)
    schemas – schemas accessible in the select policy (if specified)
    schema – schema which was selected by the user
    lastUpdate – time stamp of the last synchronisation
    status – link status
}

```

### 1.2.2 POST

* **Topic selection** – allow the user to specify the topic which contains messages about the documents to be ingested.

```
{
    "operation": "SetTopic",
    "value": "topicId"
}
```

* **Schema selection** – allows the user to specify the schema for selecting (filtering) the documents to be ingested.

```
{
    "operation": "SetSchema",
    "value": "schemaId"
}
```

* **Schema verification** – verifies if the selected schema is compliant with the settings of the block

```
{
    "operation": "VerificationSchema",
    "value": "schemaId"
}
```

* **Manual loading of the documents** – triggers immediate (out of schedule) synchronization of the documents (the automatic synchronization will still takes place as per the schedule)

```
{
    "operation": "VerificationSchemas",
}
```

* **Reset of the link** – allows to reset settings and specify afresh.

```
{
    "operation": "Restart",
}
```
