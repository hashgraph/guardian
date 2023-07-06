# 💻 Themes using UI

## **Themes**

Themes are used to change visual display of Policy blocks in the Policy Configurator.

Block’s display style is determined by their matching of the criteria defined in the theme.

### **1. Theme management**

Policy Configurator contains a section, it can be navigated to by clicking the corresponding button named **Settings** in the top panel.

<figure><img src="../../../../.gitbook/assets/0 (5) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/1 (5) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
_**Note**: users must click ‘**Save**’ button to preserve the changes to the theme after edits as shown below:_
{% endhint %}

<figure><img src="../../../../.gitbook/assets/2 (5) (1).png" alt=""><figcaption></figcaption></figure>

#### **1.1 Menu actions**

![image4.png](<../../../../.gitbook/assets/3 (6).png>)

* Create new theme
* Copy selected theme
* Change naming of the selected theme
* Import new theme
* Export new theme
* Delete selected theme

#### **1.2 Rules**

Each themes contains a set of **rules** which feature matching conditions and linked styles.

The matching and styling algorithm is as follows:

* For each block rules are checked in the order to their definition.
* If/when Policy element (block) satisfies the condition in the rule the style from the rule definition is applied to the element.
* If/when the block satisfied more than one rule all styles are ‘merged’ and applied to the block resulting in the multi-colored blocks.
* If/when the block does not match any of the rules’ criteria the default style is applied to the block. Default style always exist in every theme.

<figure><img src="../../../../.gitbook/assets/4 (4).png" alt=""><figcaption></figcaption></figure>

**1.2.1 Adding new rules**

New rules can be added by clicking on **Create Rule** button.

<figure><img src="../../../../.gitbook/assets/5 (4) (1).png" alt=""><figcaption><p>Adding new Rules</p></figcaption></figure>

**1.2.2 Removing rules**

Rules can be removed by clicking on remove icon as shown below:

<figure><img src="../../../../.gitbook/assets/6 (4).png" alt=""><figcaption></figcaption></figure>

**1.2.3 Default rule**

This rule is applied if and only if no other rules’ conditions matches the Block.

![](<../../../../.gitbook/assets/7 (5) (1).png>)

**1.2.4 Conditions**

<figure><img src="../../../../.gitbook/assets/8 (5).png" alt=""><figcaption></figcaption></figure>

Multiple types of conditions can be used in rule definitions

* Types – allows matching based on the type of the block

![](<../../../../.gitbook/assets/9 (4) (1).png>)

* Roles – allows matching based on block permissions, i.e. based on the roles to whom the blocks are accessible

<figure><img src="../../../../.gitbook/assets/10 (5) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Note:**

_roles are dynamic variables in policies (i.e. policies can define arbitrary number of custom roles). However theme rule definitions are generic (applicable to all policies). Therefore the order of appearance of roles in the policy are used as a role IDs for theme rule definitions. ‘Owner’ role exists in all policies thus it is referred to by name in the theme rule definitions._
{% endhint %}

* API – allows matching based on the API-level access to the block

![](<../../../../.gitbook/assets/11 (6).png>)

* GET & POST – block can be access with GET and POST HTTP requests
* Only GET – block can only be accessed via GET API method
* Not Accessible – block is not accessible via API

**1.2.5 Styles**

Style definitions in rules defined text color and text background color, line (shape) color, form and thickness.

![](<../../../../.gitbook/assets/12 (5).png>)

{% hint style="info" %}
**Note:**

_In the case when multiple theme rules are applied to the block (when multiple rule criteria matched the block) only the background color is ‘merged’ resulting in the multi-colored (stripy) block appearance. For all other style parameters the definitions from the first matching rule are used._
{% endhint %}

![](<../../../../.gitbook/assets/13 (5).png>)

![](<../../../../.gitbook/assets/14 (5).png>)

**1.2.6 Description**

Description – is a textual description of the rule. It is displayed next to the explainer drop down in the Policy Configurator.

![](<../../../../.gitbook/assets/15 (4) (1).png>)

**1.3 Syntax**

New color-stylization of policy syntax groups is now possible as shown below:

<figure><img src="../../../../.gitbook/assets/image (33) (3).png" alt=""><figcaption></figcaption></figure>

**1.3.1 Displaying the syntax in Legend**

The syntax highlighting is used in the JSON or YAML view in the policy configurator. Colors correspond to different ‘types’ of keywords in the code, the current colors-to-types mapping is displayed in the legend in the top right corner.

<figure><img src="broken-reference" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (36).png" alt=""><figcaption></figcaption></figure>

### **2. Using themes**

#### **2.1 Selecting themes**

Themes can be selected from the drop down button as shown below:

<figure><img src="../../../../.gitbook/assets/16 (4) (1).png" alt=""><figcaption></figcaption></figure>

**2.2 Explainer drop-down :** We are able to see all the defined settings in policy configurator screen.

![](<../../../../.gitbook/assets/17 (4).png>)

Explainer drop-down button is highlighted as shown below:

![](<../../../../.gitbook/assets/18 (4).png>)
