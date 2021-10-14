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
    <a href="https://github.com/hashgraph/guardian/issues">Report Bug</a>
    ·
    <a href="https://github.com/hashgraph/guardian/issues">Request Policy or Feature</a>
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

As identified in Hedera Improvement Proposal 19 (hip-19), each transaction on the Hedera network must contain a specific identifier in the memo field for discoverability. The Guardian demonstrates this when every Hedera Consensus Service transaction is logged to a Hedera Consensus Service Topic. Observing the Hedera Consensus Service Topic, you can discover newly minted tokens. In the memo field of newly minted tokens, you will find a [Verifiable Link](https://github.com/InterWorkAlliance/Sustainability/blob/2d07029cade3050d76f716034593cb067d1c4e7f/vem/supply/verification.md) which will allow users to discover the published standard the token is following and the entire history of the ESG asset and corresponding data to be publicly discoverable. This is further defined in Hedera Improvement Proposal 28 (hip-28)

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
   ACCOUNT_ID=0.0.123456789
   PRIVATE_KEY=302e020100300506032b657004220420f4361ec73dc43e568f1620a7b7ecb7330790b8a1c7620f1ce353aa1de4f0eaa6
   TOPIC_ID=0.0.28583
   ```

   in `ui-service/.env.docker`:

   ```
   ACCOUNT_ID=0.0.123456789
   PRIVATE_KEY=302e020100300506032b657004220420f4361ec73dc43e568f1620a7b7ecb7330790b8a1c7620f1ce353aa1de4f0eaa6
   TOPIC_ID=0.0.28583
   ```

   in `guardian-service/config.json`:

   ```
   {"OPERATOR_ID":"0.0.123456789","OPERATOR_KEY":"302e020100300506032b657004220420f4361ec73dc43e568f1620a7b7ecb7330790b8a1c7620f1ce353aa1de4f0eaa6"}
   ```

   The `TOPIC_ID` is used when connecting to an existing topic. If you don't have one, delete the `TOPIC_ID` line.

3. If you want to build with Docker (Once this step you are finished)
   ```
   docker-compose up -d --build
   ```
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

2. After running the installation commands, open a tab on your browser and navigate to http://localhost:3002/. Typically the way we start the reference implementation demonstration is by logging in as the Root Authority. Click the **Demo Admin Panel** drop-down located in the upper right-hand corner of the login screen and select the **Root Authority** user.

3. You'll now be prompted to configure your Root Authority account. Press the **Generate** button to generate a Hedera Operator ID and an Operator Key and enter the name of your Root Authority. Press OK when finished. This will now create Hedera Consensus Service Topics, fill the account with test hBar, create a DID document, create a Verifiable Credential, etc.

4. Next, we move over to the **Schemas** tab. Some schemas are populated during the build of the solution. These schemas are the structure of which Verifiable Credentials will be filled out. You can click on the **document** link on the right-hand side and notice fields that correlate to business requirements. Remember the iRec Policy we mentioned at the beginning of the section? We will be creating the first step of that Policy; which is to create an iRec registration applicant form. The current version of the solution allows you to either build schemas from scratch or import schemas. Navigate to the /Demo Artifacts/ folder and download the iRec_Application_Details.json file.

5. The next step of the flow is to create a token. Click the **Tokens** tab and click on **Create Token.** Here, we can fill out the necessary token information and token parameters such as Fungible/Non-Fungible, Freeze, KYC, etc. For purposes of this demo, let us keep everything selected. When you click "OK", this action triggers Hedera Token Service to create the token on Hedera's Testnet. Clicking on the "Token ID" will bring you to the Dragon Glass Hedera Testnet explorer to track all token activity.

6. This could be one of the most interesting parts of the reference implementation. Now we will be creating the Policy. In our case, we will mimic the iRec Policy. Click **Create Policy** and fill out the dialog box. Once the Policy is complete, we have just **_created our first Policy Workflow and Policy Action Execution instance!_**

7. On the right-hand side of the Policies tab, click the **Edit** button. This will open the Guardian's Policy workflow editor. As described in the Hedera Improvement Proposal 28 (HIP-28), a Policy Workflow contains:

   - Policy Workflow Workgroups
   - Policy Workflow Actions
   - Policy Workflow State Objects
   - Policy Workflow State Transactions

   The quickest way to go through this flow while learning how to configure a Policy Workflow is to import the configPolicy.ts file. To do so, navigate to the `/Demo Artifacts/` folder and copy everything inside the `irec-policy-config.txt` file. Go back into the Policy editor and click on the "code" icon on the upper right-hand side. Paste the mock configuration and then click on the "block" icon that is just to the right of the "code" icon. You'll notice that the Policy configuration editor now visually shows the Policy Workflow with all of the necessary Workgroups, Actions, State Objects, and Transactions. Click through on several blocks, and you'll notice that you can edit some elements on the right-hand side. Depending on what you are clicking on, different properties will display on the right-bottom box. You can edit properties from permissions, dependencies, tags, UI elements, etc. Moving along with our flow, we will now press the **Save** button and the **Publish** button.

8. Click on the Root Authority's profile icon and select "Log Out." We will now go back into the **Admin Panel**. This time we will select **Installer**

9. When signing into the Installer profile, you must follow similar configuration steps as the Root Authority. After generating the Hedera Operating ID and Key, the Installer profile will be configured, test HBAR will be credited to the account, and a DID will be created.

10. Next, navigate to the **Token** tab and click the **link** icon to associate the Installer to the token we created as the Root Authority.

11. Now, we can click on the **Policies** tab. This is where the specific actions required by the Policy Workflow will be found. We can click the **Open** button to the right of the iRec Policy the Root Authority created. Here we will see the form that is based on the imported schema in step 4. This form is one of the Policy Workflow State Objects. Once you fill out the required information, press the **OK** button. Note: You'll see the progress bar spin right now. That's on purpose.

12. The next step of our flow is to log out and sign back in as the Root Authority. Navigate to the **Policies** tab and click the **Open** button on the far right. Here you will find the approval actions based on our Policy Workflow required by the Root Authority. You will be able to view the Verifiable Credential prior to approval by selecting the **View Document** link. Once you are ready to approve the document, you can click on the **Approve** button.

13. Navigate to the **Tokens** tab and click on the blue people icon on the far right. This view shows the Root Authority all of the users who have been associated with the tokens the Root Authority created. We will now click the **Grant KYC** button. We can now log out of the Root Authority account and back in as the Installer.

14. Navigate to the **Policies** tab and click the **Open** button on the far right. After the Installer has submitted the form, the next Policy Workflow Action required by the Installer is to register their sensors. Click the **Create Sensors**, fill out the required information in the dialog box, and select **OK**.

15. You'll notice that you just created a sensor, and that sensor has been assigned a Decentralized Identifier and a Verifiable Credential. Click the **Configuration** button. This will begin the download of the Sensor configuration file. Save that in a handy place because we will need it.

16. Open another tab on your browser and enter http://localhost:3005/. We now see our IoT simulator. You can either drag and drop the sensor configuration file to the big `+` sign in the upper left, or you click the button to browse your computer. For simplicity's sake, click the button next to **Random Value** for the IoT simulator to generate random Measurement, Reporting, and Validation (MRV) data. Click **OK** and press the **green triangle** to begin generating the data. Navigate back to the Guardian Policies tab, and you can click into the **MRV** tab. Here, you will see the data that the IoT sensor generated, such as date, period, amount, etc.

17. The last step is to log out of the Installer account and log into the Auditor account. There are two tabs in this view: **Audit** and **Trust Chain**. Clicking into the Audit tab offers high-level public information from our reference implementation such as the Verifiable Presentation ID, the Hash of the Verifiable Presentation, the DID of the sensor, the date information the Verifiable Presentation was created, the type of activity, and the ability to view the Verifiable Presentation.

18. Lastly, let's navigate to The Trust Chain tab. The Trust Chain tab will ask for one of two pieces of information, either the Verifiable Presentation ID (which can be found either in the Audit tab or the memo field of the transaction field on a Hedera explorer-like Dragon Glass) or the Transaction Hash. Entering either of those important identifiers will open all necessary information for you to discover. Important elements that can be publicly discovered include token information, Policy information, and all of the important information regarding the Verifiable Credentials that make up the Verifiable Presentation.

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

- NodeJS
- MongoDB
- Express
- FastMQ
- TypeORM
- Hedera-DID-JS-SDK
- W3C VC-JS-HTTP

### Frontend

- Angular
- crypto-browserify

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
