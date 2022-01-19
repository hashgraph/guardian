# Prepare new policies

1. Use Guardian UI to create schemas, tokens and policy
2. Export the policy, which will generate a zip file
3. Extract the zip file to `./policies/<policy name>` folder
4. `npm run tools decode-schemas`
5. Replace value of `tokenId` property in extracted filed to `<%= CET_TOKEN_ID %>` or `<%= CRU_TOKEN_ID %>`


