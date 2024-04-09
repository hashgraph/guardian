## About the Project
This project emphasizes on reducing Carbon Offsets i.e. Greenhouse Gases (like CO2) thus helping save the Environment. The corporates which reduce the production of them can be incentivized. This work is done by Hedera using the decentralized blockchain technology. The guardian of Hedera is a User Interface built on top of it for better user experience. The corporates are given tokens based on their carbon emissions. Tokens can be “Hbar” or any other token made on the Hedera DLT(Digital Ledger Technology).
## Methodologies
These are the official paperwork or the modulo operandi of the carbon emission calculation for the corporation. It takes account various factors and gives the formula of the final emission done by the corporate.
There are various platforms which provide these methodologies:
1)	UNFCCC: https://cdm.unfccc.int/methodologies/index.html
2)	Verra: https://verra.org/methodologies-main/
3)	Puro.Earth: https://puro.earth/carbon-removal-methods
4)	Gold Standard: https://globalgoals.goldstandard.org/documents/methodology/ \
In our case we are using the following methodology from Clean Development Mechanism (CDM) of the United Nations Framework Convention on Climate Change (UNFCCC).
## ACM0007:
https://cdm.unfccc.int/methodologies/DB/UVVSD3V6CADRJXKIKGUCFWRH3SRTKA \
The ACM0007 methodology titled "Conversion from single cycle to combined cycle power generation" provides guidance on quantifying emission reductions for projects that involve upgrading power plants from single cycle to more efficient combined cycle operation. \
Combined cycle power generation makes use of waste heat from a gas turbine to produce steam and power a steam turbine, improving the overall efficiency of electricity generation. \
Converting existing single cycle turbines to combined cycle enables more electricity generation with the same fuel input, thereby reducing emissions intensity.
## Need and Use of ACM0007:
Many developing countries have a high share of grid electricity generated from legacy single cycle gas turbines or diesel plants with low efficiencies and high emissions intensity. \
Converting these power units to combined cycle can significantly reduce the grid emission factor by improving generation efficiency. \
This supports grid decarbonization efforts without compromising energy access and reliability.
## Objective and Scope of ACM0007:
The ACM0007 methodology provides a standardized approach to quantify the emission reductions achieved from upgrading power plants to combined cycle technology.
This encourages project adoption by ensuring credibility and unlocking carbon finance opportunities. \
Entities operating single cycle power plants can use ACM0007 to develop carbon offset projects by upgrading to combined cycle. The quantified emission reductions can potentially be registered under carbon crediting programs after independent validation. Revenue from carbon credits enhances the financial viability of efficiency improvement projects. 
## Available Roles:
**Project Participant** - The project participant is responsible for executing the emission reduction project. The project participant must adhere to the requirements outlined by the CDM and provide evidence of the emission reductions achieved. Upon successful verification, the project participant receives certified emission reduction (CER) tokens as an incentive for their emission reductions. \
**Verification and Validation Body (VVB)** - The VVB plays a critical role in independently verifying and validating the project data submitted by the project participant. They thoroughly assess the project's emission reduction potential, methodologies, and adherence to the policy guidelines. Based on their evaluation, the VVB either approves or rejects the project for registration. \
**Registry (UNFCCC)** - The United Nations Framework Convention on Climate Change (UNFCCC) serves as the registry for the CDM. They oversee the multiple workflow steps involved in the project's approval, including the verification and validation process by the VVB and the endorsement by the DNA. The UNFCCC's approval is necessary for the project's successful registration and issuance of CER tokens.
## Technical Aspects of the Project (Policy Guide):
This policy can be imported to hedera guardian via the Github file(.policy) or IPSF timestamp(1706881469.628524368). \
**Policy Workflow**:
![image](https://github.com/ankurgupta007/guardian/assets/98680735/ae68213a-d1a3-4b78-848b-1b69b0e215ec)

### Token Used (Carbon Emission Reduction):
Certified Emission Reduction (CER) credits, each equivalent to one tonne of CO2.
### Key Documents & Schemas:
**Project Description**: Information on project participant, location, technology, configuration, crediting period etc. \
**Emission Reductions Calculation**: Calculate and specify baseline emissions, project emissions and leakage as per methodology equations. \
**Monitoring Plan**: Description of monitoring approach, parameters, frequency, QA/QC procedures etc. in line with methodology. \
**Monitoring Report**: Periodic monitoring report with data for monitored parameters and calculated emission reductions.
### Tools used:
Tools are basically code snippets written in javascript used in Hedera Guardian to calculate the required parameter. \
-[Methodological Tool 02](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CDM/Tools/Tool%2002/readme.md) - Combined tool to identify the baseline scenario and demonstrate additionality. \
-[Methodological Tool 03](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CDM/Tools/Tool%2003/readme.md) - Tool to calculate project or leakage CO2 emissions from fossil fuel combustion. \
-[Methodological Tool 07](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CDM/Tools/Tool%2007/readme.md) - Tool to calculate the emission factor for an electricity system. \
-[Methodological Tool 10](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CDM/Tools/Tool%2010/readme.md) - Tool to determine the remaining lifetime of equipment.
### Demo Video:
YouTube Link: https://youtu.be/kvK95WS3tCc 
### Step by Step Guide:
1)	Login into the service by making an account on hedera blockchain and inviting yourself into a tenant. (requires a blockchain wallet such as MetaMask). 
Admin Page:
![image](https://github.com/ankurgupta007/guardian/assets/98680735/925c07e4-7aed-4cfc-b607-7fe7039944e6) \
User Page:
![image](https://github.com/ankurgupta007/guardian/assets/98680735/d219a30a-ffa1-4dfc-9122-efc8d43d44c1)

2) Import the policy using the import function given. 
![image](https://github.com/ankurgupta007/guardian/assets/98680735/9036a304-e259-40fe-894e-87f1a31e18d8)

3) You can view the policy by clicking on the policy configuration button. 
![image](https://github.com/ankurgupta007/guardian/assets/98680735/825d721a-d3a0-4438-948c-04df6c9a5219)
 
4) You can start working on the policy by clicking on dry run under status and then on register under instance. 
![image](https://github.com/ankurgupta007/guardian/assets/98680735/9d6612d7-a908-4e0e-9d00-bc0152a5e0d6)
 
5) Then we will create two users namely the project participant (Ankur here) and VVB (Validation & Verification Board) (Validator here). 
![image](https://github.com/ankurgupta007/guardian/assets/98680735/a340c60b-1c31-4025-a360-2297d082fbe5)
![image](https://github.com/ankurgupta007/guardian/assets/98680735/99844ab5-1fd9-48e8-b388-8923978df749)
 
6) Then we have to have both the profiles using the Administrator panel. We can view the document of the request alongside.
![image](https://github.com/ankurgupta007/guardian/assets/98680735/d2b113f7-7208-4141-a30d-44c525ca2ba1)
![image](https://github.com/ankurgupta007/guardian/assets/98680735/5a6697aa-62f6-439f-9f6f-873564282f82) \
(We can view the document as a form..) 

7) We now head back to the Project Participant profile and create a new project. 
![image](https://github.com/ankurgupta007/guardian/assets/98680735/897a2a39-7f37-4f65-ac21-c691ae129f26)

8) We have to fill the all the data necessary according to the reports of the corporation. (For now we can use test button which inserts all the test data into all the fields). \
![image](https://github.com/ankurgupta007/guardian/assets/98680735/b1c8dd2e-35be-41c4-beb4-93b5affcfeaf)
 
9) Now we head back to the administrator panel and look into the report by view document. We can accept or reject the report accordingly. 
![image](https://github.com/ankurgupta007/guardian/assets/98680735/091560fb-b63f-4d39-9c07-063545d1fbeb)
 
10) Now we head back to the project participant tab to add report to the monitoring report section. We have to review the report before sending to the monitoring report section. \
![image](https://github.com/ankurgupta007/guardian/assets/98680735/64e1ffc1-5244-44ac-b4bb-1bccd3f24135)
 
11) Now head to the monitoring reports section to assign the report to the required VVB (Validator in our case). 
![image](https://github.com/ankurgupta007/guardian/assets/98680735/0b5f5cf1-354f-4814-8ab7-b4cd77daf44b)
 
12) Now simply head to the VVB profile to validate the monitoring report after reviewing. 
![image](https://github.com/ankurgupta007/guardian/assets/98680735/279efd02-3858-42be-86b0-0cfaa6c03577)
 
13) The report now goes to the administrator. Head to the administrator profile and review the profile after viewing the document. You can approve or reject accordingly. If you approve the document, the minting process starts simultaneously. 
![image](https://github.com/ankurgupta007/guardian/assets/98680735/9ef7bf21-2cbc-48bb-8600-e7fe01a8eafe)
 
14) You can view the minted tokens on the blockchain/DLT by going to the VPs section and clicking the view TrustChain.
![image](https://github.com/ankurgupta007/guardian/assets/98680735/acd6c894-8ae5-4361-9ab4-d54c593de927)
 
15) Finally the TrustChain contains all the important transaction data.
![image](https://github.com/ankurgupta007/guardian/assets/98680735/68322998-b1ef-4608-83e9-cad62a860402)
 
## Epilogue:
This project and documentation made by a contestant during the DLT Climate Hackathon. Therefore contains a few bugs. A few changes can be done to improve the system: 
1) Improve and document list column names for each of the roles, some review IDs are coming as null. 
2) Improve all the schemas (especially PID, PDD). 
3) Automate emissions calculations on basis of incoming parameters of equations from schemas. 
4) Add Guardian support for list data type in schemas. \
Thanks to all the folks who contributed to this amazing project. It was exciting to work with this new gen future ready system.


