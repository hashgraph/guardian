# How to establish Token Authenticity

1. Begin at the NFT token instance (it has a serial number)
2. Confirm the token identifier is appropriate for this Guardian
3. Find transaction(tx) that minted the NFT
4. Examine mint tx memo - value is an HCS tx timestamp
5. Query mirror for the HCS message tx - it represents the creation and logging of an VP(VC(MRV))
6. Confirm the topic identifier is valid for this Guardian
7. Examine message contents, grab URL param - it is an IPFS CID
8. Resolve CID to retrieve VP(VC(MRV))
9. Examine VP(VC(MRV)
   * Confirm it maps to the appropriate tokenID (this is logically a challenge that the VP represents a response to)
   * Verify signatures, retrieve DIDs as necessary
   * Confirm the MRV data that meets the criteria of the policy.

#### To get a visual representation on the above process, please check [Detailed Architecture Diagram](../guardian-architecture/schema-architecture.md).
