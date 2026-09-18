# Before You Begin

To run a policy across two instances you need at least four users, as described below. Verra operates in this case as the main instance, while other instances operate as the dependent instances.

| **User**                    | **Where**          | **Purpose**                                                                                                              |
| --------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Main standard registry      | Main instance      | Owns and publishes the policy.                                                                                           |
| Remote user                 | Main instance      | A local copy of the user created in a dependent instance. Holds the imported decentralized access key.                   |
| Dependent standard registry | Dependent instance | Approves the imported remote policy so local users can run it.                                                           |
| Dependent user              | Dependent instance | The project developer or VVB who requests access, registers for the policy, submits projects, etc. to the remote policy. |

You also need a policy that is ready to publish, or already published. This guide uses the VM0047 methodology published on the Verra’s UAT environment using the Hedera testnet (public link: 1785511586.942929104).

<img src="../../../../.gitbook/assets/unknown (26).png" alt="" height="363" width="624">

_Figure 1. The Verra Portal. VM0047 in the first row is installed but not published yet._

{% hint style="info" %}
Tip: Take note of the public link and, later, of the decentralized access key as you work through the setup. Both values are needed again at later steps.
{% endhint %}
