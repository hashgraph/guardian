# 🏭 CDM AMS-III.AR : Carbon Development Mechanism

## **Table of Contents**

* [Introduction](carbon-development-mechanism-cdm-ams-iii.ar-policy.md#introduction)
* [Why the AMS-III.AR Methodology?](carbon-development-mechanism-cdm-ams-iii.ar-policy.md#why-ams-iii.ar-methodology)
* [Demo Video](carbon-development-mechanism-cdm-ams-iii.ar-policy.md#demo-video)
* [Policy Workflow](carbon-development-mechanism-cdm-ams-iii.ar-policy.md#policy-workflow)
* [Policy Guide](carbon-development-mechanism-cdm-ams-iii.ar-policy.md#policy-guide)
* [Important Documents & Schemas](carbon-development-mechanism-cdm-ams-iii.ar-policy.md#important-documents-and-schemas)
* [Token (Carbon Credit)](carbon-development-mechanism-cdm-ams-iii.ar-policy.md#token-carbon-credit)
* [Step By Step](carbon-development-mechanism-cdm-ams-iii.ar-policy.md#step-by-step)

## **Introduction**

\
AMS-III.AR is a specific methodology under the Clean Development Mechanism (CDM) that aims to promote sustainable development by facilitating the substitution of fossil fuel-based lighting systems with energy-efficient LED/CFL lighting systems. This methodology focuses on reducing greenhouse gas emissions associated with lighting and improving energy efficiency in developing countries. The objective of AMS-III.AR is to encourage the adoption of LED (Light Emitting Diode) and CFL (Compact Fluorescent Lamp) lighting technologies as alternatives to traditional fossil fuel-based lighting systems such as incandescent bulbs or kerosene lamps. LED and CFL lighting systems are more energy-efficient, have longer lifespans, and produce significantly lower greenhouse gas emissions compared to their fossil fuel-based counterparts.

## **Why AMS-III.AR Methodology?**

\
Let's explore the drawbacks of fuel-based lighting and the compelling advantages offered by LED/CFL bulbs. It is widely acknowledged that fuel-based lighting falls short in terms of efficiency, delivering limited and low-quality illumination, while also subjecting users to significant health and fire hazards—especially in low and middle-income countries, where over 95% of fatal fire-related burns occur. Furthermore, the use of fuel-based lighting contributes to Greenhouse Gas (GHG) emissions, leading to increased indoor air pollution, health risks, decreased productivity, and compromised safety. Astonishingly, the total fuel consumption for lighting, equivalent to a staggering 1.3 million barrels of oil per day, results in approximately 190 million tons of carbon dioxide emissions annually.

On the other hand, LED/CFL bulbs emerge as superior options, and here's why. First and foremost, they are highly energy-efficient, utilizing up to 80% less energy compared to conventional bulbs. This not only translates into substantial energy savings but also aids in reducing carbon emissions, making LED/CFL bulbs an eco-friendly choice. In addition to their energy efficiency, these bulbs boast an impressively long lifespan—up to 25 times longer than traditional bulbs. This remarkable durability means fewer replacements, reduced waste generation, and lower maintenance costs. With LED/CFL bulbs, you can enjoy long-lasting illumination while minimizing your impact on the environment.

Moreover, LED bulbs are designed with sustainability in mind. Unlike conventional bulbs, they do not contain harmful substances like mercury, making them safer for both human health and the planet. Additionally, LED bulbs produce minimal heat, further enhancing their safety and sustainability. While CFL bulbs do contain small amounts of mercury, it's important to note that switching to compact fluorescent light bulbs still offers energy savings, reducing our reliance on fossil fuels burned for electricity generation. Furthermore, the increased efficiency and extended lifespan of LED/CFL bulbs contribute to resource conservation during the production process.

In conclusion, LED/CFL bulbs outshine fuel-based lighting on multiple fronts. They not only provide superior lighting quality but also bring significant energy savings, reduced carbon emissions, prolonged lifespan, and a more sustainable lighting solution. By adopting LED/CFL technology, we can make a positive impact on our environment.

## **Demo Video**

[Youtube Link](https://youtu.be/czbsLZU\_Gl4)

## **Policy Workflow**

\
The workflow for the AMS-III.AR policy involves four key roles to ensure transparency and accountability.

These roles are as follows:

* **Project Proponent** - The project proponent is responsible for executing the emission reduction project. They develop and implement strategies to substitute fossil fuel-based lighting systems with LED/CFL lighting systems. The project proponent must adhere to the requirements outlined by the CDM and provide evidence of the emission reductions achieved. Upon successful verification, the project proponent receives certified emission reduction (CER) tokens as an incentive for their emission\
  reductions.
* **Verification and Validation Body (VVB)** - The VVB plays a critical role in independently verifying and validating the project data submitted by the project proponent. They thoroughly assess the project's emission reduction potential, methodologies, and adherence to the policy guidelines. Based on their evaluation, the VVB either approves or rejects the project for registration.
* **Designated National Authority (DNA)** - The DNA is a governmental body representing the country where the emission reduction project is being implemented. They review and approve the project's eligibility in accordance with national policies and regulations. The DNA's endorsement is essential for the project to proceed with the AMS-III.AR policy.
* **Registry (UNFCCC)** - The United Nations Framework Convention on Climate Change (UNFCCC) serves as the registry for the CDM. They oversee the multiple workflow steps involved in the project's approval, including the verification and validation process by the VVB and the endorsement by the DNA. The UNFCCC's approval is necessary for the project's successful registration and issuance of CER tokens

<figure><img src="../../../.gitbook/assets/0 (1) (1) (1).jpeg" alt=""><figcaption></figcaption></figure>

## **Policy Guide**

\
This policy is published to the Hedera network and can either be imported via Github(.policy file) or IPFS timestamp. IPFS timestamp: 1698756576.572245003

## **Important Documents & Schemas**

**Project Description -** Project Proponent information, standard project information, methodology information, etc.

**Baseline Emissions –** Baseline emission calculation that automatically occurs without the need for a form.

**Default Values (Tool 33) -** Tool 33 is included as a module within the policy. This module is used to calculate default values for common parameters like emission factors for diesel generator systems.

## **Minimum Requirements for the Design Specifications of Project Lamps –**

This schema is included in the policy as a form within the project information form, fields are included to collect the following information about the project:

* Lamp wattage (in Watts) and luminous flux output (in lumens)
* Rated lamp life (in hours)
* Where applicable, the type and rated capacity of the renewable energy equipment used for battery-charging (in Watts)
* Type (e.g. NiMH, Lead-Acid, Li-ion, Lithium-iron-phosphate, etc.), nominal voltage, and rated capacity of the batteries (in Ampere hours)
* Type of charge controller (e.g. active or passive)
* Autonomous time and DBT
* Solar Run Times(s) (SRT) for products with solar energy charging systems
* Where applicable, the amount of time to fully charge the product using mechanical means or a centralized charging system (e.g. the national grid)
* Physical protection against environmental factors (e.g. rain, heat, insect ingress)

**Project Emissions –** Schema included within the project information form; this is filled out by the project proponent to calculate project emissions per project lamp.

**Emissions Reduction –** Schema included within the project information form; this is filled out by the project proponent to calculate annual emission reductions.

**Monitoring Report –** The monitoring report is to be filled out based on the monitoring plan mentioned within the methodology.

## **Token (Carbon Credit)**

\
Certified Emission Reduction (CER) credits, each equivalent to one tonne of CO2.

## **Step By Step**

1. Log in as the Standard Registry and import the policy either by file or through IPFS timestamp by selecting the third button at the top right.

<figure><img src="../../../.gitbook/assets/image (503).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (504).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (505).png" alt=""><figcaption></figcaption></figure>

2. To start using the policy you first have to change the status of the policy from “Draft” to “Dry Run” or “Publish”, then select the “Register” button.

<figure><img src="../../../.gitbook/assets/image (506).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (507).png" alt=""><figcaption></figcaption></figure>

3. Create a new user by clicking the “Create User” button and assign their role as Project Participant.

<figure><img src="../../../.gitbook/assets/image (508).png" alt=""><figcaption></figcaption></figure>

4. The Project Participant can now provide their name or the name they would like to see reflect when registering for this project (i.e. their organization’s name).

<figure><img src="../../../.gitbook/assets/image (509).png" alt=""><figcaption></figcaption></figure>

5. Сreate a new user again and assign their role as VVB.

<figure><img src="../../../.gitbook/assets/image (510).png" alt=""><figcaption></figcaption></figure>

6. The VVB can now provide their name or the name they would like users to see when reviewing projects (i.e. their organization’s name).

<figure><img src="../../../.gitbook/assets/image (511).png" alt=""><figcaption></figcaption></figure>

7. Log in as the SR and select the “Project Participants” or the “VVBs” tab to view the documents submitted by the Project Participant and by the VVB. The SR can approve their requests by clicking on the “Approve" button.

<figure><img src="../../../.gitbook/assets/image (512).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (513).png" alt=""><figcaption></figcaption></figure>

8. Log in as the Project Participant and create a new project by clicking on the "New Project" button. This form is used to collect information about the project, organization, and all the data needed to run the emission reduction calculations. Once all the required fields have been filled the “Create” button will turn dark blue. By selecting the “Create” button all the data will be sent to the SR for review/approval.

<figure><img src="../../../.gitbook/assets/image (514).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (515).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (516).png" alt=""><figcaption></figcaption></figure>

9. Log back in as the SR and after reviewing the document by selecting the “View Document” button, the SR can validate the project submitted by the Project Participant by clicking the “Validate” button. If the data does not satisfy the rules set by the SR, then the “Reject” button can be used.

<figure><img src="../../../.gitbook/assets/image (517).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (518).png" alt=""><figcaption></figcaption></figure>

10. Log in as the Project Participant and create a monitoring report by clicking on the “Add Report” button then fill out the monitoring report form.

<figure><img src="../../../.gitbook/assets/image (519).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (520).png" alt=""><figcaption></figcaption></figure>

11. After creating the monitoring report, the project participant assigns the VVB to verify it by navigating to the “Monitoring Reports” tab and selecting the dropdown under “Assign”.

<figure><img src="../../../.gitbook/assets/image (521).png" alt=""><figcaption></figcaption></figure>

12. Log in as the VVB and click the “Monitoring Reports” tab to review the document submitted by the Project Participant. After reviewing the monitoring report by selecting “View Document”, the VVB can select “Verify”.

<figure><img src="../../../.gitbook/assets/image (522).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (523).png" alt=""><figcaption></figcaption></figure>

13. Log in as the SR to review the monitoring report by selecting the “View Document” button in the “Monitoring Reports” tab. The SR can approve the monitoring report by selecting “Approve”. This will also trigger the minting process. You can see the minting status under “Status” change from “Minting” to “Minted”.

<figure><img src="../../../.gitbook/assets/image (524).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (525).png" alt=""><figcaption></figcaption></figure>

14. Once the minting process is completed, you can view the token amount by selecting the “Token History” tab.

<figure><img src="../../../.gitbook/assets/image (526).png" alt=""><figcaption></figcaption></figure>

15. The TrustChain can also be viewed by clicking on the “View TrustChain” button. Please note that the token amount may show “-1” when the tokens are still minting. Once the process is complete a notification will appear stating that the tokens have been minted and transferred.

<figure><img src="../../../.gitbook/assets/image (527).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (528).png" alt=""><figcaption></figcaption></figure>
