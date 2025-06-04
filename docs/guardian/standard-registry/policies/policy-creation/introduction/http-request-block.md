# Http Request Block

Block for retrieving information from outside (3rd party) services via HTTP requests.

## Properties

| Property Name    | Description                                                                       | Example                   | Status |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------- | ------ |
| Tag              | Unique name for the logic block.                                                  | **Http\_Block**           |        |
| Permissions      | Which entity has rights to interact at this part of the workflow.                 | Standard Registry         |        |
| Default Active   | Shows whether this block is active at this time and whether it needs to be shown. | Checked or UnChecked      |        |
| Stop Propagation | End processing here, don't pass control to the next block.                        | Checked or UnChecked      |        |
| On Errors        | Called if the system error has occurs in the Block                                | <p>No action<br>Retry</p> |        |
| URL              | URL of the external service end point                                             | http://localhost:8080     |        |
| Method           | HTTP method of the request                                                        | GET/POST/DELETE/PUT/PATCH |        |
| Body             | Body of the HTTP request                                                          | $(document)               |        |
| Headers          | Additional HTTP headers (can be used for authentication purposes)                 | Bearer $(document).Source |        |

<figure><img src="../../../../../.gitbook/assets/image (1) (4) (1).png" alt=""><figcaption></figcaption></figure>

To prevent sensitive headers such as Bearer tokens from being published to IPFS during policy export, an "Include value in exported policy" checkbox was added to each HTTP header in the httpRequestBlock.

This mechanism ensures that secrets are not accidentally leaked when the policy is published and stored on IPFS.

{% hint style="info" %}
Note:

1. By default, this checkbox is set to false, meaning the header's value will not be included in the exported policy.
2. If a header has a value but the "Include" option is not enabled, publishing the policy will fail with a validation error. The user must either enable the checkbox or remove the header value.
{% endhint %}

## 2. Dynamic Variables

The values of the URL, Body and Header parameters can contain variables of the format ${variable}.

Possible values are as follows:

* “did” – DID of the current user
* “username” – name of the current user
* “document” or “documents” – a single document or an array of document correspondingly, which have been passed to the block on entry
