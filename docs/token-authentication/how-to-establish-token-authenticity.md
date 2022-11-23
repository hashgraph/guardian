# ℹ Establishing Token Authenticity

1. Get the serial number from the Token and check if the Token ID is compatible with Guardian
2. Find the Transaction ID of the minted token.
3. Take the MEMO value (which is the Hedera message timestamp) and add it to the URL after the `/messages/` to get a message from a Hedera Mirror Node, which represents the creation and logging of VP.
4. Check whether the topic ID is valid for Guardian
5. Examine the message contents and take the URL attribute values, which is an IPFS link with CID.
6. VP can be displayed when the above IPFS link is copied and pasted to the browser.
7. VP contents are displayed and verified by checking following contents:
   * Confirm it maps to the appropriate tokenID (this is logically a challenge that the VP represents a response to)
   * Verify signatures, retrieve DIDs as necessary
   * Confirm the MRV data that meets the criteria of the policy.

For a working example, please check [FAQs](../faqs/faqs.md) Question no. 17.

#### To get a visual representation on the above process, please check [Detailed Architecture Diagram](../guardian-architecture/schema-architecture.md).
