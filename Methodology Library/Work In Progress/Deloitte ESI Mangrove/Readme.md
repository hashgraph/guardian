# ESI - Mangrove v1
 
### Description:
ESI is a dMRV platform that backs sustainability claims with science-based evidence. Deloitte offers an end-to-end service offering, from sustainability goals to claiming its impact responsibly. Deloitte is demonstrating its positive impact with mangrove reforestation and proving it using ESI, for example in carbon stock, biodiversity, education opportunity, and many more impact projects on the roadmap. Deloitte is helping its clients leverage ESI as well, paving the way for responsible business.
 
### Workflow Description:
 
Each user submits their applications to the ESI Admin (EA) for approval. If approved, they can access their respective pages and start with their operations within the workflow.
 
The workflow starts with the Mangrove Admin (MA) creating a new area, whereafter the MA adds a new time period, thus clustering all data points to a period of time. After the respective periods have been added, the MA can add one or more core requests to that specific area. Core requests created by admins are completed by Field Operators (FOs). The FO, after logging in, is presented with an overview of core requests. The FO can complete a core request by adding information to it. Afterward, the FO adds the ID numbers and sampling depths of all samples extracted from the respective core through the Sample Worksheet tab.
 
The information is now passed on to the Lab Operator (LO), who must provide their input for each specific sample ID). Once this operation is completed by the LO, a calculation occurs in the backend of Guardian to determine the dry bulk density and organic carbon content. The result of the calculation, along with the entire chain of data is now visible for the Dashboard Viewer (DV) to view.
 
<img width="807" alt="image" src="https://github.com/bbosch-d/guardian/blob/pr-deloitte-esi-library/Methodology%20Library/Other/Deloitte%20ESI%20Mangrove/ESI_Mangrove_v1.0_Data_Flow.png?raw=true">
 
The rationale behind our approach is that we want to have one VC per completed sample because that results in the best UX for the LO and it facilitates dashboarding. By explicitly creating each object as a new VC and including all data included in the previous VC, the object is passed on from user to user to capture the chain of data until the very end. This way, every sample contains all information relating to its sampling core and area.
