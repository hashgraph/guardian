# Policy Workflow Step 23



Then we add another workflow block below the “mint\_events” block by clicking on the “External Data” button in the top navigation bar which captures the MRV data from the sensors.

We enter the Entity type as MRV and select the Schema from the drop-down as “MRV”

![](https://i.imgur.com/OCHxrkU.png)

**Programmatically this workflow step looks like this:**

```
  "children": [
    // Receive the MRV.
    {
      //"externalDataBlock" - receives data from the external source and passes them over the the next block.
      // Each Policy has a policyTag. Data received onto the external API are filtered by the policyTag, and passed on to all externalDataBlock inside the Policy.
      "blockType": "externalDataBlock",
      "tag": "mrv_source",
      "entityType": "MRV",
      // Filter the documents by schema ID. If the document is not related to the given schema it does not get passed further.
      "schema": "c4623dbd-2453-4c12-941f-032792a00727",
      "uiMetaData": {}
    },
```
