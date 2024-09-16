---
icon: sidebar-flip
---

# Dynamic Token Creation in Guardian Policies using UI

For cases, when it is not known “a priori” how many different tokens will be created by the policy during its execution, the following facilities of CreateTokenBlock could be used to configure dynamic creation of the tokens triggered by policy events. Note that when this approach is used, each token is created and used for minting instances of, on the basis of MRVs produced by/for a specific device, which was represented by a VC passed into the CreateTokenBlock. In other words, the VC of the device becomes 1-to-1 linked with such token ID and later, when Issue Requests are delivered to the MintBlock, the system recognises the device these requests are produced for and mints instances of the corresponding tokens.

## To configure dynamic token creation:

1. In template configuration set **wipeContractId** property:

![Wipe contract property in token template configuration](<../../../.gitbook/assets/0 (20).png>)

2. In template configuration populate variables for token name and token symbol.&#x20;

**Examples:**

* tokenName: Device\_Token\_**${document.credentialSubject.0.id}**
* tokenSymbol: DT\_**${index}**

**${index}** - is predefined variable and allows users to set up the additional variable part of the token number in tokenName or tokenSymbol dynamically at run-time. The value is auto-incremented witch each token mint so users can later differentiate such tokens if they are automatically created.

3. Set **autorun** property in the createTokenBlock - block will automatically create a token without requiring user’s actions (no manual approval will be required).&#x20;

**Requirements:**

* **defaultActive** should be false (preventing showing UI for createTokenBlock)
* All fields in token template must be filled in

![Autorun property in createTokenBlock configuration](<../../../.gitbook/assets/1 (22).png>)

4. Populate **useTemplate** property in the tokenActionBlock, tokenConfirmationBlock

![useTemplate property in tokenActionBlock configuration](<../../../.gitbook/assets/2 (24).png>)
