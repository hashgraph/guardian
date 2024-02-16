---
description: This is an Alpha Version
---

# 📔 User Guide

## Overview <a href="#_xw1hte24c5p" id="_xw1hte24c5p"></a>

By default Guardian publishes project info and MRV data to IPFS in plaintext so that it is viewable by anyone examining the trust chain of an asset. While transparency of the trust chain is critical to establishing confidence in the qualities of an asset, and so its price, complete public transparency creates challenges for certain types of data.

The Guardian Selective Disclosure (SD) mechanism supports a more granular access model in which particular attributes may be protected against viewing by the public and instead will be viewable only by authorized parties like a VVB, ARMM or similar with a justifiable need for that information.

This guide provides an overview of the SD Mechanism, how it is configured and used, and consideration for that use

### Selective Disclosure Use Cases <a href="#_b9e5d4yg5h00" id="_b9e5d4yg5h00"></a>

We can distinguish at a high level the nature of the attributes that Guardian deals with and so the reason for which it might be desirable to treat them as private with the SD mechanism

* **Privacy** - identity attributes associated with a human actor and so warranting or requiring privacy protections. For example, a farmer may not wish the specific street address or precise geolocation of their carbon sequestering farm to be fully public for the privacy risk that might create. Nevertheless , this information is likely necessary for a VVB validating the farm’s project info and so justifiable.
* **Confidentiality** - business attributes associated with a company’s processes and so possibly warranting protection against undesirable leakage to competitors. For example, a manufacturing firm recording emissions may want to obfuscate some level of detail about the throughput of their manufacturing line for fear of a competitor deducing intellectual property from those details. Nevertheless , this granular information is likely necessary for a reporting auditor verifying the emissions calculation of CO2/item from MRV data.

Another distinction is between project info and MRV data. Validation of project info is done infrequently, e.g. at initial project onboarding and perhaps an additional validation on a yearly frequency. Consequently, using the SD mechanism to protect certain attributes within such project info would arguably impose an acceptable burden on a VVB performing the validation and so needing to follow the extra step of requesting that project data (as described below).

Conversely, MRV data may be recorded and published on a much higher frequency, with a corresponding need for more frequent verification. Applying SD to high frequency MRV data, with a corresponding requirement for high frequency of requesting private attributes, may create an unacceptable processing burden on MRV verification.

### Selective Disclosure Model <a href="#_w5eiwxu6e19q" id="_w5eiwxu6e19q"></a>

The default Guardian model for publishing data as part of a provenance chain is:

1. **Guardian Admin** defines a schema for a given document type, e,g, for project info or MRV data
2. When a document is subsequently created based on that schema, a public VC is created
3. A public VP is created from that public VC
4. Public VP is published to IPFS. The public VP CID is indexed via an HCS message so it can be found
5. All can view the attributes within the public VP

The SD model is

1. **Admin** defines schema a schema for a given document type, e,g, for project info or MRV data
   1. Via a **Guardian**, stipulates one attribute(s) is private
   2. Via a **Pex Responder**, specifies the criteria/roles that can access the private attribute
2. When the Guardian subsequently creates a document based on that schema,
   1. A private VC is created. The private VC is signed with BBS. BBS makes it possible to create a public VP from the private VC that does not include the private attributes but the signature is still verifiable.
   2. A public VP is created from the public VC
   3. The private VC is encrypted (for a \*\*Pex Responder(\*\*s) ) with the appropriate public key obtained by resolving the **Pex Responder** DID
   4. Both the public VP and encrypted VC are published to IPFS. The public VP CID is indexed via an HCS message so it can be found.
3. All can view the attributes within the public VP

Later…

1. An **authorized party**
   1. Becomes aware of the public VP, and the availability of the private attributes and deems it of interest
   2. Via a **Pex Requestor** interface, sends a request to a **Pex Responder** service
      1. Asking for a private VP containing the private attributes via a presentation request.
      2. The presentation request includes the **authorized party**’s own VC asserting their qualifications/authorizations
2. The **Pex Responder**
   1. Compares the authorized party’s qualifications sent in the presentation request to the authorization policy defined by the admin for the private attribute
   2. If the request is authorized
      1. Retrieves & decrypts the encrypted private VC from IPFS
      2. Creates a private VP using the private VC
      3. Encrypts the private VP and uploads to HFS
      4. Responds to the requesting party (via HCS) of the availability of the encrypted private VP and the relevant file identifier
3. The **authorized party**
   1. Retrieves the encrypted private VP from HFS
   2. Decrypts the private VP using its private key, and validates the signature
   3. Views the private attributes within

The high level sequence is shown below:

![](<../../../.gitbook/assets/0 (4) (1).png>)

### 'Supply' Side <a href="#_bakygsypldnr" id="_bakygsypldnr"></a>

A Guardian admin triggers the SD mechanism by stipulating that a particular schema is type “Encrypted Verifiable Credential”, and specifies some attributes as private. To get complete information, please check [selective-disclosure-demo.md](selective-disclosure-demo.md "mention")

With the configuration, whenever in the future that Guardian creates a VC complying to that schema - it will follow the SD sequence and not the default .

### Considerations <a href="#_wpykyf38v0u8" id="_wpykyf38v0u8"></a>

Transparency is fundamental to the premise of trusting the provenance chain for an asset. SD could be seen as being in opposition to transparency as it creates the possibility that a given actor examining an asset’s provenance chain will not be able to view all its aspects - if those are defined as private and they do not meet the defined qualifications for access.

Another consideration is asset valuation. All else being equal, if two assets have identical provenance chains (in terms of additionality, MRV quality & integrity etc) then that with some attributes of that chain accessible only via the above requesting process may well be deemed less valuable than that with no such restrictions. As such, it's possible that the partially private asset will be priced lower than the fully transparent asset.

If the underlying methodology stipulates that an attribute is required, then protecting that attribute via Selective Disclosure could be seen as breaking compliance with the methodology - this likely dependent on what roles would be able to view those private attributes. For instance, if a private attribute is accessible by an accredited Verra VVB but not the general public, then it could be argued that this is still consistent with a Verra standard that stipulates that attribute as required and not optional.

For those applications (like an ARMM) that automate processing of trust chains and the attributes within - SD may complicate that process. Even if that application can satisfy the access rules for viewing private attributes - it might be the case that each private VC would require an independent & separate request for the corresponding private VP - a potentially significant processing burden.

Consequently, Guardian policy admins should be cautious in their use of the SD mechanism.
