## IREC Methodology

**Policy Description**: 

This policy supports the tokenization of Renewable Energy Certificates (RECs) in accordance with the I-REC Standard, and specifically, the I-REC(E) Product Code. The I-REC Standard is a non-profit organization that provides an attribute tracking standard that can be used around the world. While the I-REC Standard is designed to track attributes for a diversity of products, Product Codes provide additional requitements for specific products and markets. The I-REC(E) Product Code provides requirements for electricity products, and was developed by Evident, who acts as Code Manager and Registry Operator. 
The schema and workflow of this policy were designed to reflect the MRV requirements, processes, and roles outlined by both I-REC Standard and the I-REC(E) Product Code. 

**Workflow Description**:

The workflow begins with the Registrant, generally the owner of an energy production facility or a party acting in their behalf, submitting an application to the Issuer for approval. Once approved, the Registrant submits a registration request to the Issuer for the facility/device that will be providing the MRV data. This will include both general information, as well as attributes (e.g., energy sources, location, etc.). Note that devices must be, and often are already, independently verified. Under certain circumstances an inspection may be necessary. Once the Issuer processed and approves the facility/device registration, an issue request can be sent to the Issuer along with independently verified meter data. After the Issuer approves the issue request, I-REC(E) certificates are issued. 

<img width="1074" alt="image" src="https://user-images.githubusercontent.com/79293833/186931734-b7303b0e-81e5-433f-b71c-509e83dc186b.png">

As the initial step in IREC Policy involve creation of following Schemas: iRec registration applicant details, Inverter, and MRV Schemas,for demo purpose, we have created those schemas and their IPFS timestamps and file links are mentioned in the table below.

**IREC Schema and Policy Versions and their IPFS timestamps:**

| Version | IPFS Timestamp | Schema/Policy File Link |
|---|---|---:|
| iREC Schema | 1644847084.945541771 | [Link](https://github.com/hashgraph/guardian/blob/main/Demo%20Artifacts/iREC/Schema/iREC%20Schema.schema) |
| Inverter Schema | 1644847093.979895804 | [Link](https://github.com/hashgraph/guardian/blob/main/Demo%20Artifacts/iREC/Schema/Inverter.schema) |
| MRV Schema | 1644847107.415192828 | [Link](https://github.com/hashgraph/guardian/blob/main/Demo%20Artifacts/iREC/Schema/MRV.schema) |
| iREC 1 | 1661166202.802071003 | [Link](https://github.com/hashgraph/guardian/blob/main/Demo%20Artifacts/iREC/Policies/iRec%20Policy.policy) |
| iREC 2 | 1662640724.951854568 | [Link](https://github.com/hashgraph/guardian/blob/main/Demo%20Artifacts/iREC/Policies/iRec%20Policy%202.policy) |
| iREC 3 | 1662641840.731000003 | [Link](https://github.com/hashgraph/guardian/blob/main/Demo%20Artifacts/iREC/Policies/IRec%20Policy%203.policy) |
| iREC 4 | 1662642008.325450377 | [Link](https://github.com/hashgraph/guardian/blob/main/Demo%20Artifacts/iREC/Policies/IRec%20Policy%204.policy) |

For complete User Guide and API Flow for executing IREC Policy, please refer to :

IREC User Guide : https://docs.hedera.com/guardian/demo-guide/irec-demo-guide

IREC API Demo Guide : https://docs.hedera.com/guardian/demo-guide/api-workflow-of-irec-demo
