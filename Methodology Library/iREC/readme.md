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
| iREC 2 | 1674821041.273277003 | Implementation of iRec(E) without MRV sender | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/iRec%20Policy%202.policy) |
| iREC 3 | 1674821342.619996003 | iRec 2 Policy + revoke actions (Added: Revoke Block, Button Block) | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%203.policy) |
| iREC 4 | 1674821702.668883536 | iRec 3 Policy + auto associate and grant KYC token actions (Added: Token Action Block, Token Confirmation Block) | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%204.policy) |
| iREC policy 5 group | 1682691911.690728979 | Demonstrates the usage of the new concepts of common groups and multi-signature approvals. Document approval responsibilities are given to the new 'Approver' role, which belongs to a group. Users can become members of the group without the invite, and thereby become approvers. | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%205%20group%20(1663850151.496004277).policy) |
| IRec Policy 6 search documents | 1674822383.822752346 | The ability to process other than input documents in calculation block (calculateMathVariables block improvement) | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%206%20search%20documents%20(1666182325.863957003).policy) |
| IRec Policy 7 split documents | 1674822624.800179003 | Splitting documents to chunks (added splitBlock) | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%207%20split%20documents%20(1666798058.496271367).policy) |
| IRec Policy 8.1 MBP | 1674822811.925003914 | Policy based on iREC Policy 4 where there are two impacts in one mint block | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%208.1%20MBP%20(1670329794.680515003).policy) |
| IRec Policy 8.2 MBP | 1674823034.585480003 | Policy based on iREC Policy 4 where the scenario is that there are two impacts in two different mint blocks | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/IRec%20Policy%208.2%20MBP%20(1670500065.430227921).policy) |
| IRec 9 Module | 1677851469.448047161 | Policy based on iREC Policy 4 where we have Modules integrated in the policy | [Link](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/iREC/Policies/iRec%209%20Module%20(1677851469.448047161).policy) |


For complete User Guide and API Flow for executing IREC Policy, please refer to :

IREC User Guide : https://docs.hedera.com/guardian/guardian/demo-guide/renewable-energy-credits/introduction-to-international-renewable-energy-credit-standard-irec

IREC API Demo Guide : https://docs.hedera.com/guardian/demo-guide/api-workflow-of-irec-demo
