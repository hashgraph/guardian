## IREC Methodology

**Policy Description**: 

This policy supports the tokenization of Renewable Energy Certificates (RECs) in accordance with the I-REC Standard, and specifically, the I-REC(E) Product Code. The I-REC Standard is a non-profit organization that provides an attribute tracking standard that can be used around the world. While the I-REC Standard is designed to track attributes for a diversity of products, Product Codes provide additional requitements for specific products and markets. The I-REC(E) Product Code provides requirements for electricity products, and was developed by Evident, who acts as Code Manager and Registry Operator. 
The schema and workflow of this policy were designed to reflect the MRV requirements, processes, and roles outlined by both I-REC Standard and the I-REC(E) Product Code. 

**Workflow Description**:

The workflow begins with the Registrant, generally the owner of an energy production facility or a party acting in their behalf, submitting an application to the Issuer for approval. Once approved, the Registrant submits a registration request to the Issuer for the facility/device that will be providing the MRV data. This will include both general information, as well as attributes (e.g., energy sources, location, etc.). Note that devices must be, and often are already, independently verified. Under certain circumstances an inspection may be necessary. Once the Issuer processed and approves the facility/device registration, an issue request can be sent to the Issuer along with independently verified meter data. After the Issuer approves the issue request, I-REC(E) certificates are issued. 

<img width="1074" alt="image" src="https://user-images.githubusercontent.com/79293833/186931734-b7303b0e-81e5-433f-b71c-509e83dc186b.png">

As the initial step in IREC Policy involve creation of following Schemas: iRec registration applicant details, Inverter, and MRV Schemas,for demo purpose, we have created those schemas and their IPFS timestamps and file links are mentioned in the table below.

**IREC Schema and Policy Versions and their IPFS timestamps:**

| Version | IPFS Timestamp | Differences | Schema/Policy File Link |
|---|---|---|---:|
| iREC Schema | 1674826718.370918003 | - |[Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Schema/iREC%20Schema.schema) |
| Inverter Schema | 1674826729.023904003 | -| [Link](https://github.com/hashgraph/guardian/blob/develop/Methodology%20Library/iREC/Schema/Inverter.schema) |
| MRV Schema | 1674826707.124031003 |- | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Schema/MRV.schema) |
| iREC 1 | 1674820447.688663003 | iRec policy with external MRV sender | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/iRec%20Policy.policy) |
| iREC 2 | 1688026621.869141003 | Implementation of iRec(E) without MRV sender | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/iRec%20Policy%202%20(1688026621.869141003).policy) |
| iREC 3 | 1688026984.195988682 | iRec 2 Policy + revoke actions (Added: Revoke Block, Button Block) | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%203%20(1688026984.195988682).policy) |
| iREC 4 | 1688027112.052916973 | iRec 3 Policy + auto associate and grant KYC token actions (Added: Token Action Block, Token Confirmation Block) | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%204%20(1688027112.052916973).policy) |
| iREC policy 5 group | 1688027497.580638003 | Demonstrates the usage of the new concepts of common groups and multi-signature approvals. Document approval responsibilities are given to the new 'Approver' role, which belongs to a group. Users can become members of the group without the invite, and thereby become approvers. | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%205%20(Groups)%20(1688027497.580638003).policy) |
| IRec Policy 6 search documents | 1688027625.345974003 | The ability to process other than input documents in calculation block (calculateMathVariables block improvement) | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%206%20(Search%20documents)%20(1688027625.345974003).policy) |
| IRec Policy 7 split documents | 1688027742.828152768 | Splitting documents to chunks (added splitBlock) | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%207%20(Split%20documents)%20(1688027742.828152768).policy) |
| IRec Policy 8.1 MBP | 1688027910.989021003 | Policy based on iREC Policy 4 where there are two impacts in one mint block | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%208.1%20(MBP)%20(1688027910.989021003).policy) |
| IRec Policy 8.2 MBP | 1688028085.527386003 | Policy based on iREC Policy 4 where the scenario is that there are two impacts in two different mint blocks | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%208.2%20(MBP)%20(1688028085.527386003).policy) |
| IRec 9 Module | 1688028246.921157003 | Policy based on iREC Policy 4 where we have Modules integrated in the policy | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/iRec%20Policy%209%20(Module)%20(1688028246.921157003).policy) |
| iRec 10 Source | 1688028789.828861780 | Policy based on iREC Policy 4 which breaks on creation of "Issue Request | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/iRec%20Policy%2010%20(Source)%20(1684756995.238994037).policy) |
| iRec 10 Recipient | 1684756995.238994037 | Policy based on iREC Policy 4 which continues with loading "Issue Request" from "iRec 10 Source" | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/iRec%20Policy%2010%20(Recipient)%20(1688028555.527521003).policy) |
| iRec 10 Recipient new TrustChain | 1684756995.238994037 | Policy based on iREC Policy 4 which continues with iREC 10 recipient with new Trust Chain from "iRec 10 Source" | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/iRec%20Policy%2010%20(Recipient)%20(new%20trust-chain)%20(1688028789.828861780).policy) |


Workflow Diagram to explain the connection between iREC 10 Source and iREc 10 Recipient:

![image](https://github.com/hashgraph/guardian/assets/79293833/b8bf59de-60c6-4b49-83d7-0c852ef0ba10)



For complete User Guide and API Flow for executing IREC Policy, please refer to :

IREC User Guide : https://docs.hedera.com/guardian/guardian/demo-guide/renewable-energy-credits/introduction-to-international-renewable-energy-credit-standard-irec

IREC API Demo Guide : https://docs.hedera.com/guardian/demo-guide/api-workflow-of-irec-demo
