# mathBlock

The _mathBlock_ lets you to define calculations on document data in mathematical notation to be performed directly, without the need or optionally with limited use of coding.

<figure><img src="../../../../../.gitbook/assets/image.png" alt=""><figcaption></figcaption></figure>

## 1.1 Properties

|               |                                                                                             |                       |
| ------------- | ------------------------------------------------------------------------------------------- | --------------------- |
| Input Schema  | The input document schema.Required                                                          | Net\_ERR\_Calculation |
| Output Schema | The output (results) document schema. Optional. If not specified, the input schema is used. | Net\_ERR\_Calculation |
| Unsigned VC   | Allows the use of a simple JSON document as input (no VC-style proofs required)             | Checked/Unchecked     |
| Expression    | The set of formulas and commands executed at policy runtime.                                | formulas defined      |

## 1.1.1 Expression definition

Expression definition is guided by a wizard with in-place test execution, allowing policy authors to define formulas and the data they apply to at policy runtime. It includes the following sections:

#### 1. Inputs

Use this section to map fields from the input document to short variable names that you can reference in formulas.

<figure><img src="../../../../../.gitbook/assets/image (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/image (2).png" alt=""><figcaption></figcaption></figure>

### 2. Formulas

This section provides UI to defined formulas using standard mathematical notation and/or LateX or MathJSON formats.

<figure><img src="../../../../../.gitbook/assets/image (3).png" alt=""><figcaption></figcaption></figure>

**2.1 Formula defintion**

To define a formula, complete the following steps:

* Specify the formula name.
* Add () after the formula name and list any parameters inside. Separate parameters with a comma (,).

<figure><img src="../../../../../.gitbook/assets/image (4).png" alt=""><figcaption></figcaption></figure>

* Create the expression using math notation or an alternative format (LaTeX, MathJSON).

<figure><img src="../../../../../.gitbook/assets/image (5).png" alt=""><figcaption></figcaption></figure>

In some cases, switching between math notation, LaTeX, and MathJSON can help you verify or correct a formula. You can edit in any format; the system automatically synchronizes changes across formats.

<figure><img src="../../../../../.gitbook/assets/image (6).png" alt=""><figcaption></figcaption></figure>

You can reuse defined formulas in other formulas (by name) and in the code on the Advanced tab.

{% hint style="success" %}
**Note**: Not all commands supported in math notation are represented correctly in LaTeX. In LaTeX view, unsupported commands may appear as plain strings. For the complete list of commands supported by Guardian in math notation, see the MathLive Compute Engine standard library documentation: [https://mathlive.io/compute-engine/standard-library](https://mathlive.io/compute-engine/standard-library)
{% endhint %}

{% hint style="success" %}
**Note**: Avoid using i for indices, as it may be interpreted as the imaginary unit and lead to unexpected results
{% endhint %}

**2.2 Variables**

When parentheses are not included after the name (e.g., x vs. x()), it is treated as a variable definition. The variable value is calculated at initialization time.&#x20;

<figure><img src="../../../../../.gitbook/assets/image (7).png" alt=""><figcaption></figcaption></figure>

**2.3 Code (advanced)**

For complex scenarios where formulas are not sufficient for the required data transformations, use the Advanced (Optional) tab to add logic in JavaScript.

<figure><img src="../../../../../.gitbook/assets/image (8).png" alt=""><figcaption></figcaption></figure>

In code, you can reference all defined formulas and variables by name.

<figure><img src="../../../../../.gitbook/assets/image (9).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/image (10).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/image (11).png" alt=""><figcaption></figcaption></figure>

### 3. Outputs

Use this section to configure which document fields receive the results of calculations from the previous sections.

<figure><img src="../../../../../.gitbook/assets/image (12).png" alt=""><figcaption></figcaption></figure>

In this section, you can reference input/output fields and variables only. Formulas can be referenced only in the Formulas section.

<figure><img src="../../../../../.gitbook/assets/image (13).png" alt=""><figcaption></figcaption></figure>

### 4. Test

After you define formulas, you can validate them using the Test section. Complete the following steps:

#### a. Inputs

Provide input data in a document using one of the following three options:

* Use a form that matches the input schema.

<figure><img src="../../../../../.gitbook/assets/image (14).png" alt=""><figcaption></figcaption></figure>

* Provide JSON.

<figure><img src="../../../../../.gitbook/assets/image (15).png" alt=""><figcaption></figcaption></figure>

* Upload a file (the file must contain valid JSON).

<figure><img src="../../../../../.gitbook/assets/image (16).png" alt=""><figcaption></figcaption></figure>

#### b. Select Test

<figure><img src="../../../../../.gitbook/assets/image (17).png" alt=""><figcaption></figcaption></figure>

#### c. Results

Guardian displays test results for each element

<figure><img src="../../../../../.gitbook/assets/image (18).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/image (19).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/image (20).png" alt=""><figcaption></figcaption></figure>

## 1.2 Visualization at Policy runtime

Once a policy is published, Guardian generates Formula-Linked Definitions (FLDs) for all mathBlock elements in the policy. You can explore these the same way as standard FLDs.

<figure><img src="../../../../../.gitbook/assets/image (21).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/image (22).png" alt=""><figcaption></figcaption></figure>

{% hint style="warning" %}
**Note:** The _mathBlock_ code section is not used when automatically generating FLDs and is not represented in any way in the resulting visuals.
{% endhint %}
