# Policy Workflow Step 24

Next, we click on the “mint\_events”, and then add a mint action by clicking on the “Tokens” drop-down in the top navigation bar and selecting the “Mint” action.

Select the token you want to mint from the token drop down.

You can use the rule field to enter minting calculations that are specific to your policy. We define the Rule to be 1, meaning we will mint exactly the number of tokens defined in the MRV schema multiplied by 1.

Then we click on the “Save” button on the left side in the top navigation bar.

![](https://i.imgur.com/bhV63AG.png)

**Programmatically this workflow step looks like this:**

```
    //Minting
    {
      //"mintDocument" - receives the VC from the previous block and mints based on the rule[s].
      "blockType": "mintDocument",
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

