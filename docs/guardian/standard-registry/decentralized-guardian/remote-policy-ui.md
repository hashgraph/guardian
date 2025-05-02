---
icon: computer
---

# Remote Policy UI

## **Remote Policy**

### **1. Creation**

To create a policy suitable for operating by users via multiple (different) instances of Guardian, at the publishing stage ‘Public’ availability type must be selected.

![](<../../../.gitbook/assets/0 (25).png>)

Once such policy is published it can be imported into other Guardian instances via its publishing Message ID.

![](<../../../.gitbook/assets/1 (26).png>)

### **2. Import**

The import of ‘external’ policies is initiated from the **Remote Policies** tab in the Policies grid

![](<../../../.gitbook/assets/2 (28).png>)

\
The original policy Message ID must be specified in the Search dialogue box.

<figure><img src="../../../.gitbook/assets/3 (24).png" alt=""><figcaption></figcaption></figure>

The operation must be approved by the Standard Registry

![](<../../../.gitbook/assets/4 (22).png>)

Imported policy will become accessible from the Remote Policies tab alongside the ordinary policies

![](<../../../.gitbook/assets/5 (25).png>)

### **3. Users**

To enable users to participate in the remote policy workflow they must be registered on the ‘home’ Guardian of the policy (from which it has been published). Such registration involves importing user profile. Please note that private information, such as private keys, are not exported, imported or accessed in any way.

<figure><img src="../../../.gitbook/assets/6 (24).png" alt=""><figcaption></figcaption></figure>

Profile files can be used to create corresponding Remote Users, which can participate in the policy execution workflow using external (other) Guardian instance as a ‘console’ without exposing users private keys to any Guardian other than user’s home instance.

![](<../../../.gitbook/assets/7 (24).png>)

### **4. Policy execution**

Remote policies are used in the same way as those running locally with few differences:\


* **Speed and waiting time**

Synchronization of policy execution state between different Guardian instances is performed via Hedera, an update of the policy state on other Guardians can take several minutes.

* **Publishing actions**

When user take actions in their home Guardians there is a time delay associated with the remote Guardian instance processing the action request.

![](<../../../.gitbook/assets/8 (24).png>)

* **Action request**

Processing remote user actions may require user private keys for signatures. These keys never leave users’ home Guardians, instead the remote Guardian formulates corresponding requests which require user action confirmations in their ‘home’ Guardians.

For the avoidance of doubt, such confirmations to do not pass private keys to the remote Guardian instance. The confirmation is performed locally, remote Guardians receive only the result of the actions (e.g. signed documents etc).

![](<../../../.gitbook/assets/9 (21).png>)

![](<../../../.gitbook/assets/10 (22).png>)
