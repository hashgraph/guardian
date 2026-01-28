# Creating Contract using UI

1. Guardian instance out of the box contains implementations for ‘Wiping’ and ‘Retirement’ contracts which can be deployed/enabled from the UI.

<figure><img src="../../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

2. Each SR has its own contract permissions. Since contracts are deployed on Hedera and their methods can be called independently via 3rd party systems but the status of these contracts can change without Guardian’s knowledge. SRs can action a ‘refresh’ of their permissions by clicking on the refresh sign (chargeable Hedera operation, costs < 1 hbar)

<figure><img src="../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### **Contract Roles:**

#### 1. Wiping Contract Roles:

| Role    | Permissions                                                                  |
| ------- | ---------------------------------------------------------------------------- |
| OWNER   | <ol><li>Add/Remove ADMIN</li><li>Clear Requests</li></ol>                    |
| ADMIN   | <ol><li>Enable/Disable Wiper Requests</li><li>Add/Remove MANAGER</li></ol>   |
| MANAGER | <ol><li>Add/Remove WIPER</li><li>Approve/Reject/Ban WIPER requests</li></ol> |
| WIPER   | <ol><li>Wipe Tokens</li></ol>                                                |

#### 2. Retirement Contract Roles:

| Role  | Permissions                                                             |
| ----- | ----------------------------------------------------------------------- |
| OWNER | <ol><li>Add/Remove ADMIN</li><li>Clear Retire Requests/Pools</li></ol>  |
| ADMIN | <ol><li>Set/Unset Pools</li><li>Approve/Unset Retire Requests</li></ol> |

4\) At the token creation the system can be configured to delegate all permissions for wiping tokens to a specific wiping contract

<figure><img src="../../../.gitbook/assets/image (10) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

5\) _SRs_ can add pools with tokens which have a wipe contract (Set pool operation in retire contract).

Also you can check “without approval” to set retirement tokens as immediate operation (without approval).\\

<figure><img src="../../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

6\) _SRs_ can check/delete/refresh pools (Pools operation in retirement contract). Not enabled means that the retirement contract has no wiper permissions in the appropriate wipe contract. It will be changed to enabled automatically when _the SR_ approves a request for a wiper role from this retirement contract. If the wipe contract is not in Guardian a manual refresh is required to update the instance permissions status.

<figure><img src="../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

7\) _SRs_ can check/approve/reject/ban requests for the wiper role in the wipe contract (Requests operation in wipe contract).

<figure><img src="../../../.gitbook/assets/image (20) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

Now, we should be able to configure Hedera and Token Identifier during creation oof Wipe requests.

<figure><img src="../../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

8\) To execute the retirement Guardian users which hold USER role navigate to the ‘Retire’ tab and click on ‘Retire’ button, choose appropriate pool and set token count/serials

<figure><img src="../../../.gitbook/assets/image (4) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (5) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

9\) If a token retirement requires approval, _users_ which hold USER role can see their requests by clicking on the ‘Requests’ button.

<figure><img src="../../../.gitbook/assets/image (6) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

10\) Contract owners can also see these requests and approve or reject (Requests operation on retirement contract).

<figure><img src="../../../.gitbook/assets/image (7) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

11\) After approval or rejection of the requests _users_ which hold USER role can see retire VCs on ‘Retire’ tab

<figure><img src="../../../.gitbook/assets/image (8) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (9) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

## Backward Compatibility

1. Old Wipe Contract and New Retire Contract are compatible
2. Old Retire Contract and New Wipe Contract are incompatible
