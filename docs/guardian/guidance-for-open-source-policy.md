# 📔 Guidance for Open Source Policy

There are items to be submitted to process open source policies and add it to open source repo:

* [Policy Description](guidance-for-open-source-policy.md#policy-description)
* [User Guide](guidance-for-open-source-policy.md#user-guide)
* [Automated policy workflow, with valid sample MRV data or MRV data generator/simulator](guidance-for-open-source-policy.md#automated-policy-workflow)
* [IPFS timestamps, .policy files](guidance-for-open-source-policy.md#timestamps-and-files)
* [Requirement to run tests before sending Guardian the policy, including backward compatibility tests](guidance-for-open-source-policy.md#run-tests)

## Policy Description

It should also include the following items:

1. Policy / Methodology Description&#x20;
2. Workflow Description
3. Workflow Diagram
4. Youtube video explaining the above points in detailed.

### Example:&#x20;

We will be using iREC 4 as an example in this Guide for submitting an open source policy:

### **iREC Methodology:**

**Policy Description**:

This policy supports the tokenization of Renewable Energy Certificates (RECs) in accordance with the I-REC Standard, and specifically, the I-REC(E) Product Code. The I-REC Standard is a non-profit organization that provides an attribute tracking standard that can be used around the world. While the I-REC Standard is designed to track attributes for a diversity of products, Product Codes provide additional requirements for specific products and markets. The I-REC(E) Product Code provides requirements for electricity products, and was developed by Evident, who acts as Code Manager and Registry Operator. The schema and workflow of this policy were designed to reflect the MRV requirements, processes, and roles outlined by both I-REC Standard and the I-REC(E) Product Code.

**Workflow Description**:

The workflow begins with the Registrant, generally the owner of an energy production facility or a party acting in their behalf, submitting an application to the Issuer for approval. Once approved, the Registrant submits a registration request to the Issuer for the facility/device that will be providing the MRV data. This will include both general information, as well as attributes (e.g., energy sources, location, etc.). Note that devices must be, and often are already, independently verified. Under certain circumstances an inspection may be necessary. Once the Issuer processed and approves the facility/device registration, an issue request can be sent to the Issuer along with independently verified meter data. After the Issuer approves the issue request, I-REC(E) certificates are issued.

<figure><img src="../.gitbook/assets/image (67).png" alt=""><figcaption></figcaption></figure>

## User Guide

Second step is to provide a detailed User Guide of the policy, meaning, a step by step process of running the policy with proper and clear screenshots of the policy steps. The steps should start from importing the policy to TrustChain execution.

For reference, please check [iREC 7 Demo UI Guide.](demo-guide/renewable-energy-credits/irec-7-demo-guide.md)

## Automated Policy Workflow with valid sample MRV data or MRV data generator/simulator

To run the submitted policy, it would be good to have all the valid sample MRV data, so that we can test it with that data and validate the policy with expected Trustchain and no. of tokens minted.

The data can be submitted in formats such as Excel or JSON.

Please check a example MRV Data of iREC 4 in JSON format:

{% file src="../.gitbook/assets/registrant data.json" %}

## Timestamps and files

## Run Tests
