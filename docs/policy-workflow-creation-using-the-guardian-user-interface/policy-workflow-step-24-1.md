# Policy Workflow Step 25

Next, we click on the “mint\_events”, and then add a mint action by clicking on the “Tokens” drop-down in the top navigation bar and selecting the “Mint” action.

Select the token you want to mint from the token drop down.

You can use the rule field to enter minting calculations that are specific to your policy. We define the Rule to be 1, meaning we will mint exactly the number of tokens defined in the MRV schema multiplied by 1.

Then we click on the “Save” button on the left side in the top navigation bar.

![](../.gitbook/assets/PW\_image\_31.png)

**Programmatically this workflow step looks like this:**

```
    //Minting
    {
      //"mintDocumentBlock" - receives the VC from the previous block and mints based on the rule[s].
      "blockType": "mintDocumentBlock",
      "tag": "mint_token",
      //"tokenId" - ID of the token
      // User should be previously linked with token.
      "tokenId": "0.0.26063342",
      // Rules under which the number of tokens is calculated. Math operations are supported, e.g. the following:
      //  data = { amount: 2 }
      //  rule = "amount * 10"
      // will result in 20 tokens.
      "rule": "1",
      "uiMetaData": {}
    }
  ]
}
```
