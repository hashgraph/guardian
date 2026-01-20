# UI Demo using VM0042 Policy

1. Step By Step
2. Demo

## 1. Step by Step

1. Import the VM0042 and publish the policy.&#x20;

In the **Publish Policy modal**, highlight **☑ Record policy actions** (enabled by default)

<figure><img src="../../../../.gitbook/assets/image (3) (1) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
Note: By default, Guardian records every action executed by the policy once it’s published.\
These actions are written to Hedera and stored immutably, with payloads in IPFS.”
{% endhint %}

2. Once the policy is published, submit the Project Registration by logging in as Project Proponent:

<figure><img src="../../../../.gitbook/assets/image (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
Note: “Each step you see here—data submission, validation, calculations—is recorded as a discrete step.\
These steps are timestamped, ordered, and linked to IPFS payloads.”
{% endhint %}

3. Login as Standard Registry and approve the Project Proponent:

<figure><img src="../../../../.gitbook/assets/image (4) (1) (1).png" alt=""><figcaption></figcaption></figure>

4. Login as VVB and submit VVB Registration:

<figure><img src="../../../../.gitbook/assets/image (2) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

5. Login as Standard Registry and approve the VVB:

<figure><img src="../../../../.gitbook/assets/image (3) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

6. Submit the Project Data as Project Proponent:

<figure><img src="../../../../.gitbook/assets/image (5) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (6) (1) (1).png" alt=""><figcaption></figcaption></figure>

7. Assign the VVB to the submitted Project for review:

<figure><img src="../../../../.gitbook/assets/image (7) (1) (1).png" alt=""><figcaption></figcaption></figure>

8. Login as VVB and approve it:

<figure><img src="../../../../.gitbook/assets/image (8) (1) (1).png" alt=""><figcaption></figcaption></figure>

9. Now, I login as Project Proponent and submit the Emission Reduction data where the Emission factor of Calcimite is taken as a default value as 0.12:

<figure><img src="../../../../.gitbook/assets/image (9) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (10) (1) (1).png" alt=""><figcaption></figcaption></figure>

10. Now, I copy the message identifier of this policy in order to import it.

<figure><img src="../../../../.gitbook/assets/image (11) (1) (1).png" alt=""><figcaption></figcaption></figure>

Also, check: **☑ Import existing record for this policy** during the import

<figure><img src="../../../../.gitbook/assets/image (12) (1) (1).png" alt=""><figcaption></figcaption></figure>

11. Now, I would change the Emission Factor of Calcimite from 0.12 to 0.026 in the policy configurator in draft status and then save it.

<figure><img src="../../../../.gitbook/assets/image (13) (1).png" alt=""><figcaption></figcaption></figure>

12. Now, we run the policy in the dry run mode:

<figure><img src="../../../../.gitbook/assets/image (14) (1).png" alt=""><figcaption></figcaption></figure>

13. We now click on "Run" by enabling: **☑ Use records imported with this policy**

<figure><img src="../../../../.gitbook/assets/image (15) (1).png" alt=""><figcaption></figcaption></figure>

Optional: Also, include newly recorded steps (steps that were recorded after policy with the steps was imported)

<figure><img src="../../../../.gitbook/assets/image (16) (1).png" alt=""><figcaption></figcaption></figure>

14. We should be able to see all the recorded steps when clicked on "Run"

<figure><img src="../../../../.gitbook/assets/image (17) (1).png" alt=""><figcaption></figcaption></figure>

15. We can also view the Playback information:

<figure><img src="../../../../.gitbook/assets/image (18) (1).png" alt=""><figcaption></figcaption></figure>

16. Documents can be compared by clicking on "Details" button:

<figure><img src="../../../../.gitbook/assets/image (19) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (20) (1).png" alt=""><figcaption></figcaption></figure>
