# Remote Policy UI

### **1. Creation**

To create a policy suitable for operating by users via multiple (different) instances of Guardian, at the publishing stage ‘Public’ availability type must be selected.

![](<../../../.gitbook/assets/0 (25).png>)

Once such policy is published it can be imported into other Guardian instances via its publishing Message ID.

![](<../../../.gitbook/assets/1 (26).png>)

Next to the Message ID of a public policy, the Policies grid has two more buttons:

* **Copy invite link** copies an invite link of the form `guardian://remote-policy/<Message ID>`. The link does not name any Guardian instance, so it can be sent to users of any instance.
* **Show invite QR code** shows the same link as a QR code.

### **2. Import**

The import of ‘external’ policies is initiated from the **Remote Policies** tab in the Policies grid

![](<../../../.gitbook/assets/2 (28).png>)

\
The original policy Message ID or the invite link must be specified in the Search dialogue box. Opening the Policies page or the Remote Policy Requests page with the `invite` query parameter (for example `/policy-viewer?invite=guardian://remote-policy/<Message ID>`) opens the dialogue with the policy already filled in.

<figure><img src="../../../.gitbook/assets/3 (24).png" alt=""><figcaption></figcaption></figure>

The operation must be approved by the Standard Registry

![](<../../../.gitbook/assets/4 (22).png>)

Imported policy will become accessible from the Remote Policies tab alongside the ordinary policies

![](<../../../.gitbook/assets/5 (25).png>)

### **3. Joining the policy**

Once the import is approved and the policy is assigned to the user, the user's Guardian instance (the ‘home’ instance) asks the Guardian instance that published the policy (the ‘Main’ instance) to let the user take part in it. It does this by publishing a join request on the actions topic of the policy. The request is paid by the user's own Hedera account and carries:

* the user's DID;
* a signature made with the Ed25519 key of the user's DID over the DID, the Hedera account, the policy Message ID and the issue time. The signature is bound to the policy and can't be reused as a registration proof, or the other way round;
* a new message key for the policy (see Section 5), sealed to the Ed25519 key of the policy owner's DID: only the Standard Registry that owns the policy can open it.

The home instance stores the same message key for the user, so the user doesn't have to generate or copy any key.

The join request is sent when the import is approved, or straight away when a user imports a policy that is already approved on the home instance. It is sent once per user and policy: if it could not be sent, or the Main instance rejected it, importing the policy again sends it again. Standard Registry accounts only view remote policies and don't send join requests.

The Main instance checks that the request was paid by the account it names, loads the user's DID document from Hedera, verifies the signature and opens the message key. A request issued more than 24 hours before it reached Hedera, a request for another policy and a copy of an earlier request are ignored. For a valid request the Main instance creates a remote user with the user's DID and Hedera account. This user has no username or password and can never sign in to the Main instance. If the DID is already a remote user of the same Standard Registry, that user is reused.

The request then waits for the policy owner. On the Main instance, open the policy menu in the Policies grid and select **Remote participants** (available to users with the permission to manage user roles). Every request must be approved or rejected by hand:

* **Approve** assigns the policy to the remote user, the same as assigning it in the user permissions.
* **Reject** leaves the policy unassigned. A rejected user can send a new request by importing the policy again.

The Main instance publishes the answer on the actions topic, encrypted with the user's message key. On the home instance, the **Participation** column of the Remote Policy Requests page shows where the request is:

| Status | Meaning |
| --- | --- |
| Awaiting home approval | The import waits for the Standard Registry of the home instance. |
| Awaiting Main approval | The join request was sent and waits for the policy owner on the Main instance. |
| Ready | The policy owner approved the request; the user can work with the policy. |
| Rejected by the home instance / Rejected by the Main instance | The import or the join request was rejected. |
| Join request failed | The join request could not be sent, for example because the user's account has no funds. Import the policy again to retry. |

The Standard Registry of the home instance sees the same status per user in the **Users** dialogue of each request.

### **4. Users registered by profile file**

Guardian instances that don't support join requests yet register remote users with a profile file instead. To enable users to participate in the remote policy workflow they must be registered on the ‘home’ Guardian of the policy (from which it has been published). Such registration involves importing user profile. Please note that private information, such as private keys, are not exported, imported or accessed in any way.

<figure><img src="../../../.gitbook/assets/6 (24).png" alt=""><figcaption></figcaption></figure>

Profile files can be used to create corresponding Remote Users, which can participate in the policy execution workflow using external (other) Guardian instance as a ‘console’ without exposing users private keys to any Guardian other than user’s home instance.

The profile file includes a registration proof signed with the user's DID key on the home instance. When the file is imported, the other Guardian loads the user's DID document from Hedera, checks that it was published by the user's Hedera account, and verifies the proof against it. The proof is accepted for 24 hours after the profile is downloaded; after that, download the profile again. Profile files downloaded before this check was introduced have no proof and can't be imported.

![](<../../../.gitbook/assets/7 (24).png>)

After the import, the Standard Registry assigns the policy to the user, and the user imports the message key for the policy (see Section 5).

### **5. Encryption**

The documents of the action requests and answers exchanged between Guardian instances are encrypted with AES-GCM, using a message key that is unique for each user and policy. Only the user's home instance and the Main instance of the policy hold this key. The key is not a public key: both instances use the same key to encrypt and decrypt.

When the user joins the policy with a join request (see Section 3), the key is created and delivered automatically. For Guardian instances that don't support join requests, the key is created and copied by hand:

1\. Generate the key on the ‘home’ Guardian user account\\

<figure><img src="../../../.gitbook/assets/image (835).png" alt=""><figcaption></figcaption></figure>

2\. Input the message ID of the Policy for which the key is being prepared

<figure><img src="https://docs.guardianservice.io/~gitbook/image?url=https%3A%2F%2F3006114282-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FXVOaWpJKxLZf1Tee9eCO%252Fuploads%252F6wZWB9tV3G5WRjwRP7K7%252Fimage.png%3Falt%3Dmedia%26token%3Df57c6465-588b-4075-934b-60102a0b0458&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=1ba6e22a&#x26;sv=2" alt=""><figcaption></figcaption></figure>

3\. Copy the generated key

Note: The key is not retrievable after the initial creation. If lost a new one would need to be generated.

<figure><img src="https://docs.guardianservice.io/~gitbook/image?url=https%3A%2F%2F3006114282-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FXVOaWpJKxLZf1Tee9eCO%252Fuploads%252FOY5Nf15OrGzaF3ByL71c%252Fimage.png%3Falt%3Dmedia%26token%3D063f4f63-f439-453b-b7e4-a41ba45bf1b8&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=6f02d011&#x26;sv=2" alt=""><figcaption></figcaption></figure>

4\. Import the key into the ‘remote’ Guardian via the user account page

<figure><img src="https://docs.guardianservice.io/~gitbook/image?url=https%3A%2F%2F3006114282-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FXVOaWpJKxLZf1Tee9eCO%252Fuploads%252FsPAnJNzNAYKNkuMg7Y9m%252Fimage.png%3Falt%3Dmedia%26token%3Dbdef75b0-c3e9-4924-91bc-3286d024c551&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=e3fece38&#x26;sv=2" alt=""><figcaption></figcaption></figure>

### **6. Policy execution**

Remote policies are used in the same way as those running locally with few differences:\\

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

#### 7. Disconnecting from a Remote Policy

When disconnecting from a remote (external) policy, there are two available options.

<figure><img src="../../../.gitbook/assets/image (5) (1).png" alt=""><figcaption></figcaption></figure>

**2.1. Disconnect from the Remote Policy Only**

This option disconnects your user from the remote policy on the current Guardian instance. Your account on the Main Guardian instance (where the policy is originally deployed) remains connected and unaffected.

**2.2. Full Disconnection from the Policy**

Full disconnection removes your user from:

* The remote policy on the current Guardian instance, and
* The same policy on the Main Guardian instance where it is deployed.

In this case, if you need to resume working with the policy, you will have to:

1. Reconnect (import/connect) the policy again on the remote Guardian instance.
2. Log in to the Main Guardian instance where the policy is deployed and reconnect there as well (see Section 1).

**2.3. Removing a Remote Policy from Guardian**

A System Administrator (SR) can disconnect a remote policy and completely remove it from the Guardian instance, thereby freeing server resources.

<figure><img src="../../../.gitbook/assets/image (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
Note:

This removal:

* Does not affect the Main Guardian instance where the policy is deployed.
* Does not affect any data stored within the policy.

After removal, the policy can be restored by importing it again. All data will be restored except for local cache-related data (for example, grid sorting preferences).
{% endhint %}
