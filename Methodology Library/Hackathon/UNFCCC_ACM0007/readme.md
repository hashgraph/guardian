About the Project
This project emphasizes on reducing Carbon Offsets i.e. Greenhouse Gases (like CO2) thus helping save the Environment. The corporates which reduce the production of them can be incentivized. This work is done by Hedera using the decentralized blockchain technology. The guardian of Hedera is a User Interface built on top of it for better user experience. The corporates are given tokens based on their carbon emissions. Tokens can be “Hbar” or any other token made on the Hedera DLT(Digital Ledger Technology).
 Methodologies
These are the official paperwork or the modulo operandi of the carbon emission calculation for the corporation. It takes account various factors and gives the formula of the final emission done by the corporate.
There are various platforms which provide these methodologies:
1)	UNFCCC: https://cdm.unfccc.int/methodologies/index.html
2)	Verra: https://verra.org/methodologies-main/
3)	Puro.Earth: https://puro.earth/carbon-removal-methods
4)	Gold Standard: https://globalgoals.goldstandard.org/documents/methodology/
In our case we are using the following methodology from Clean Development Mechanism (CDM) of the United Nations Framework Convention on Climate Change (UNFCCC).
ACM0007:
https://cdm.unfccc.int/methodologies/DB/UVVSD3V6CADRJXKIKGUCFWRH3SRTKA 
The ACM0007 methodology titled "Conversion from single cycle to combined cycle power generation" provides guidance on quantifying emission reductions for projects that involve upgrading power plants from single cycle to more efficient combined cycle operation.
Combined cycle power generation makes use of waste heat from a gas turbine to produce steam and power a steam turbine, improving the overall efficiency of electricity generation. Converting existing single cycle turbines to combined cycle enables more electricity generation with the same fuel input, thereby reducing emissions intensity.
Need and Use of ACM0007:
Many developing countries have a high share of grid electricity generated from legacy single cycle gas turbines or diesel plants with low efficiencies and high emissions intensity.
Converting these power units to combined cycle can significantly reduce the grid emission factor by improving generation efficiency. This supports grid decarbonization efforts without compromising energy access and reliability.
Objective and Scope of ACM0007:
The ACM0007 methodology provides a standardized approach to quantify the emission reductions achieved from upgrading power plants to combined cycle technology. This encourages project adoption by ensuring credibility and unlocking carbon finance opportunities.
Entities operating single cycle power plants can use ACM0007 to develop carbon offset projects by upgrading to combined cycle. The quantified emission reductions can potentially be registered under carbon crediting programs after independent validation. Revenue from carbon credits enhances the financial viability of efficiency improvement projects. 
Available Roles:
Project Participant - The project participant is responsible for executing the emission reduction project. The project participant must adhere to the requirements outlined by the CDM and provide evidence of the emission reductions achieved. Upon successful verification, the project participant receives certified emission reduction (CER) tokens as an incentive for their emission reductions. 
Verification and Validation Body (VVB) - The VVB plays a critical role in independently verifying and validating the project data submitted by the project participant. They thoroughly assess the project's emission reduction potential, methodologies, and adherence to the policy guidelines. Based on their evaluation, the VVB either approves or rejects the project for registration. 
Registry (UNFCCC) - The United Nations Framework Convention on Climate Change (UNFCCC) serves as the registry for the CDM. They oversee the multiple workflow steps involved in the project's approval, including the verification and validation process by the VVB and the endorsement by the DNA. The UNFCCC's approval is necessary for the project's successful registration and issuance of CER tokens. 
Technical Aspects of the Project (Policy Guide):
This policy can be imported to hedera guardian via the Github file(.policy) or IPSF timestamp(1706881469.628524368). 
Policy Workflow:
 
Token Used (Carbon Emission Reduction):
Certified Emission Reduction (CER) credits, each equivalent to one tonne of CO2.
Key Documents & Schemas:
Project Description: Information on project participant, location, technology, configuration, crediting period etc.
Emission Reductions Calculation: Calculate and specify baseline emissions, project emissions and leakage as per methodology equations.
Monitoring Plan: Description of monitoring approach, parameters, frequency, QA/QC procedures etc. in line with methodology.
Monitoring Report: Periodic monitoring report with data for monitored parameters and calculated emission reductions.
Tools used:
Tools are basically code snippets written in javascript used in Hedera Guardian to calculate the required parameter.
Methodological Tool 02 - Combined tool to identify the baseline scenario and demonstrate additionality.
Methodological Tool 03 - Tool to calculate project or leakage CO2 emissions from fossil fuel combustion.
Methodological Tool 07 - Tool to calculate the emission factor for an electricity system.
Methodological Tool 10 - Tool to determine the remaining lifetime of equipment.
Demo Video:

YouTube Link:
Step by Step Guide:
1)	Login into the service by making an account on hedera blockchain and inviting yourself into a tenant. (requires a blockchain wallet such as MetaMask).
Admin Page:
 
User Page:
 

2) Import the policy using the import function given.
 
3)You can view the policy by clicking on the policy configuration button.
 
4) You can start working on the policy by clicking on dry run under status and then on register under instance.
 
5) Then we will create two users namely the project participant (Ankur here) and VVB (Validation & Verification Board) (Validator here).
 
 
6) Then we have to have both the profiles using the Administrator panel. We can view the document of the request alongside.
 
 
(We can view the document as a form..)
7) We now head back to the Project Participant profile and create a new project.
 
8) We have to fill the all the data necessary according to the reports of the corporation. (For now we can use test button which inserts all the test data into all the fields).
 
9) Now we head back to the administrator panel and look into the report by view document. We can accept or reject the report accordingly.
 
10) Now we head back to the project participant tab to add report to the monitoring report section. We have to review the report before sending to the monitoring report section.
 
11) Now head to the monitoring reports section to assign the report to the required VVB (Validator in our case).
 
12) Now simply head to the VVB profile to validate the monitoring report after reviewing.
 
13) The report now goes to the administrator. Head to the administrator profile and review the profile after viewing the document. You can approve or reject accordingly. If you approve the document, the minting process starts simultaneously.
 
14) You can view the minted tokens on the blockchain/DLT by going to the VPs section and clicking the view TrustChain.
 
15)Finally the TrustChain contains all the important transaction data.
 
Epilogue:
This project and documentation made by a contestant during the DLT Climate Hackathon. Therefore contains a few bugs. A few changes can be done to improve the system:
1) Improve and document list column names for each of the roles, some review IDs are coming as null .
2) Improve all the schemas (especially PID, PDD). 
3) Automate emissions calculations on basis of incoming parameters of equations from schemas 
4) Add Guardian support for list data type in schemas. 
Thanks to all the folks who contributed to this amazing project. It was exciting to work with new gen future ready system.


