# Roles and Permissions User Guide

1. [Step By Step Process](roles-and-permissions-user-guide.md#id-1.-step-by-step-process)
2. [Demo Video](roles-and-permissions-user-guide.md#id-2.-demo-video)

## 1. Step By Step Process

Roles and permissions allow for precise configuration of user access rights to Guardian functionality.

1. **Permissions format: {category}\_{entity}\_{action}**

* _**POLICIES\_POLICY\_READ**_ – Controls read access to policies
* _**POLICIES\_POLICY\_EXECUTE**_ – Controls access to running policies as a USER. When this access is given to a Guardian user, this user can assume a role within the policy and perform actions in the policy workflow.
* _**TOKENS\_TOKEN\_EXECUTE**_ – Controls access to viewing tokens (balance, associate, disassociate)
* _**POLICIES\_POLICY\_MANAGE**_ – Controls access to running policy as an OWNER.
* _**TOKENS\_TOKEN\_MANAGE**_ – Controls access to managing tokens (balance, grant-kyc, freeze, unfreeze)

## **1. Managing roles**

### **1.1 Create**

Standard Registry user with the corresponding permission (_PERMISSIONS\_ROLE\_CREATE_) can create new roles and populate them with the needed permissions.

![](<../../../.gitbook/assets/0 (15).png>)

![](<../../../.gitbook/assets/1 (17).png>)

\
Roles consist of a set of permissions which allow uses corresponding actions in the Guardian instance.

![](<../../../.gitbook/assets/2 (19).png>)

### **1.2. Edit**

<figure><img src="../../../.gitbook/assets/3 (16).png" alt=""><figcaption></figcaption></figure>

### **1.3 Delete**

<figure><img src="../../../.gitbook/assets/4 (14).png" alt=""><figcaption></figcaption></figure>

### **1.4 Default**

Default role would be applied to all new users automatically upon their registration.

![](<../../../.gitbook/assets/5 (17).png>)

### **2.5 Access**

Special configuration option (permission) which controls user access access to specific policies.

* _**ACCESS\_POLICY\_ALL** –_ when set, the user will have access to all policies of the SR
* _**ACCESS\_POLICY\_ASSIGNED –**_ when set, the user will only have access to policies assigned to the user
* _**ACCESS\_POLICY\_PUBLISHED –**_ when set, the user will only have access to published policies of the SR
* _**ACCESS\_POLICY\_ASSIGNED\_AND\_PUBLISHED –**_ when set, the user will only have access to policies assigned to the user, which are also published.

![](<../../../.gitbook/assets/6 (16).png>)

### **2.6 Delegate**

Special permission option which enables uses to transfer their roles (i.e. to delegate, preserving their own rights as per the role as well) to other users.\
Any user with the permission _**DELEGATION\_ROLE\_MANAGE**_ can enable access to all or a subset of roles and/or policies (but only for those the user has access to), for other users.

![](<../../../.gitbook/assets/7 (16).png>)

## **2. Assigning roles and policies**

### **2.1 Roles**

_User Management_ page provides facilities to configure user roles

![](<../../../.gitbook/assets/8 (17).png>)

![](<../../../.gitbook/assets/9 (15).png>)

Administrator can see summary of the permissions from all roles enabled for the user:

![](<../../../.gitbook/assets/10 (16).png>)

### **2.2 Policies**

On the policy page administrator can assign specific policies to be accessible for the user. (If _**ACCESS\_POLICY\_ASSIGNED**_ permission is used.)

<figure><img src="../../../.gitbook/assets/11 (13).png" alt=""><figcaption></figcaption></figure>

### **2.3 Delegate**

Similarly to how SR can configure roles and policies, uses with the _**DELEGATION\_ROLE\_MANAGE**_ permission can delegate its access to policies to other users. the list of the options however is limited by the rules and policies assigned to it by SR and/or other users.

### 2.4 Logs Permissions

The Standard Registry (SR) can assign three levels of access to logs for its users:\
• Read – Allows the user to view their own logs. This permission is enabled by default.\
• System – Allows the user to view logs from their SR account as well as system logs.\
• Users – Allows the user to view logs of other users under the same SR.

<figure><img src="../../../.gitbook/assets/image (3) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

## **3. Messages**

When a role is created, edited, or deleted a corresponding message will be posted to the SR’s Hedera topic in the following format:

```
{
"id": "b5aee339-860f-4702-a916-4d4dca93a885",
"status": "ISSUE",
"type": "Guardian-Role-Document",
"action": "create-role",
"lang": "en-US",
"issuer": "did:hedera:testnet:BJDCUTd8gFSaFwW4w7Tw8dbx7DfnkfLjJ14s2dquesS9_0.0.3579393",
"encodedData": false,
"cid": "QmUCXmE3KAe16xHEc9sr8vnPaNESKpzDGH8yKCf6jaDevp",
"uri": "ipfs://QmUCXmE3KAe16xHEc9sr8vnPaNESKpzDGH8yKCf6jaDevp",
"uuid": "6c0c8a7a-afef-40e2-900b-560a60945bfe",
"name": "Role name",
"description": "Role name"
}
```

When the list of rules assigned to the user is updated, the following messages posted to the SR’s Hedera topic

```
{
"id": "88865f04-b599-4189-abb0-499de1de2c7d",
"status": "ISSUE",
"type": "User-Permissions",
"action": "set-role",
"lang": "en-US",
"issuer": "did:hedera:testnet:BJDCUTd8gFSaFwW4w7Tw8dbx7DfnkfLjJ14s2dquesS9_0.0.3579393",
"encodedData": false,
"cid": "QmfNFrWcPuoiSqMjGqogqTXRDRMEY6s68wsxU6fXTRLsAF",
"uri": "ipfs://QmfNFrWcPuoiSqMjGqogqTXRDRMEY6s68wsxU6fXTRLsAF",
"user": "did:hedera:testnet:EEGXZeZvcYmWj4e7cyPoDUi7rcRzkGbLBmziRrd7yrQm_0.0.3579393"
}
```

The messages are accompanied by assigned VC document with the list of permissions the role contains.

## 2. Demo Video

[Youtube](https://youtu.be/4bCrxd_EbTs)
