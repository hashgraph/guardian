# Capture, Replay, and Compare Data for Published Policies

Guardian provides a **Capture and Replay** mechanism that allows you to:

* Automatically **record all actions** performed by a policy after it is published
* Store immutable execution records on **Hedera** with payloads persisted in **IPFS**
* **Import recorded executions** when re-importing a policy
* **Replay those executions** in Dry Run mode
* **Compare results** between the originally published run and the Dry Run execution

This capability is especially useful for:

* Regression testing
* Validating policy changes
* Auditing and traceability
* Debugging behavior differences between versions
