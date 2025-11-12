---
icon: computer
---

# Remote Policy UI

### **1. Creation**

To create a policy suitable for operating by users via multiple (different) instances of Guardian, at the publishing stage ‘Public’ availability type must be selected.

![](<../../.gitbook/assets/0 (25).png>)

Once such policy is published it can be imported into other Guardian instances via its publishing Message ID.

![](<../../.gitbook/assets/1 (26).png>)

### **2. Import**

The import of ‘external’ policies is initiated from the **Remote Policies** tab in the Policies grid

![](<../../.gitbook/assets/2 (28).png>)

\
The original policy Message ID must be specified in the Search dialogue box.

<figure><img src="../../.gitbook/assets/3 (24).png" alt=""><figcaption></figcaption></figure>

The operation must be approved by the Standard Registry

![](<../../.gitbook/assets/4 (22).png>)

Imported policy will become accessible from the Remote Policies tab alongside the ordinary policies

![](<../../.gitbook/assets/5 (25).png>)

### **3. Users**

To enable users to participate in the remote policy workflow they must be registered on the ‘home’ Guardian of the policy (from which it has been published). Such registration involves importing user profile. Please note that private information, such as private keys, are not exported, imported or accessed in any way.

<figure><img src="../../.gitbook/assets/6 (24).png" alt=""><figcaption></figcaption></figure>

Profile files can be used to create corresponding Remote Users, which can participate in the policy execution workflow using external (other) Guardian instance as a ‘console’ without exposing users private keys to any Guardian other than user’s home instance.

![](<../../.gitbook/assets/7 (24).png>)

### **4. Encryption**

To protect private information all data exchanges between Guardians are encrypted with the addressee public key. Each policy can be configured with a unique key:

1\. Generate the key on the ‘home’ Guardian user account\\

<figure><img src="../../.gitbook/assets/image (835).png" alt=""><figcaption></figcaption></figure>

2\. Input the message ID of the Policy for which the key is being prepared

<figure><img src="https://docs.guardianservice.io/~gitbook/image?url=https%3A%2F%2F3006114282-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FXVOaWpJKxLZf1Tee9eCO%252Fuploads%252F6wZWB9tV3G5WRjwRP7K7%252Fimage.png%3Falt%3Dmedia%26token%3Df57c6465-588b-4075-934b-60102a0b0458&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=1ba6e22a&#x26;sv=2" alt=""><figcaption></figcaption></figure>

3\. Copy the generated key

Note: The key is not retrievable after the initial creation. If lost a new one would need to be generated.

<figure><img src="https://docs.guardianservice.io/~gitbook/image?url=https%3A%2F%2F3006114282-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FXVOaWpJKxLZf1Tee9eCO%252Fuploads%252FOY5Nf15OrGzaF3ByL71c%252Fimage.png%3Falt%3Dmedia%26token%3D063f4f63-f439-453b-b7e4-a41ba45bf1b8&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=6f02d011&#x26;sv=2" alt=""><figcaption></figcaption></figure>

1. Import the key into the ‘remote’ Guardian via the user account page

<figure><img src="https://docs.guardianservice.io/~gitbook/image?url=https%3A%2F%2F3006114282-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FXVOaWpJKxLZf1Tee9eCO%252Fuploads%252FsPAnJNzNAYKNkuMg7Y9m%252Fimage.png%3Falt%3Dmedia%26token%3Dbdef75b0-c3e9-4924-91bc-3286d024c551&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=e3fece38&#x26;sv=2" alt=""><figcaption></figcaption></figure>

### **5. Policy execution**

Remote policies are used in the same way as those running locally with few differences:\\

* **Speed and waiting time**

Synchronization of policy execution state between different Guardian instances is performed via Hedera, an update of the policy state on other Guardians can take several minutes.

* **Publishing actions**

When user take actions in their home Guardians there is a time delay associated with the remote Guardian instance processing the action request.

![](<../../.gitbook/assets/8 (24).png>)

* **Action request**

Processing remote user actions may require user private keys for signatures. These keys never leave users’ home Guardians, instead the remote Guardian formulates corresponding requests which require user action confirmations in their ‘home’ Guardians.

For the avoidance of doubt, such confirmations to do not pass private keys to the remote Guardian instance. The confirmation is performed locally, remote Guardians receive only the result of the actions (e.g. signed documents etc).

![](<../../.gitbook/assets/9 (21).png>)

![](<../../.gitbook/assets/10 (22).png>)
