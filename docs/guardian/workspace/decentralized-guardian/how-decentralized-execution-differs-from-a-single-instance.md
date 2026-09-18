# How Decentralized Execution Differs from a Single Instance

* **Processing time**. Because the main policy lives in another instance, each action in the remote policy (choosing a role, submitting a form, approving a step) must be synchronized through Hedera. The UI shows "You have new remote policy actions. Wait for the event to be processed." Expect to wait briefly after each action.
* **Incoming Requests**. Actions arrive as requests that need approval. Role selections, document signing, and outgoing messages appear in the Incoming Requests queue and must be approved before the workflow moves on. This queue only exists for decentralized execution.
* **Main instance execution**. Operations for the policy inside the main instance are unchanged: policy execution in the main instance works exactly as a private policy, with no extra request approvals required or waiting times.
* **Ownership**. The instance that published the policy remains the main instance and continues to own the policy, regardless of how many external instances import and execute it.
