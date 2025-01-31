---
icon: laptop-code
---

# Formula Linked Definitions using UI

## **1. Creation**

### **1.1 Existing formulas**

The list shows existing formulas and their status

![](<../../../../.gitbook/assets/0 (23).png>)

### **1.2 New formulas**

New formula can be created by clicking on the ‘Create New’ button in the corresponding UI form.

<figure><img src="../../../../.gitbook/assets/1 (25).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/2 (27).png" alt=""><figcaption></figcaption></figure>

### **1.3 Configuration**

After a formula is created it needs to be configured.

![](<../../../../.gitbook/assets/3 (23).png>)

#### **1.3.1 Basic configuration**

Basic configuration of Formulas include name and description. It is advisable to use meaningful texts for these configuration options to enable viewers to easily understand the meaning and the purpose of the formula.

![](<../../../../.gitbook/assets/4 (21).png>)

#### **1.3.2 Math configuration**

Formulas can be composed from the unlimited number of items of the 4 types (as shown in the screenshot below):

* Constants
* Variables
* Formulas
* Text

![](<../../../../.gitbook/assets/5 (24).png>)

**1.3.2.1 Constants**

Constants are variables with fixed values. Definition of constants contain Name, Description and Value.

![](<../../../../.gitbook/assets/6 (23).png>)

**1.3.2.2 Variables**

Variables in Formulas represent data from documents. Variables can be linked with specific fields in schemas (using “Link” field). Similarly to ‘Constant’, ‘Variable’ definitions also contain Name and Description fields.

![](<../../../../.gitbook/assets/7 (23).png>)

_Link –_ special field which links variables to a schema field, or a component of another formula.

![](<../../../../.gitbook/assets/8 (23).png>)

![](<../../../../.gitbook/assets/9 (20).png>)

![](<../../../../.gitbook/assets/10 (21).png>)

**1.3.2.3 Formulas**

Formula definitions can be re-used in other formulas. Formulas are defined using LaTex notation.

![](<../../../../.gitbook/assets/11 (18).png>)

![](<../../../../.gitbook/assets/12 (16).png>)

![](<../../../../.gitbook/assets/13 (16).png>)

_Link_ – a special field which indicates the field in the document schema where the result of the calculation is located.

![](<../../../../.gitbook/assets/14 (13).png>)

Relationships – to enable navigation in a Formula using its variables, the list of these variables must be defined in the corresponding field.

![](<../../../../.gitbook/assets/15 (15).png>)

**1.3.2.4 Text**

Text - a component which allows the description of the calculation algorithm without using mathematical notation. This component does not require any specific syntax.

![](<../../../../.gitbook/assets/16 (14).png>)

## **2. Publishing**

Formulas are linked to Policies and are only meaningful in the context of a Policy. Formulas can be published at the same time as the corresponding Policies, or separately after the Policy has been published. In the later case the Policy archive file will not include Formula definitions but otherwise will also be fully functional.

<figure><img src="../../../../.gitbook/assets/17 (15).png" alt=""><figcaption></figcaption></figure>

## **3. Viewing**

Formulas are accessible via the corresponding button for all document which have linked formulas.

![](<../../../../.gitbook/assets/18 (13).png>)

The Formula display dialogue shows all linked formulas and provides facilities to navigate through the components of these formulas.

![](<../../../../.gitbook/assets/19 (11).png>)

![](<../../../../.gitbook/assets/20 (8).png>)

## **4. Access**

Policy Author users can create and edit formulas. Formulas are visible to all uses which access to the documents to which formulas are linked.

## **5. Import\Export**

Formula definitions can be exported into a file.

<figure><img src="../../../../.gitbook/assets/image (799).png" alt=""><figcaption></figcaption></figure>

Corresponding, Formula definition can be imported from a file.

<figure><img src="../../../../.gitbook/assets/image (800).png" alt=""><figcaption></figcaption></figure>
