---
icon: square-check
---

# Testing/Debugging code for Calculate and Custom Logic Block using UI

### **1. Overview**

The **customLogicBlock** and **calculateContainerBlock** can be executed in a “dry-run” mode. This feature provides a sandboxed environment for testing the logic of a block independently, helping policy developers validate their implementation with different input scenarios without affecting the main policy.

### **2. Custom Logic Block**

#### **Dry-Run Execution**

The `customLogicBlock` supports isolated dry-run execution. This means it can be tested independently of other blocks in a policy, allowing for detailed debugging and rapid prototyping.

Execution is controlled through a step-by-step interface in the UI, enabling users to define parameters, input data, and immediately inspect the results.

<figure><img src="../../../../.gitbook/assets/image (1) (1) (2) (3).png" alt=""><figcaption></figcaption></figure>

***

### **3. Dry-Run Execution Steps**

#### **Step 1: Configure Block Properties**

Users can adjust various configuration options related to the block directly within the dry-run interface. This avoids the need to navigate back to the main policy editor and streamlines the testing workflow.

<figure><img src="../../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

***

#### **Step 2: Provide Input Data**

The block can be tested using mock input data. Three primary input methods are supported:

**a. Schema-Based Input**

* Select a data schema from a dropdown list.
* A dynamic form is generated based on the schema, allowing users to fill in relevant fields.
* Ideal for users who prefer a structured and guided input interface.

<figure><img src="../../../../.gitbook/assets/image (3) (1) (2) (1).png" alt=""><figcaption></figcaption></figure>

**b. JSON Editor**

* Directly input JSON-formatted data using the built-in editor.
* Best suited for advanced users or when precise control over the input format is needed.

<figure><img src="../../../../.gitbook/assets/image (4) (1) (4) (1).png" alt=""><figcaption></figcaption></figure>

**c. File Upload**

* Upload a JSON file containing the test data.
* The file must be well-formed JSON.

<figure><img src="../../../../.gitbook/assets/image (5) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

> **Note**: Only valid JSON inputs are accepted. Malformed files will cause parsing errors.

***

#### **Step 3: Use Historical Data**

The **History** tab displays saved input/output pairs from previous executions during dry-run mode. This is helpful when working with complex workflows that generate intermediate data.

To utilize this:

1. Enable **Policy Dry-Run Mode**.
2. Execute the policy workflow normally.
3. Once execution reaches the target block, its context (input/output) will be saved and visible in the history tab.

> **Important Notes:**

* Historical data is only available in dry-run mode and is cleared upon exit.
* Code changes made in dry-run are not persisted. To retain them, re-enter the changes in **Draft Mode** of the policy.

<figure><img src="../../../../.gitbook/assets/image (6) (2) (2).png" alt=""><figcaption></figcaption></figure>

***

#### **Step 4: Write and Test Code (customLogicBlock only)**

In the final step:

* Modify the code as needed.
* Press the **Test** button to execute.

<figure><img src="../../../../.gitbook/assets/image (9) (4).png" alt=""><figcaption></figcaption></figure>

**Debugging Tips**

Use the `debug` function to output logs:

```javascript
javascriptCopyEditdebug("Variable Value", variable);
```

* Outputs appear in the **Logs** tab.
* Has no effect (noop) when the policy is in **Published Mode**.

<figure><img src="../../../../.gitbook/assets/image (8) (2).png" alt=""><figcaption></figcaption></figure>

***

### **4. Viewing Test Results**

Upon completion of the dry-run, the results are split into several tabs:

| Tab        | Description                                                     |
| ---------- | --------------------------------------------------------------- |
| **Input**  | Displays the ingress VC (Verifiable Credential) documents used. |
| **Logs**   | Shows output from `debug()` and system logs.                    |
| **Output** | Final result VC document (if execution succeeds).               |
| **Errors** | Any errors encountered during test-run.                         |

<figure><img src="../../../../.gitbook/assets/image (10) (5).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (11) (1) (2).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (12) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (13) (1) (1) (3).png" alt=""><figcaption></figcaption></figure>

***

### **5. calculateContainerBlock**

All features described for `customLogicBlock` apply to `calculateContainerBlock`, **except** it does not include a code editor tab. This block is evaluated based on its configured calculation logic rather than custom scripting.

***

### **6. API Support for Dry-Run**

The following API endpoints are available to programmatically interact with the dry-run feature:

#### **Get Block History**

```http
httpCopyEditGET /api/v1/policies/:policyId/dry-run/block/:tagName/history
Permissions: POLICIES_POLICY_UPDATE
```

* Retrieves the list of historical test data for the specified block.

#### **Execute Block Dry-Run**

```http
httpCopyEditPOST /api/v1/policies/:policyId/dry-run/block
Permissions: POLICIES_POLICY_UPDATE
```

* Submits the block for dry-run execution with the specified input.
