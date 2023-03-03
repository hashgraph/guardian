# Http Request Block

Block for retrieving information from outside (3rd party) services via HTTP requests.

## Properties

| Property Name    | Description                                                                       | Example                   | Status |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------- | ------ |
| Tag              | Unique name for the logic block.                                                  | Http\_Block               |        |
| Permissions      | Which entity has rights to interact at this part of the workflow.                 | Standard Registry         |        |
| Default Active   | Shows whether this block is active at this time and whether it needs to be shown. | Checked or UnChecked      |        |
| Stop Propagation | End processing here, don't pass control to the next block.                        | Checked or UnChecked      |        |
| On Errors        | Called if the system error has occurs in the Block                                | <p>No action<br>Retry</p> |        |
| URL              | URL of the external service end point                                             | http://localhost:8080     |        |
| Method           | HTTP method of the request                                                        | GET/POST/DELETE/PUT/PATCH |        |
| Body             | Body of the HTTP request                                                          | $(document)               |        |
| Headers          | Additional HTTP headers (can be used for authentication purposes)                 | Bearer $(document).Source |        |

<figure><img src="../../../../.gitbook/assets/image (1) (4).png" alt=""><figcaption></figcaption></figure>

## 2. Dynamic Variables

The values of the URL, Body and Header parameters  can contain variables of the format ${variable}.

Possible values are as follows:

* “did” – DID of the current user
* “username” – name of the current user
* “document” or “documents” – a single document or an array of document correspondingly, which have been passed to the block on entry
