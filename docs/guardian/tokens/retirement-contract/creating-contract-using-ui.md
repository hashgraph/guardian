# 💻 Creating Contract using UI

1. Guardian instance out of the box contains implementations for ‘Wiping’ and ‘Retirement’ contracts which can be deployed/enabled from the UI.

<figure><img src="../../../.gitbook/assets/image (1) (1).png" alt=""><figcaption></figcaption></figure>

2. Each SR has its own contract permissions. Since contracts are deployed on Hedera and their methods can be called independently via 3rd party systems but the status of these contracts can change without Guardian’s knowledge. SRs can action a ‘refresh’ of their permissions by clicking on the refresh sign (chargeable Hedera operation, costs < 1 hbar)

<figure><img src="../../../.gitbook/assets/image (2) (1).png" alt=""><figcaption></figcaption></figure>

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

