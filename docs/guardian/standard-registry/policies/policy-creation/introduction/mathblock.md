# mathBlock

The _mathBlock_ (also known as _formula calculation block or FCB_) lets you to define calculations on document data in mathematical notation to be performed directly, without the need or optionally with limited use of coding.

<figure><img src="../../../../../.gitbook/assets/image (4) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

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

<figure><img src="../../../../../.gitbook/assets/image (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/image (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Note 1**: A variable in a formula may reference data from any field in any document, not just the input document itself. However, the referenced document must be associated with the input document (i.e. be part of its 'relationships' chain). If no such relationship exists, the value cannot be resolved at runtime, which may lead to unpredictable or undefined behavior.
{% endhint %}

{% hint style="info" %}
**Note 2**: Source documents are located based on schema matching. If multiple related documents match the required schema, the system selects the nearest (most recent) document in the relationships chain as the data source.
{% endhint %}

### 2. Formulas

This section provides UI to defined formulas using standard mathematical notation and/or LateX or MathJSON formats.

<figure><img src="../../../../../.gitbook/assets/image (2) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

**2.1 Formula definition**

To define a formula, complete the following steps:

* Specify the formula name.
* Add () after the formula name and list any parameters inside. Separate parameters with a comma (,).

<figure><img src="../../../../../.gitbook/assets/image (3) (1) (5) (2).png" alt=""><figcaption></figcaption></figure>

* Create the expression using math notation or an alternative format (LaTeX, MathJSON).

<figure><img src="../../../../../.gitbook/assets/image (4) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

In some cases, switching between math notation, LaTeX and MathJSON can help you verify or correct a formula. You can edit in any format; the system automatically synchronizes changes across formats.

<figure><img src="../../../../../.gitbook/assets/image (5) (1) (3) (1).png" alt=""><figcaption></figcaption></figure>

You can reuse defined formulas in other formulas (by name) and in the code on the Advanced tab.

{% hint style="success" %}
**Note**: Not all commands supported in math notation are represented correctly in LaTeX. In LaTeX view, unsupported commands may appear as plain strings. For the complete list of commands supported by Guardian in math notation, see the MathLive Compute Engine standard library documentation: [https://mathlive.io/compute-engine/standard-library](https://mathlive.io/compute-engine/standard-library)
{% endhint %}

{% hint style="success" %}
**Note**: The single-letter names `i` and `e` are reserved by the Compute Engine. Single-letter names used as variable inputs (e.g. `A`, `R`) must appear **without** `\mathrm{}` wrapping in formulas — use bare `A`, `R` rather than `\mathrm{A}`, `\mathrm{R}`.
{% endhint %}

**2.2 Variables**

When parentheses are not included after the name (e.g., x vs. x()), it is treated as a variable definition. The variable value is calculated at initialization time.

<figure><img src="../../../../../.gitbook/assets/image (6) (1) (1).png" alt=""><figcaption></figcaption></figure>

**2.3 Supported Compute Engine Functions**

Guardian formulas run on the MathLive Compute Engine. The following standard CE functions have been verified to work correctly in Guardian formulas.

**Array functions**

| Function | LaTeX                                                                | Description                                                                                                       |
| -------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Map`    | `\mathrm{Map}\left(1..N,\ \mathrm{index} \mapsto \text{expr}\right)` | Applies an expression to each index from `1` to `N` and returns the resulting array.                              |
| `At`     | `\mathrm{At}\left(\mathrm{arr},\ \mathrm{index}\right)`              | Returns the element at 1-based position `index` from array `arr`. Used inside `Map` to access per-element values. |
| `Length` | `\mathrm{Length}\left(\mathrm{arr}\right)`                           | Returns the number of elements in array `arr`. Typically used as the upper bound in `Map` or `Sum`.               |
| `Sum`    | `\sum_{n=1}^{N} \text{expr}`                                         | Sums an expression over an index range.                                                                           |

**Math functions**

| Function | LaTeX                            | Description                        |
| -------- | -------------------------------- | ---------------------------------- |
| `Max`    | `\mathrm{Max}\left(a,\ b\right)` | Returns the larger of two values.  |
| `Min`    | `\mathrm{Min}\left(a,\ b\right)` | Returns the smaller of two values. |
| `Power`  | `base^{exp}`                     | Raises `base` to the power `exp`.  |

**Logic functions**

| Function | LaTeX                                         | Description                                                                                                                                                                                                                                          |
| -------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Boole`  | `\mathrm{Boole}\left(\text{condition}\right)` | Returns 1 if the condition is true, 0 otherwise. Use as a numeric multiplier to conditionally include a term. The condition can be written as an operator (At(qaVal, index) = 1) or as an explicit Equal call (Equal(At(arr1, n), At(arr2, index))). |
| `Equal`  | `a = b`                                       | Returns true if `a` equals `b`. Works correctly for numbers and for string elements retrieved from arrays via `At()`. For scalar string input fields use `EqualString` instead (see section 2.4).                                                    |
| `Not`    | `\mathrm{Not}\left(\text{condition}\right)`   | Negates a boolean condition.                                                                                                                                                                                                                         |

**Example — computing a value per instance:**

```latex
\mathrm{Map}\left(1..\mathrm{Length}\left(\mathrm{plantingCohort}\right),\ \mathrm{index} \mapsto
  \mathrm{At}\left(\mathrm{CWPwoodyABt},\ \mathrm{index}\right) \times \left(1 + \mathrm{At}\left(R,\ \mathrm{index}\right)\right)
\right)
```

**Example — summing array elements that match a condition:**

```latex
\sum_{n=1}^{\mathrm{Length}\left(\mathrm{qaVal}\right)} \mathrm{Boole}\left(\mathrm{At}\left(\mathrm{qaVal},\ n\right) = 1\right)
```

**Example — conditionally including a term based on a flag:**

```latex
\mathrm{Boole}\left(\mathrm{At}\left(\mathrm{eqIsArea},\ \mathrm{index}\right) = 1\right) \times \mathrm{At}\left(\mathrm{eqCWPt},\ \mathrm{index}\right)
```

{% hint style="warning" %}
**Known unsupported or unreliable functions**: `Reduce` with `Add` does not work reliably — use `\sum` instead. `IndexWhere` is not supported. `If` and `Which` as standalone return values produce empty results — replace conditionals with `Boole` multiplied terms instead (e.g. `Boole(cond) * val1 + Boole(Not(cond)) * val2`).
{% endhint %}

**2.4 Built-in Lookup Functions**

Guardian provides the following built-in functions for looking up values in arrays by key. These are particularly useful when working with per-instance data arrays (e.g. one row per instance).

| Function      | Signature                                   | Description                                                                                                                                                                                |
| ------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Lookup`      | `Lookup(values, keys, id)`                  | Returns the value at the first position where `keys[i] == id`. Returns `0` if not found.                                                                                                   |
| `LookupTwo`   | `LookupTwo(values, keys1, id1, keys2, id2)` | Returns the value where both `keys1[i] == id1` and `keys2[i] == id2`. Useful for matching on two dimensions (e.g. instance + year). Returns `0` if not found or if array lengths differ.   |
| `LookupMin`   | `LookupMin(values, keys, id, sortKeys)`     | Among all rows where `keys[i] == id`, returns the value with the minimum `sortKeys[i]`. Useful for selecting the earliest year value. Returns `0` if not found.                            |
| `LookupMax`   | `LookupMax(values, keys, id, sortKeys)`     | Among all rows where `keys[i] == id`, returns the value with the maximum `sortKeys[i]`. Useful for selecting the most recent value when data has multiple years. Returns `0` if not found. |
| `EqualString` | `EqualString(a, b)`                         | Returns `1` if `a` and `b` are equal as strings, `0` otherwise. Use this instead of `Equal` when comparing string-typed input fields (e.g. `Yes`/`No`).                                    |

**Example usage in LaTeX:**

```latex
\mathrm{Lookup}\left(\mathrm{CWPwoodyABt},\ \mathrm{CWPwoodyABtId},\ \mathrm{At}\left(\mathrm{plantingCohort},\ \mathrm{index}\right)\right)
```

```latex
\mathrm{LookupMax}\left(\mathrm{mt},\ \mathrm{mtId},\ \mathrm{At}\left(\mathrm{plantingCohort},\ \mathrm{index}\right),\ \mathrm{mtYear}\right)
```

```latex
\mathrm{EqualString}\left(\mathrm{biomassBurningBoundary},\ \text{Yes}\right)
```

{% hint style="info" %}
**When to use `Lookup` vs `LookupMax`**: Use `Lookup` for parameters that have a single value per instance (no `year` field in the source data). Use `LookupMax` for monitored parameters that may have multiple yearly measurements — it selects the most recent one. Use `LookupMin` to select the earliest.
{% endhint %}

{% hint style="warning" %}
**Important — NaN propagation**: All lookup functions return `0` (not `NaN`) when no match is found. This is intentional: the Compute Engine evaluates all subexpressions immediately, so a `NaN` result from a lookup would propagate through any arithmetic that uses it (e.g. `NaN * 0 = NaN`), corrupting downstream calculations. Returning `0` ensures that expressions gated by a flag multiplied by `0` correctly produce `0` rather than `NaN`.
{% endhint %}

{% hint style="warning" %}
**String comparison**: The standard `Equal` operator works for numeric values and for string elements retrieved from arrays via `At()`. However, for scalar string input fields (e.g. `Yes`/`No`), use `EqualString` instead of `Equal`. `Equal` on a string scalar produces unexpected results because the Compute Engine stores scalar strings as symbols rather than string literals.
{% endhint %}

**2.5 Code (advanced)**

For complex scenarios where formulas are not sufficient for the required data transformations, use the Advanced (Optional) tab to add logic in JavaScript.

<figure><img src="../../../../../.gitbook/assets/image (7) (1) (2).png" alt=""><figcaption></figcaption></figure>

In code, you can reference all defined formulas and variables by name.

<figure><img src="../../../../../.gitbook/assets/image (8) (1) (3) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/image (9).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/image (10).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Note — JavaScript execution order**: The JavaScript code section executes **after** all formula variables have been evaluated. This means JavaScript can read formula results but cannot influence formula evaluation. Use JavaScript for post-processing tasks such as filtering arrays by a condition, aggregating results across instances or writing values that depend on multiple formula outputs. Avoid duplicating mathematical logic in JavaScript that can be expressed in formulas.
{% endhint %}

### 3. Outputs

Use this section to configure which document fields receive the results of calculations from the previous sections.

<figure><img src="../../../../../.gitbook/assets/image (11).png" alt=""><figcaption></figcaption></figure>

In this section, you can reference input/output fields and variables only. Formulas can be referenced only in the Formulas section.

<figure><img src="../../../../../.gitbook/assets/image (12) (6).png" alt=""><figcaption></figcaption></figure>

{% hint style="warning" %}
**Note — Output type constraint**: Only variables of type `variable` (not `function`) can be mapped to output fields. If a formula result needs to be written to an output, wrap it in an intermediate variable first.
{% endhint %}

### 4. Tabs

For convenience Inputs\Formulas\Outputs can be visually partitioned using tabs. This partitioning has not impact on the functionality of the policy, it is used to ease UI navigation by policy authors.

#### 4.1 Creation

<figure><img src="../../../../../.gitbook/assets/image (13) (4).png" alt=""><figcaption></figcaption></figure>

#### 4.2 Renaming

Tabs can be renamed as required.

<figure><img src="../../../../../.gitbook/assets/image (14).png" alt=""><figcaption></figcaption></figure>

#### 4.3 Deletion

Tabs can be deleted.

<figure><img src="../../../../../.gitbook/assets/image (15).png" alt=""><figcaption></figcaption></figure>

#### 4.4 Navigation

<figure><img src="../../../../../.gitbook/assets/image (16).png" alt=""><figcaption></figcaption></figure>

### 5. Test

After you define formulas, you can validate them using the Test section. Complete the following steps:

#### a. Inputs

To begin testing, specify the main Input Document.

<figure><img src="../../../../../.gitbook/assets/image (17).png" alt=""><figcaption></figcaption></figure>

If required, add additional documents associated with the input document. Make sure these documents are part of the main Input Document's relationships chain.

<figure><img src="../../../../../.gitbook/assets/image (18).png" alt=""><figcaption></figcaption></figure>

Provide input data in a document using one of the following three options:

* Use a form that matches the input schema.

<figure><img src="../../../../../.gitbook/assets/image (19).png" alt=""><figcaption></figcaption></figure>

* Provide JSON.

<figure><img src="../../../../../.gitbook/assets/image (20).png" alt=""><figcaption></figcaption></figure>

* Upload a file (the file must contain valid JSON).

<figure><img src="../../../../../.gitbook/assets/image (21).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Note — Test button scope**: The Test button executes formulas entirely within the frontend. It does not invoke the policy-service. This means test results reflect formula evaluation only.
{% endhint %}

#### b. Select Test

<figure><img src="../../../../../.gitbook/assets/image (22).png" alt=""><figcaption></figcaption></figure>

#### c. Results

Guardian displays test results for each element

<figure><img src="../../../../../.gitbook/assets/image (23).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/image (24).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/image (25).png" alt=""><figcaption></figcaption></figure>

## 1.2 Visualization at Policy runtime

Once a policy is published, Guardian generates Formula-Linked Definitions (FLDs) for all mathBlock elements in the policy. You can explore these the same way as standard FLDs.

<figure><img src="../../../../../.gitbook/assets/image (21) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/image (22) (1) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="warning" %}
**Note:** The _mathBlock_ code section is not used when automatically generating FLDs and is not represented in any way in the resulting visuals.
{% endhint %}

## 1.3 Known Limitations

| Limitation                                                                                         | Workaround                                                                                                  |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Single-letter variable names (`A`, `R`, etc.) must not be wrapped in `\mathrm{}` in formula bodies | Use bare `A`, `R` in expressions; only multi-character names need `\mathrm{}`                               |
| `Equal` does not work reliably for scalar string fields (e.g. `Yes`/`No` flags)                    | Use `EqualString(field, "Yes")` instead                                                                     |
| The JavaScript code section runs **after** formula evaluation                                      | Do not rely on JavaScript to set values that formulas will consume; use JavaScript only for post-processing |
| Output fields can only reference `variable` type items, not `function` type                        | Wrap formula results in intermediate variables before mapping to outputs                                    |
| `Reduce` with `Add` does not work reliably for summing arrays                                      | Use `\sum_{n=1}^{N}` syntax instead                                                                         |
| `If` and `Which` as standalone return values produce empty results                                 | Split conditionals into `Boole`-multiplied terms (e.g. `Boole(cond) * val1 + Boole(Not(cond)) * val2`)      |
