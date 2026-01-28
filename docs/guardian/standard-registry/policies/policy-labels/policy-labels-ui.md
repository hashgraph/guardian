---
icon: computer
---

# Policy Labels UI

## **1. Permissions**

Access to Policy Labels functionality is controlled by the corresponding permissions settings.

<figure><img src="../../../../.gitbook/assets/0 (1).png" alt=""><figcaption></figcaption></figure>

## **2. Authoring Policy Labels**

### **2.1 Policy Labels view**

Users can review the list of existing labels and their statuses in the corresponding section of Guardian UI.

![](<../../../../.gitbook/assets/1 (1).png>)

### **2.2 Authoring**

A new Policy Label definition can be created by clicking on the ‘Create New’ button on the Policy Labels page.

![](<../../../../.gitbook/assets/2 (1).png>)

![](../../../../.gitbook/assets/3.png)

### **2.3 Configuration**

After the initial creation, Policy Label definitions must be configured further to be usable.

![](../../../../.gitbook/assets/4.png)

#### **2.3.1 Generic configuration**

Generic configuration of Policy Label definitions consists of name and description field. Label authors should configure meaningful names and descriptions for their labels as these are the attributes label users would rely on to understand the applicability of labels to their specific use-cases.

![](../../../../.gitbook/assets/5.png)

#### **2.3.2 Imports**

To include other published label definitions and statistics into the definition of a label being configured, these structural components must be imported into the context of the current label. Import operation links a parent label with the imported elements, which makes them available to the Label author in the side menu of the UI.

<figure><img src="../../../../.gitbook/assets/6.png" alt=""><figcaption></figcaption></figure>

![](../../../../.gitbook/assets/7.png)

![](../../../../.gitbook/assets/8.png)

![](../../../../.gitbook/assets/9.png)

#### **2.3.3 Creating rules**

Label configurator consists of 3 sections

1\. Side menu, for displaying components which can be dragged-and-dropped into the label editor.

2\. Label editor, which hosts the components where they can be arranged into a hierarchical structure representing the evaluation logic.

3\. Component properties, which define specifics of the behavior of the individual components.

![](../../../../.gitbook/assets/10.png)

**2.3.3.1 Components: Groups**

Groups are components which define the general structure of Labels. Each group has its own name (title) in the navigation panel and represents a specific namespace in which components have access to each other's variables. Groups define sufficient validity conditions for the target documents.

**Configuration**

* **Tag** – the name of the namespace
* **Title** – title in the navigation panel
* **Rule** – defines the principle by which the group will be evaluated
  * **At least one** – the group is considered valid if at least 1 of the direct (immediate) child components is valid
  * **Every** – the group is considered valid if all direct (immediate) child components are valid

![](../../../../.gitbook/assets/11.png)

**2.3.3.2 Components: Rules**

Rules are defined in terms of variables, scores, formulas and conditions.

A Rule is considered ‘valid’ if all its conditions successfully verify for the set of provided data.

![](../../../../.gitbook/assets/12.png)

**Configuration**

* **Tag** – name of the namespace
* **Title** – title in the navigation panel

For components which are members of the same group, each component that is positioned below another component (i.e. ‘follows’ the prior component) has access to the variables of the previous component via its Tag.\\

**2.3.3.2.1 Editing Rules**

Rules can be edited in the corresponding area of the UI:

![](../../../../.gitbook/assets/13.png)

**Rules editor consists of 2 sections:**

1\. Schema hierarchy and content (fields) display, which allows users to find and select specific fields in schemas for use in the Label calculation/evaluation (see more detailed description in the Statistics documentation section) **.**

![](../../../../.gitbook/assets/14.png)

2\. Formula and Rules configurator (see more detailed description in the Statistics and Schema Rules documentation sections).

**Variables** (see more detailed description in the [Statistics and Schema Rules](../../usage-statistics/statistics.md) documentation sections).

![](../../../../.gitbook/assets/15.png)

**Scores** (see more detailed description in the [Statistics](../../usage-statistics/statistics.md) documentation section).

![](../../../../.gitbook/assets/16.png)

**Formulas (**&#x73;ee more detailed description in the [Statistics](../../usage-statistics/statistics.md) documentation section).

![](../../../../.gitbook/assets/17.png)

**Conditions** Formula and Rules configurator (see more detailed description in the [Schema Rules](../../schemas/schema-rules/) documentation section).

![](../../../../.gitbook/assets/18.png)

**2.3.3.3 Components: Statistics**

Existing Statistics can be used as components in Labels. As they don’t contain conditions they are always evaluated as valid when the Label which contains them is evaluated. Therefore, their primary function is to serve as data sources for other components in the Label, as their variables can be accessed directly by other components in the same namespace.

![](../../../../.gitbook/assets/19.png)

**2.3.3.4 Components: Labels**

Existing labels can be used as components of other (higher order) labels. The internal structure of such embedded labels remains unchanged.

![](../../../../.gitbook/assets/20.png)

**2.3.4 Saving**

It is recommended to frequently use ‘Save’ button to preserve the current state of the Label being edited.

<figure><img src="../../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**2.3.5 Preview**

Label authors can preview (i.e. ‘dry run’ test) their Label functioning once its definition is complete by clicking the ‘Preview’ button in the configurator UI. Such test evaluations require manual input of the test data.

<figure><img src="../../../../.gitbook/assets/image (3) (1) (1) (1) (1) (1) (1) (2).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (4) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (5) (1) (1) (5).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (6) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

Components which were successfully validated on the provided test data would be marked in green, the unsuccessful results are marked in red.

{% hint style="info" %}
**Note**: Depending on the structure of the Label and the configuration of its rules it is not necessarily required for all Label components to be valid for the Label itself to be successfully validated. Groups can be configured such that some components do not validate, however the main top-level groups can be valid which is the main condition for Labels validity.
{% endhint %}

**2.3.6 Publishing**

To enable other users to find and use the Label it must be published.

<figure><img src="../../../../.gitbook/assets/image (7) (1) (3).png" alt=""><figcaption></figcaption></figure>

### **2.4 Document Creation**

Once the Label has been published it can be used to create Label documents on specific token data.

<figure><img src="../../../../.gitbook/assets/image (8) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**2.4.1 Targets**

The first step in the creation of a Label document is to select the target token (i.e. a VP document linked to the token).

<figure><img src="../../../../.gitbook/assets/image (9) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**2.4.2 Label evaluation**

All steps defined in the Label evaluation flow must be followed.

<figure><img src="../../../../.gitbook/assets/image (10) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**2.4.3 Results**

If a Label is evaluated as valid a corresponding document is created containing all Label information. This document can be published to make it accessible externally.

<figure><img src="../../../../.gitbook/assets/image (11) (1) (2) (2) (2).png" alt=""><figcaption></figcaption></figure>

### **2.5 Viewing Label documents**

Existing Label documents can be accessed from the corresponding grid.

<figure><img src="../../../../.gitbook/assets/image (13) (1) (1) (3) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (14) (1) (1) (2).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (15) (5).png" alt=""><figcaption></figcaption></figure>

## **3. Labels Import\Export**

<figure><img src="../../../../.gitbook/assets/image (16) (1) (2).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (17) (5).png" alt=""><figcaption></figcaption></figure>

## **4. Indexer view**

### **4.1 Published Labels**

<figure><img src="../../../../.gitbook/assets/image (18) (2).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (19) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### **4.2 Published Label documents**

<figure><img src="../../../../.gitbook/assets/image (20) (5).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (21) (2).png" alt=""><figcaption></figcaption></figure>

### **4.3 List of the Labels linked to the specific token VP document**

<figure><img src="../../../../.gitbook/assets/image (22) (3).png" alt=""><figcaption></figcaption></figure>

### **4.4 List of Labels linked to the specific token**

<figure><img src="../../../../.gitbook/assets/image (23) (5).png" alt=""><figcaption></figcaption></figure>

### **4.5 List of Labels linked to the specific NFT**

<figure><img src="../../../../.gitbook/assets/image (24) (3).png" alt=""><figcaption></figcaption></figure>

### **4.6 Viewing Label documents**

<figure><img src="../../../../.gitbook/assets/image (25) (3).png" alt=""><figcaption></figcaption></figure>

1. **API**

Post _/api/v1/policy-labels/_

Permissions: STATISTICS\_LABEL\_CREATE

Creating new Label definition

Get _/api/v1/policy-labels/_

Permissions: STATISTICS\_LABEL\_READ

Retrieve the list of Label definitions

Get _/api/v1/policy-labels/:definitionId_

Permissions: STATISTICS\_LABEL\_READ

Retrieve a label definition configuration by ID

Put _/api/v1/policy-labels/:definitionId_

Permissions: STATISTICS\_LABEL\_CREATE

Update Label configuration by ID

Delete /api/v1/policy-labels/:definitionId

Permissions: STATISTICS\_LABEL\_CREATE

Delete Label definition by ID

Put /api/v1/policy-labels/:definitionId/publish

Permissions: STATISTICS\_LABEL\_CREATE

Publish Label definition by ID

Put /api/v1/policy-labels/push/:definitionId/publish

Permissions: STATISTICS\_LABEL\_CREATE

Publish Label definition by ID asynchronously

Get /api/v1/policy-labels/:definitionId/relationships

Permissions: STATISTICS\_LABEL\_READ

Retrieve the list of components for Label configuration (schemas, policies, etc)

Post /api/v1/policy-labels/:policyId/import/file

Permissions: STATISTICS\_LABEL\_CREATE

Import Label configuration from a file

Get /api/v1/policy-labels/:definitionId/export/file

Permissions: STATISTICS\_LABEL\_READ

Export Label configuration to a file

Post /api/v1/policy-labels/import/file/preview

Permissions: STATISTICS\_LABEL\_CREATE

Preview of the imported file

Post /api/v1/policy-labels/components

Permissions: STATISTICS\_LABEL\_CREATE

Search for Labels and Statistics for importing into Label configuration

Get /api/v1/policy-labels/:definitionId/tokens

Permissions: STATISTICS\_LABEL\_READ

Retrieve the list of created tokens (VPs) for which a Label document can be created

Get /api/v1/policy-labels/:definitionId/tokens/:documentId

Permissions: STATISTICS\_LABEL\_READ

Retrieve token (VP) and all its dependencies by document ID

Post /api/v1/policy-labels/:definitionId/documents

Permissions: STATISTICS\_LABEL\_CREATE

Create a new Label document for token (VP)

Get /api/v1/policy-labels/:definitionId/documents

Permissions: STATISTICS\_LABEL\_READ

Retrieve a list of created Label documents

Get /api/v1/policy-labels/:definitionId/documents/:documentId

Permissions: STATISTICS\_LABEL\_READ

Retrieve Label document by ID

Get /api/v1/policy-labels/:definitionId/documents/:documentId/relationships

Permissions: STATISTICS\_STATISTIC\_READ

Retrieve linked Label documents by ID
