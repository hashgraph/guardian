# Global Events Reader Block

Subscribes to global topics and routes incoming events into policy branches.

* Can subscribe to multiple global topics.
* Reads/handles messages only from topics with Active = ON (OFF = ignore this topic).
* Lets you control subscriptions per topic/stream in the Reader UI:
* Active ON/OFF — ON = read/process, OFF = ignore.
* Hidden (optional) — stays in configuration but is hidden in UI.
* Routes an event into a branch only if validations pass:
* Document type matches branch configuration.
* If configured, the schema matches / validates for that branch.
* If applicable, field filters match.
* Applies filters only for VC, and only when Admin configured a schema for the branch.

## 1.1 Properties

| Property Name                           | Description                                                             | Example                  |
| --------------------------------------- | ----------------------------------------------------------------------- | ------------------------ |
| Default Active (in the block Meta Data) | controls the visibility in the runtime UI                               | Checked/Unchecked        |
| Show Next button                        | enable to use this block inside a Step container.                       | Checked/Unchecked        |
| Global topics                           | the list of default topicIds that Admin adds to the block configuration | 0.0.750....              |
| Active by default                       | controls the visibility of topicID                                      | Checked/Unchecked        |
| Branch event                            | output event name to trigger                                            | branch 1                 |
| Document type                           | expected type for this branch (VC / JSON / CSV / TEXT / ANY)            | VC                       |
| Schema (optional)                       | local policy schema used for VC validation before routing.              | Registrant & Participant |

<figure><img src="../../../../../.gitbook/assets/unknown (2) (1).png" alt=""><figcaption></figcaption></figure>

* Events tab - setting output events to the branches.

<figure><img src="../../../../../.gitbook/assets/unknown (3) (1).png" alt=""><figcaption></figcaption></figure>

## 1.2 API

* Uses the standard policy blocks API (setData), same as other blocks.
* Reader/Writer don’t introduce a new API — they only define their own payload format and supported operation values.

```
Reader payload (Update streams):
{
  "operation": "Update",
  "value": {
    "streams": [
      {
        "globalTopicId": "0.0.7559767",
        "active": true,
        "branchDocumentTypeByBranch": { "branch 1": "vc", "branch 2": "vc" },
        "filterFieldsByBranch": {}
      }
    ]
  }
}
```
