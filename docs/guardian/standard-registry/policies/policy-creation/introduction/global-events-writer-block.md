# Global Events Writer Block

Publishes document references to one or more global Hedera topics.

* Publishes reference/metadata only (does not create, update, or re-anchor the document).
* Can publish to multiple global topics.
* Publishes each time the block is executed in the policy flow.
* Lets you control publishing per topic/stream in the Writer UI:
* Active ON/OFF — ON = publish, OFF = skip.
* Hidden (optional) — stays in configuration but is hidden in UI.
* Document Type — set per-topic type (vc/json/csv/text/any).

<figure><img src="../../../../../.gitbook/assets/unknown.png" alt=""><figcaption></figcaption></figure>

## 1.1 Properties

| Property Name                          | Description                                                                                               | Example           |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------- |
| Default Active(in the block Meta Data) | controls the visibility in the runtime UI                                                                 | Checked/Unchecked |
| Show Next button                       | enable to use this block inside a Step container                                                          | Checked/Unchecked |
| Global topics                          | the list of default topicIds that Admin adds to the block configuration                                   | 0.0.7559767       |
| Active by default                      | controls the visibility                                                                                   | Checked/Unchecked |
| Document type                          | which documentType the Writer writes into the event message for this topic (VC / JSON / CSV / TEXT / ANY) | VC                |

<figure><img src="../../../../../.gitbook/assets/unknown (1).png" alt=""><figcaption></figcaption></figure>

## 1.2 API

* Uses the standard policy blocks API (setData), same as other blocks.
* Reader/Writer don’t introduce a new API — they only define their own payload format and supported operation values.

```
Writer payload (Update streams):
{
  "operation": "Update",
  "streams": [
    { "topicId": "0.0.45345345", "documentType": "vc", "active": true }
  ]
}
```
