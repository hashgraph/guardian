---
icon: chart-line-up
---

# Bottom Up Data Traceability using UI

1. [Step By Step Process](bottom-up-data-traceability-using-ui.md#id-1.-step-by-step-process)
2. [Demo Video](bottom-up-data-traceability-using-ui.md#id-2.-demo-video)

## 1. Step By Step Process

## Statistics Terminology

* Statistics **Definition** – a template which specifies schema/document fields, rules and formulas for creation of the Statistics.
* Statistics **Assessment** – a generated result/instance of the statistics (based on the **definition**) for a given collection of VC documents

### **1. Definition**

#### **1.1 List of statistics definitions and their statuses**

<figure><img src="../../../.gitbook/assets/0 (22).png" alt=""><figcaption></figcaption></figure>

#### **1.2 New statistics definition**

Define new Statistics by specifying mandatory parameters:

* **Name** – the name of the statistic, this will be displayed in the statistics grid for users to choose from.
* **Policy** – the policy to which this statistic is related to. All data used in the statistics assessment will from documents produced by projects governed by this policy.

<figure><img src="../../../.gitbook/assets/1 (24).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/2 (26).png" alt=""><figcaption></figcaption></figure>

#### **1.3 Configuration**

Statistics **definition** is configured via the corresponding configuration wizard.

![](<../../../.gitbook/assets/3 (22).png>)

**1.3.1 Generic configuration options**

![](<../../../.gitbook/assets/4 (20).png>)

**1.3.2 Specifying data schemas and fields**

To retrieve data from documents for use in the statistics Guardian relies on the schema and field specifications.&#x20;

The main tool for their configuration is the “schema tree view” of the policy as shown below, which allows the identification of the needed fields by browsing and search.

![](<../../../.gitbook/assets/5 (23).png>)

**1.3.2.1 Search**

Field names and/or property names can be used in the search for lookup and identification of the target fields.

<figure><img src="../../../.gitbook/assets/6 (22).png" alt=""><figcaption></figcaption></figure>

**1.3.2.2 Selecting the fields**

Selecting a schema ‘box’ in the tree pop-ups a right-hand panel where the list of fields in the selected schema is displayed. The interface allows for the selection of multiple fields using checkboxes.

![](<../../../.gitbook/assets/7 (22).png>)

**Note: T**_**he right-hand panel always shows fields from the parent (or top-level) schemas, which are directly used by Guardian Policies to generate documents. As sub-schemas do not map to their own stand-alone documents (they are embedded into the parent schemas), when a sub-schema is selected in the tree view the right hand-panel display also includes fields from the parent document for clarity.**_

**1.3.2.3 Properties**

By default files are searched and displayed by description. Users can navigate to the **Select** **Properties** tab to switch to search and display by **Properties**.

<figure><img src="../../../.gitbook/assets/8 (22).png" alt=""><figcaption></figcaption></figure>

_**Note: for fields which do not have defined Properties the UI instead shows their description fields in greyed out text.**_

**1.3.2.4 Document selection**

In addition to fields, for each target schema users must specify rules for selecting the target documents which conforms to the schemas. On the basis of these rules Guardian would compose 2 lists:

1. **Main** – these documents would be listed for user selection when creating Statistics Assessments. These are the documents that provide source data for statistics calculations.
2. **Relationships –** contains the list of dependent documents for the main document.

\
Document selections settings:\


![](<../../../.gitbook/assets/9 (19).png>)

1. **Main** – each document conforming to this schema will be placed into the **Main** list to be available for use in creating **Assessments.**

**Note:** _There must be at least a single schema marked as **Main.** Nominating more than one schema as **Main** for a single Assessment is not recommended._

2. **Related** – if the schema is marked as related, for each **Main** document Guardian will find documents conforming to this schema and which are linked to the main document via the **relationships** field. The link does not have to be direct.
3.  **Unrelated** – all documents of this schema will be considered to be related to each **Main** document irrespectively whether they are linked or not.

    _Example: there are 3 schemas: device, organization, Standard Registry (SR) which issued this policy. For our device statistics, fields from the organization and SR schemas are also required. In this case: device schema - Main, organisation schema - Related, and SR schema - unrelated._

**1.3.3 Configuring formulas and scores**

The final step in statistics configuration is to configure the outputs of the statistics calculation.

![](<../../../.gitbook/assets/10 (20).png>)

**1.3.3.1 Input Fields**

The list of source fields and schemas, selected in the previous steps, their short identifiers serve to simplify the use in formulas.\


**1.3.3.2 Scores**

Questions with lists of possible answers and their matching numerical scores. The creator of the **Assessment** would be required to select one of the answers after reviewing the content of the fields in the target documents.

**Description –** text of the question

**Relationships –** the list of the dependent fields from **Input Fields.** These fields would be shown with the question when the assessment is created. This fields are here for clarity - to assist the user and make the selection and later scoring simpler.

**Options**

Answer options, the associated numerical values are used in the formula\[s].

![](<../../../.gitbook/assets/11 (17).png>)

**1.3.3.3 Output Fields (Formulas)**

Output fields, which contain the results of the calculations as specified by the corresponding formulas. Guardian supports [https://mathjs.org/](https://mathjs.org/) syntax and Excel functions in the scope implemented in [https://formulajs.info/functions/](https://formulajs.info/functions/).

The values from the **ID** column (short names) of **Input Fields** and **Scores** can be used as variables in these formulas.

**1.3.3.4 Preview**

A sort of ‘dry-run’ mode for Formulas, useful for testing and validation of the correctness of formula specifications with test data.

![](<../../../.gitbook/assets/12 (15).png>)

In this view users can manually fill out the test data and verify that the formula calculates the expected value.

![](<../../../.gitbook/assets/13 (15).png>)

The changes to the Statistics Definition are saved once the “Apply Changes” button is pressed.

![](<../../../.gitbook/assets/14 (12).png>)

### **2. Publication**

To enable the use of **Definitions** for creating **Assessments** of real data, they need to be published.

![](<../../../.gitbook/assets/15 (14).png>)

### **3. Assessments**

#### **3.1 Creation**

Published **Definitions** can be used for creating an **Assessment** by pressing the **Create** button for the corresponding Statistics **Definition** which launches the **Assessment** wizar&#x64;**.**

![](<../../../.gitbook/assets/16 (13).png>)

**3.1.1 Target documents**

Users are presented with the choice of documents to select for the **Assessment**, this list contains all documents nominated as **Main** in the Statistics Definition.

![](<../../../.gitbook/assets/17 (14).png>)

**3.1.2 Preview**

The wizard then displays the relevant fields from the documents (which are configured in **Rules** in the Statistics Definition).

<figure><img src="../../../.gitbook/assets/18 (12).png" alt=""><figcaption></figcaption></figure>

**3.1.3 Scores**

Users are then required to ‘score’ the questions (if questions and options for answers were configured in the Statistics Definition).

![](<../../../.gitbook/assets/19 (10).png>)

**3.1.4 Statistics**

Guardian calculates and presents the Assessment result. To confirm, create, and publish the document users need to press the **Create** button.

![](<../../../.gitbook/assets/20 (7).png>)

#### **3.2 Viewing**

Existing **Assessments** can be found in the corresponding grid.

<figure><img src="../../../.gitbook/assets/image (690).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (691).png" alt=""><figcaption></figcaption></figure>

**3.2.1 General information**

Technical information about the selected Statistics, its Policy, Hedera Topic, Hedera message, the document, etc is presented in the **Overview** tab.

<figure><img src="../../../.gitbook/assets/image (692).png" alt=""><figcaption></figcaption></figure>

**3.2.2 Document**

The document content is viewable from the **Document** tab.

<figure><img src="../../../.gitbook/assets/image (693).png" alt=""><figcaption></figcaption></figure>

**3.2.3 Links**

Related documents can be browsed and viewed from the **Relationships** tab.

<figure><img src="../../../.gitbook/assets/image (694).png" alt=""><figcaption></figcaption></figure>

The detailed view of the related document.

<figure><img src="../../../.gitbook/assets/image (695).png" alt=""><figcaption></figcaption></figure>

### **4. Messages**

Example Hedera message on the publication of a new Statistics **Definition**

```
{
"id": "a4c14ad1-5ea4-41fd-99c1-cdaf9c334cbc"
"status": "ISSUE"
"type": "Policy-Statistic"
"action": "publish-policy-statistic"
"lang": "en-US"
"name": "Statistic Report"
"description": ""
"owner": "did:hedera:testnet:2vLnWwYDGAaG…xoWpmDr_0.0.4808747"
"uuid": "5dd4f7ff-5d8c-44fc-b89f-fc1c4c2fbc07"
"policyTopicId": "0.0.4932698"
"policyInstanceTopicId": "0.0.4933053"
"cid": "bafkreidefj5losvmads3l6qpcw4fidpitos72vorj4d4fxissmpllfk2hq"
"uri": "ipfs://bafkreidefj5losvmads3l6qpcw4fidpitos72vorj4d4fxissmpllfk2hq"
}
```

Example Hedera message on the publication of a new Statistics **Assessment**

```
{
"id": "0d2fc4c3-3c2a-42d6-9cc5-f5fe55807d52"
"status": "ISSUE"
"type": "VC-Document"
"action": "create-assessment-document"
"lang": "en-US"
"issuer": "did:hedera:testnet:5nGYw7gR...6ZiY2egeEKjf_0.0.4808747"
"relationships": ["1727800489.923243000","1727799087.616298000"]
"target": "1727800489.923243000"
"definition": "1727875229.008285000"
"cid": "bafkreigrylqfyzqifhloklsftmcw7obtqidx64vhti4hfmbnpbrnathuty"
"uri": "ipfs://bafkreigrylqfyzqifhloklsftmcw7obtqidx64vhti4hfmbnpbrnathuty"
}
```

## 2. Demo Video

[Youtube](https://youtu.be/tYLsr4rxw58?si=XNRvpap7aosnwuhh\&t=107)
