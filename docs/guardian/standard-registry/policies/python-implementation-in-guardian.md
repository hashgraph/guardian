---
icon: python
---

# Python Implementation in Guardian

### Overview

The Guardian platform now supports Python scripting within its Custom Logic blocks, expanding its flexibility and enabling developers to perform complex computations and logic more easily. This feature introduces a new Script Language selection option and includes enhancements to VC (Verifiable Credential) document schemas for better version tracking.

### 1. Custom Logic Block: Script Language Selection

A new dropdown setting has been added to the Custom Logic block in the Policy Editor, allowing users to select the desired scripting language.

#### 🔧 Configuration

* **Field:** `Script Language`
* **Options:**
  * `JavaScript` _(default for backward compatibility)_
  * `Python` _(newly introduced)_

<figure><img src="../../../.gitbook/assets/image (3) (1) (2).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (2) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

#### 💡 Use Case

Choose "Python" when you want to leverage Python’s expressive syntax and advanced computation libraries for policy logic.

### 2. Python Scripting Support

Guardian now supports Python as a language for defining business logic in Custom Logic blocks.

#### ✅ Capabilities

* Execute Python scripts directly as part of policy execution.
* Access context variables and input data in Python syntax.
* Perform conditional logic, calculations, or transformations using Python.

#### 📂 Example

```python
pythonCopyEdit# Sample Python logic inside Custom Logic block
if document['type'] == 'Certificate':
    document['status'] = 'Verified'
```

> Python code is sandboxed and only has access to allowed libraries/packages pre-installed in the Guardian environment.

### 3. VC Document Schema Enhancement: `guardianVersion`

A new default field has been introduced in all Verifiable Credential document schemas: `guardianVersion`.

#### 📝 Purpose

This field helps track the Guardian system version that was used to generate or interact with the VC. It is especially useful when managing backward compatibility and knowing which Python packages and versions were available during execution.

#### 🔍 Field Details

* **Field Name:** `guardianVersion`
* **Type:** `string`
* **Format:** Semantic versioning (e.g., `"3.4.1"`)
* **Automatically populated?** ✅ Yes

<figure><img src="../../../.gitbook/assets/image (4) (1) (4).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
* Ensure your logic is compatible with the version of Guardian being used, especially when importing Python packages.
* Python execution is subject to the limitations and security constraints defined in Guardian's runtime.
{% endhint %}
