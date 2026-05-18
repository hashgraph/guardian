# 5539 Editing Policy Parameters at Runtime

Editing Policy Parameters at Runtime

This feature allows modifying policy parameters after the policy has been published. The first step is to define which parameters can be modified. For this purpose, an additional button has been added to the Policy Configurator

<figure><img src="../../../.gitbook/assets/image (6).png" alt=""><figcaption></figcaption></figure>

Clicking this button opens a new dialog containing dynamic groups of properties, where any number of properties can be added and each property can be configured using the following fields: Block, Property, Visible, Apply for, Label, and Description

<figure><img src="../../../.gitbook/assets/image (36).png" alt=""><figcaption></figcaption></figure>

The Blocks dropdown contains only blocks from the current policy that have at least one editable property. The Visible field determines who can modify this property, while Apply for specifies the roles to which these changes will apply. The Label and Short Description appear on the form where policy parameters can be modified at runtime.

After configuring the policy parameters and publishing the policy, a new Parameter Settings button has been added to the policy.

<figure><img src="../../../.gitbook/assets/image (874).png" alt=""><figcaption></figcaption></figure>

These settings contain the parameters that were configured in the Policy Configurator. Values for editable parameters are stored in a new database table: policy\_parameters.

<figure><img src="../../../.gitbook/assets/image.png" alt=""><figcaption></figcaption></figure>

If some parameters are marked as required, this form opens automatically when the user opens the policy.

<figure><img src="../../../.gitbook/assets/image (1).png" alt=""><figcaption></figcaption></figure>

In the current example, the Information block can be modified. Before the changes are applied, the text configured in the corresponding property is displayed

<figure><img src="../../../.gitbook/assets/image (2).png" alt=""><figcaption></figcaption></figure>

After a new text is added to this property, it is displayed on this page

<figure><img src="../../../.gitbook/assets/image (3).png" alt=""><figcaption></figcaption></figure>

Endpoints for this feature

1. Retrieving the policy parameter configuration&#x20;

```
GET 
/:policyId/parameters/config
```

2. Saving Policy Parameters&#x20;

```
POST 
/:policyId/parameters 
[{ 
  blockType: string; 
  blockTag: string; 
  propertyPath: string; 
  visible: string[]; 
  applyTo: string[]; 
  label: string; 
  required: boolean; 
  shortDescription: string; 
  value?: any; 
}]
```
