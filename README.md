[![Apache 2.0 License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
<h1 align="center">Guardian</h1>
  <p align="center">
    The Guardian is a modular open-source solution that includes best-in-class identity management and decentralized ledger technology (DLT) libraries. At the heart of the Guardian solution is a sophisticated Policy Workflow Engine (PWE) that enables applications to offer a requirements-based tokenization implementation.
    <br />
  </p>
</div>

<p align="center">
    <br />
    <a href="https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-19.md">HIP-19</a>
    ·
    <a href="https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-28.md">HIP-28</a>
    ·
    <a href="https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-29.md">HIP-29</a>
    ·
    <a href="https://github.com/hashgraph/guardian/issues">Report a Bug</a>
    ·
    <a href="https://github.com/hashgraph/guardian/issues">Request a Policy or a Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#discovering-esg-assets-on-dedera">Discovering ESG assets on Hedera</a></li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
       </ul></li>
    <li><a href="#demo-usage-guide">Demo Usage Guide</a></li>
    <li><a href="#contributing">Contributing</a></li>
        <ul>
        <li><a href="#contribute-a-new-policy">Contribute a New Policy</a></li>
        <li><a href="#request-a-new-policy-or-feature">Request a New Policy or Feature</a></li>
       </ul></li>
    <li><a href="#reference-implementation">Reference Implementation</a></li>
    <li><a href="#built-with">Built With</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#change-log">Change Log</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#security">Security</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- DISCOVERING ESG ASSETS ON HEDERA -->

## Discovering ESG assets on Hedera

As identified in Hedera Improvement Proposal 19 (HIP-19), each transaction on the Hedera network must contain a specific identifier in the memo field for discoverability. The Guardian demonstrates this when every Hedera Consensus Service transaction is logged to a Hedera Consensus Service Topic. Observing the Hedera Consensus Service Topic, you can discover newly minted tokens. In the memo field of newly minted tokens, you will find a [Verifiable Link](https://github.com/InterWorkAlliance/Sustainability/blob/2d07029cade3050d76f716034593cb067d1c4e7f/vem/supply/verification.md) which will allow users to discover the published standard the token is following and the entire history of the ESG asset and corresponding data to be publicly discoverable. This is further defined in Hedera Improvement Proposal 28 (HIP-28)

<p align="right">(<a href="#top">back to top</a>)</p>

## Getting Started

To get a local copy up and running, follow these simple example steps. When building the reference implementation, you can manually build every component or run one command with Docker.

<!-- PREREQUISITES -->

### Prerequisites

- [Docker](https://www.docker.com/) (To build with one command)
- [MongoDB](https://www.mongodb.com/) and [NodeJS](https://nodejs.org/) (If you would like to manually build every component)
- [Hedera Testnet Account](https://portal.hedera.com/)

### Installation

1. Clone the repo
   ```
   git clone https://github.com/hashgraph/guardian.git
   ```
2. Update the following files with your Hedera Testnet account info as indicated. For example:

   in `ui-service/.env`:

   ```
   OPERATOR_ID=0.0.123456789
   OPERATOR_KEY=302e020100300506032b657004220420f4361ec73dc43e568f1620a7b7ecb7330790b8a1c7620f1ce353aa1de4f0eaa6
   ```

   in `ui-service/.env.docker`:

   ```
   OPERATOR_ID=0.0.123456789
   OPERATOR_KEY=302e020100300506032b657004220420f4361ec73dc43e568f1620a7b7ecb7330790b8a1c7620f1ce353aa1de4f0eaa6
   ```

   in `guardian-service/config.json`:

   ```
   {"OPERATOR_ID":"0.0.123456789","OPERATOR_KEY":"302e020100300506032b657004220420f4361ec73dc43e568f1620a7b7ecb7330790b8a1c7620f1ce353aa1de4f0eaa6"}
   ```
 
   - The `OPERATOR_ID` is the Hedera account's `accountId`
   - The `OPERATOR_KEY` is the Hedera account's `privateKey`
   - The `TOPIC_ID` is used when connecting to an existing topic. If you don't have one, delete the `TOPIC_ID` line.

3. If you want to build with Docker (Once this step you are finished)
   ```
   docker-compose up -d --build
   ```
   
   Note, for the message-broker service **skipLibCheck** flag has been enabled due to instability of typescript building the guardian as a pre-production system. Recommended that once stable this flag should be removed, [see more on issue #26](https://github.com/hashgraph/guardian/issues/26).    
   
4. If you want to manually build every component, then build and run the services in the following sequence: Message Broker, UI Service, Guardian Service, and lastly, the MRV Sender Service. See below for commands.

   **From the Message broker folder (Need to run first)**

   To build the service:

   ```
   npm install
   npm run build
   ```

   To start the service:

   ```
   npm start
   ```

   **From the UI Service folder**

   To build the service:

   ```
   npm install
   npm run build
   ```

   To start the service (found on http://localhost:3002):

   ```
   npm start
   ```

   **From the Guardian Service folder**

   To build the service:

   ```
   npm install
   npm run build
   ```

   To start the service (found on http://localhost:3004):

   ```
   npm start
   ```

   **From the MRV Sender Service folder**

   To build the service:

   ```
   npm install
   npm run build
   ```

   To start the service (found on http://localhost:3005):

   ```
   npm start
   ```

<p align="right">(<a href="#top">back to top</a>)</p>

## Demo Usage Guide

1. The Guardian reference implementation comes with three predefined users:

- **Root Authority**: A standard registry, or a Root Authority in our scenario, is an organization that establishes science-based standards for measuring, reporting, and verifying (MRV) ecological benefit claims and issues value in the form of credit for claims that meet the standard set. A standard registry also authorizes validation and verification bodies (VVBs) to collect and process claims based on the established standard. The creation of scientific-based standards for MRV is a rigorous discipline that requires independence from commercial influence in the pursuit of accurate accounting of benefit or emissions claims. A standard registry organization can also maintain a central registry of credits they have issued that can be sold directly via the registry itself or established as reference value on networks, exchanges, or marketplaces.
- **Installer**: In our scenario, it can be either the project owner or developer. This is the entity (person or company) that owns the project whose activities will be the source of benefit claims in a process generically called measurement or monitoring, reporting and verification (MRV) to create a credit.
- **Auditor**: This is a 3rd part who will need to view/audit the entire chain of events; from the establishment of the science-based standards through creation of the credit.

![Guardian step 1](https://user-images.githubusercontent.com/40637665/137935335-1c1cf58e-9b83-4080-9c76-125d2ec9af34.png)

2. After running the installation commands, open a tab on your browser and navigate to http://localhost:3002/. Typically the way we start the reference implementation demonstration is by logging in as the Root Authority. Click the **Demo Admin Panel** drop-down located in the upper right-hand corner of the login screen and select the **Root Authority** user.

![guardian step 2](https://user-images.githubusercontent.com/40637665/137934753-e51db424-6142-42f8-8016-40cf9f38401e.png)

3. You'll now be prompted to configure your Root Authority account. Press the **Generate** button to generate a Hedera Operator ID and an Operator Key and enter the name of your Root Authority. Press **Connect** when finished. This will now create Hedera Consensus Service Topics, fill the account with test hBar, create a DID document, create a Verifiable Credential, etc.

![Guardian step 3](https://user-images.githubusercontent.com/40637665/137956842-d9b3d0a3-7021-4304-9d1b-83d06ac115e2.png)

4. Next, we move over to the **Schemas** tab. Some schemas are populated during the build of the solution. These schemas are the structure of which Verifiable Credentials will be filled out. You can click on the **document** link on the right-hand side and notice fields that correlate to business requirements. Remember the iRec Policy we mentioned at the beginning of the section? We will be creating the first step of that Policy; which is to create an iRec registration applicant form. The current version of the solution allows you to either build schemas from scratch or import schemas. Navigate to the [Demo Artifacts folder](https://github.com/hashgraph/guardian/tree/main/Demo%20Artifacts) and download the `iRec_Application_Details.json` file. Then click on the **Import** button and upload the `iRec_Application_Details.json` file.

![Guardian step 4](https://user-images.githubusercontent.com/40637665/137962816-b2791931-552e-4cbc-8290-002909421abb.png)

5. The next step of the flow is to create a token. Click the **Tokens** tab and click on **Create Token.** Here, we can fill out the necessary token information and token parameters such as Fungible/Non-Fungible (for this demo flow we will select Non-Fungible), Freeze, KYC, etc. For purposes of this demo, let us keep everything selected. When you click "OK", this action triggers Hedera Token Service to create the token on Hedera's Testnet. Clicking on the "Token ID" will bring you to the Dragon Glass Hedera Testnet explorer to track all token activity.

![Guardian step 5](https://user-images.githubusercontent.com/40637665/137963264-09779e4a-2127-4e4b-949f-f9c510350634.png)

6. This could be one of the most interesting parts of the reference implementation. Now we will be creating the Policy. In our case, we will mimic the iRec Policy. Click **Create Policy** and fill the required information in the dialog box. Please note that you will need to create new **Tag** and **Version** numbers for each policy. identical Tags and Versions will cause an error. Once the Policy is complete, we have just **_created our first Policy Workflow and Policy Action Execution instance!_**

![Guardian step 6](https://user-images.githubusercontent.com/40637665/137963683-cd49e1a6-c372-4165-b150-7441da3a2818.png)

7. On the right-hand side of the Policies tab, click the **Edit** button. This will open the Guardian's Policy workflow editor. As described in the Hedera Improvement Proposal 28 (HIP-28), a Policy Workflow contains:

   - Policy Workflow Workgroups
   - Policy Workflow Actions
   - Policy Workflow State Objects
   - Policy Workflow State Transactions

   The quickest way to go through this demo while learning how to configure a Policy Workflow is to import the configPolicy.ts file. To do so, navigate to the [Demo Artifacts folder](https://github.com/hashgraph/guardian/tree/main/Demo%20Artifacts) folder and copy everything inside the `irec-policy-config.txt` file. Go back into the Policy editor and click on the "code" icon on the upper right-hand side. Paste the mock configuration.
   
   ![Guardian step 7](https://user-images.githubusercontent.com/40637665/137964384-6e05ee6e-1e5a-41c3-801b-ec94a50de916.png)
   
   Click on the "block" icon that is just to the right of the "code" icon. You'll notice that the Policy configuration editor now visually shows the Policy Workflow with all of the necessary Workgroups, Actions, State Objects, and Transactions. Click through on several blocks, and you'll notice that you can edit some elements on the right-hand side. Depending on what you are clicking on, different properties will display on the right-bottom box. You can edit properties from permissions, dependencies, tags, UI elements, etc. Moving along with our flow. Click on the **mint_token** block and select the token we created from the properties box in the right hand side. We will now press the **Save** button and the **Publish** button.
   
   ![Guardian step 7 2](https://user-images.githubusercontent.com/40637665/137965045-951900d7-fd64-489a-9282-8131ca9216b4.png)

8. Click on the Root Authority's profile icon and select "Log Out." We will now go back into the **Admin Panel**. This time we will select **Installer**

![Guardian step 8](https://user-images.githubusercontent.com/40637665/137965200-bc63668e-cd94-4451-a495-ef0f32cd2b7c.png)

9. When signing into the Installer profile, you must follow similar configuration steps as the Root Authority. Click the **Generate** button, then select **Submit**. After generating the Hedera Operating ID and Key, the Installer profile will be configured, test HBAR will be credited to the account, and a DID will be created.

![Guardian step 9](https://user-images.githubusercontent.com/40637665/137965583-00d980fd-aa27-4dd4-b62e-2adc96b116ed.png)

10. Next, navigate to the **Token** tab and click the **link** icon to associate the Installer to the token we created as the Root Authority.

![Guardian step 10](https://user-images.githubusercontent.com/40637665/137965789-6e5b888d-88a2-4a6d-917e-fd797b060b2d.png)

11. Now, we can click on the **Policies** tab. This is where the specific actions required by the Policy Workflow will be found. We can click the **Open** button to the right of the iRec Policy the Root Authority created. 

![Guardian step 11](https://user-images.githubusercontent.com/40637665/137966063-7add24f7-319b-472e-a93d-418075a74999.png)

   Here we will see the form that is based on the imported schema in step 4. This form is one of the Policy Workflow State Objects. Once you fill out the required information, press the **OK** button. Note: There is a known issue that no dialogue box comes up to let you know the form is completed. That's ok for now, we are working to provide a UI update. Everything works, so just move onto the next step :)
   
![Guardian step 11 2](https://user-images.githubusercontent.com/40637665/137966739-1872360d-a7bd-45a3-8fe5-7fd7d59af66d.png)

12. The next step of our flow is to log out and sign back in as the Root Authority. Navigate to the **Policies** tab and click the **Open** button on the far right. Here you will find the approval actions based on our Policy Workflow required by the Root Authority. You will be able to view the Verifiable Credential prior to approval by selecting the **View Document** link. Once you are ready to approve the document, you can click on the **Approve** button.

![Guardian step 12](https://user-images.githubusercontent.com/40637665/137966774-7ffbe24e-0a41-40ab-b270-fa6252fced86.png)

13. Navigate to the **Tokens** tab and click on the blue people icon on the far right. This view shows the Root Authority all of the users who have been associated with the tokens the Root Authority created. We will now click the **Grant KYC** button.

![Guardian step 13](https://user-images.githubusercontent.com/40637665/137966876-52614098-c782-48d8-97bf-58a971a9e56a.png)

14. We can now log out of the Root Authority account and back in as the Installer. Navigate to the **Policies** tab and click the **Open** button on the far right. The next Policy Workflow Action required by the Installer is to register their sensors. Click the **New Sensors** button, fill out the required information in the dialog box, and select **OK**.

![Guardian step 14](https://user-images.githubusercontent.com/40637665/137967290-51ae0339-4272-4fbc-b628-eb39bf5e4e74.png)

15. You'll notice that you just created a sensor (refreshing the page may be needed), and that sensor has been assigned a Decentralized Identifier and a Verifiable Credential. Click the **Configuration** button. This will begin the download of the Sensor configuration file. Save that in a handy place because we will need it.

![Guardian step 15](https://user-images.githubusercontent.com/40637665/137970980-19ba060d-0686-4718-8e4e-2aede5db693e.png)

16. Open another tab on your browser and enter http://localhost:3005/. We now see our IoT simulator. You can either drag and drop the sensor configuration file to the big `+` sign in the upper left, or you click the button to browse your computer. For simplicity's sake, click the button next to **Random Value** for the IoT simulator to generate random Measurement, Reporting, and Validation (MRV) data. Click **OK**.

![Guardian step 16](https://user-images.githubusercontent.com/40637665/137971538-94b68559-a8e2-464d-b595-fd13f23b97e9.png)

  Press the **green triangle** to begin generating the data. Navigate back to the Guardian Policies tab, and you can click into the **MRV** tab. Here, you will see the data that the IoT sensor generated, such as date, period, amount, etc.
  
  ![Guardian step 16 2](https://user-images.githubusercontent.com/40637665/137971702-79cc597f-90a7-4038-8058-caa9f85a55e0.png)

17. The last step is to log out of the Installer account and log into the Auditor account. 

![Guardian step 17](https://user-images.githubusercontent.com/40637665/137971921-041a209a-fec2-4f0a-854b-d46c7b26eaf7.png)

  There are two tabs in this view: **Audit** and **Trust Chain**. Clicking into the Audit tab offers high-level public information from our reference implementation such as the Verifiable Presentation ID, the Hash of the Verifiable Presentation, the DID of the sensor, the date information the Verifiable Presentation was created, the type of activity, and the ability to view the Verifiable Presentation.
  
  ![Guardian step 17 2](https://user-images.githubusercontent.com/40637665/137972020-ea74c1ad-2ec3-49b4-9089-c807ed79241b.png)

18. Lastly, let's navigate to The Trust Chain tab. The Trust Chain tab will ask for one of two pieces of information, either the Verifiable Presentation ID (which can be found either in the Audit tab or the memo field of the transaction field on a Hedera explorer-like Dragon Glass) or the Transaction Hash. Entering either of those important identifiers will open all necessary information for you to discover. 

![Guardian step 18](https://user-images.githubusercontent.com/40637665/137972170-7970a07e-7a76-410b-90a7-22a9f3586103.png)

The **Trust Chain** view displays important elements that can be publicly discovered. Elements include token information, Policy information, and all of the important information regarding the Verifiable Credentials that make up the Verifiable Presentation. You'll notice "Cards" on the bottom of the screen. Those cards are Verifiable Credentials displayed in chronological order. For example, you will see when the Root Authority was created, when the policy was created, when the Installer submitted documentation, etc. Feel free to explore!

![Guardian step 19](https://user-images.githubusercontent.com/40637665/137972740-a40ed2cb-2502-4da5-a9f2-3047c30e6773.png)

<p align="right">(<a href="#top">back to top</a>)</p>

## Contribute a New Policy

We welcome all methodologies and workflow to be contributed to this repo as an open-source token template and Policy Workflow & Policy Action Execution instance. To do so, please follow the [CONTRIBUTING.md](CONTRIBUTING.md) instructions to submit a pull request.

This is critical to scaling the [Hedera Sustainability Ecosystem](https://github.com/dubgeis/HederaSustainabilityEcosystem/).

## Reference Implementation

This repo contains a reference implementation of the Guardian to learn how to use the components for various applications. This reference implementation is designed with modularity so that different components may be swapped out based on various implementation requirements. Please see the Guardian's architecture diagram below:

![Open Source Guardian Architecture](https://user-images.githubusercontent.com/40637665/137059380-94303137-b9e4-402c-bb67-9212b6f1c4f4.png)

<p align="right">(<a href="#top">back to top</a>)</p>

## Built With

The Guardian solution is built with the following major frameworks/libraries.

### Backend

- [NodeJS](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Express](https://expressjs.com/)
- [FastMQ](https://www.npmjs.com/package/fastmq)
- [TypeORM](https://typeorm.io/)
- [Hedera-DID-JS-SDK](https://github.com/hashgraph/did-sdk-js)
- [W3C VC-JS-HTTP](https://w3c.github.io/vc-data-model/)

### Frontend

- [Angular](https://angular.io/)
- [crypto-browserify](https://www.npmjs.com/package/crypto-browserify)

<p align="right">(<a href="#top">back to top</a>)</p>

## Roadmap
Roadmap TBA

- [] Feature 1
  - [] Nested Feature

See the [open issues](https://github.com/hashgraph/guardian/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#top">back to top</a>)</p>

## Change Log
All notable changes to this project will be documented in this [CHANGELOG.md](CHANGELOG.md) file.

<p align="right">(<a href="#top">back to top</a>)</p>

## Contributing
Thank you for your interest in contributing to the Guardian!

We appreciate your interest in helping the rest of our community and us. We welcome bug reports, feature requests, and code contributions.

For contributing guidelines, please see the [CONTRIBUTING.md](CONTRIBUTING.md) here

<p align="right">(<a href="#top">back to top</a>)</p>

## License
This repo is under Apache 2.0 License. See [LICENSE](LICENSE) for more
information.

<p align="right">(<a href="#top">back to top</a>)</p>

## Security
Please do not file a public ticket mentioning the vulnerability. Refer to the security policy defined in the [SECURITY.md](SECURITY.md).

<p align="right">(<a href="#top">back to top</a>)</p>

## Contact
For any questions, please reach out to the Envision Blockchain Solutions team at:
- Website: <www.envisionblockchain.com>
- Email: <info@envisionblockchain.com>

<p align="right">(<a href="#top">back to top</a>)</p>

[license-shield]: https://img.shields.io/hexpm/l/apa
[license-url]: https://github.com/hashgraph/guardian/blob/main/LICENSE
