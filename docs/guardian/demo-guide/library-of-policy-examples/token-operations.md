# Token Operations

## **Task summary**

Create a token with which newly registered users would be automatically linked. After the registration these users would be able to created documents which would be used for minting tokens at the rate of 1 token to 1000 units of value in the document.

## **Preparation**

First step in the execution of the policy would be user registration. To enable this we will create a corresponding schema which would contain ‘_First name’ and ‘Last name’ fields_.

Second step of policy execution is data input and document submission. To enable this we will create a corresponding schema containing ‘_Organization name’_ and ‘_Amount’ fields_

To enable document submission we will use document input block (_**requestVcDocumentBlock**_) and document persistence block (_**sendToGuardianBlock**_)

![image1.png](<../../../.gitbook/assets/0 (1).png>)

_Please see example 2 for the more in-depth guide of working with documents in Guardian Policies._

### **Token operations**

1. Create a token instances of which will be minted.

Switch to the ‘_Tokens_’ tab and create a new token

![image2.png](../../../.gitbook/assets/1.png)

1. Please note we created a token with ‘_KYC’_ flag as ‘on’. This imposes the requirement to perform a KYC action on users before they can receive the token:
   1. Link the token to the user via the ‘_**tokenActionBlock'**_
      1. Add ‘_**tokenActionBlock’**_ immediately after the user registration

![image3.png](../../../.gitbook/assets/2.png)

*
  *
    1. Select token and action type

![image4.png](<../../../.gitbook/assets/3 (1).png>)

*
  1. Set user KYC
     1. Add ‘_**tokenActionBlock’**_ immediately after ‘_token\_associate’_

![image5.png](<../../../.gitbook/assets/4 (1).png>)

*
  *
    1. Select token and the action type

![image6.png](<../../../.gitbook/assets/5 (1).png>)

1. User ‘_**tokenActionBlock’**_ to mint tokens
   1. Add ‘_**mintDocumentBlock’**_ immediately after saving the new document (_**save\_new\_documents**_)

![image7.png](../../../.gitbook/assets/6.png)

*
  1. Select token which will be minted

![image8.png](<../../../.gitbook/assets/7 (1).png>)

*
  1. Configure the formula which would define the amount of tokens minted

![image9.png](../../../.gitbook/assets/8.png)

*
  1. Configure the account where tokens will be sent to upon minting

![image10.png](../../../.gitbook/assets/9.png)

**Document display**

1. To show documents use ‘_**interfaceDocumentsSourceBlock'**_
   1. Add a new container in which the grid containing results would be placed

![image11.png](<../../../.gitbook/assets/10 (1).png>)

*
  1. Ensure that ‘_documents’ and ‘tokens’ are displayed in separate tabs_
     1. In the parent block set property ‘**Type’** to ‘Tabs’

![image12.png](<../../../.gitbook/assets/11 (1).png>)

*
  *
    1. Set the property ‘**Title’** to configure tab titles
  * Add ‘_**interfaceDocumentsSourceBlock’** into the ‘tokens’_ container and configure its columns

![image13.png](<../../../.gitbook/assets/12 (1).png>)

*
  1. Use ‘_**documentsSourceAddon’**_ block to retrieve data from the database.

![image14.png](../../../.gitbook/assets/13.png)

**Result:**
