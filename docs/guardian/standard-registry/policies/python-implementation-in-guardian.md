---
icon: python
---

# Python Implementation in Guardian

### Overview

The Guardian platform now supports Python scripting within its Custom Logic blocks, expanding its flexibility and enabling developers to perform complex computations and logic more easily. This feature introduces a new Script Language selection option and includes enhancements to VC (Verifiable Credential) document schemas for better version tracking.

### 1. Custom Logic Block: Script Language Selection

A new dropdown setting has been added to the Custom Logic block in the Policy Editor, allowing users to select the desired scripting language.

#### Configuration

* **Field:** `Script Language`
* **Options:**
  * `JavaScript` _(default for backward compatibility)_
  * `Python` _(newly introduced)_

<figure><img src="../../../.gitbook/assets/image (3) (1) (2).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

#### Use Case

Choose "Python" when you want to leverage Python’s expressive syntax and advanced computation libraries for policy logic.

### 2. Python Scripting Support

Guardian now supports Python as a language for defining business logic in Custom Logic blocks.

#### Capabilities

* Execute Python scripts directly as part of policy execution.
* Access context variables and input data in Python syntax.
* Perform conditional logic, calculations, or transformations using Python.

#### Example

```python
pythonCopyEdit# Sample Python logic inside Custom Logic block
if document['type'] == 'Certificate':
    document['status'] = 'Verified'
```

> Python code is sandboxed and only has access to allowed libraries/packages pre-installed in the Guardian environment.

### 3. VC Document Schema Enhancement: `guardianVersion`

A new default field has been introduced in all Verifiable Credential document schemas: `guardianVersion`.

#### Purpose

This field helps track the Guardian system version that was used to generate or interact with the VC. It is especially useful when managing backward compatibility and knowing which Python packages and versions were available during execution.

#### Field Details

* **Field Name:** `guardianVersion`
* **Type:** `string`
* **Format:** Semantic versioning (e.g., `"3.4.1"`)
* **Automatically populated?** ✅ Yes

<figure><img src="../../../.gitbook/assets/image (4) (1) (4).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
* Ensure your logic is compatible with the version of Guardian being used, especially when importing Python packages.
* Python execution is subject to the limitations and security constraints defined in Guardian's runtime.
{% endhint %}

### 4. Supported Python Libraries

#### Installed Libraries

| Library Name | Import Name | Purpose |
| :----------: | :---------: | :------ |
| numpy | `numpy` | Numerical computation, arrays, linear algebra |
| scipy | `scipy` | Scientific computation, optimization, statistics |
| sympy | `sympy` | Symbolic mathematics, equation solving, calculus |
| pandas | `pandas` | Data processing, DataFrames, analysis |
| cftime | `cftime` | Climate/forecast date handling |
| astropy | `astropy` | Astronomy computations, unit conversions |
| statsmodels | `statsmodels` | Statistical modeling, OLS regression |
| networkx | `networkx` | Graph/network computation, shortest paths |
| pint | `pint` | Physical unit conversions and arithmetic |
| scikit-learn | `sklearn` | Machine learning, classification, clustering |
| xarray | `xarray` | Labeled multi-dimensional arrays |
| geopandas | `geopandas` | Geospatial DataFrames, spatial operations |

#### Python Built-in Modules (always available)

| Module | Purpose |
| :----: | :------ |
| `calendar` | Calendar rendering, weekday calculations |
| `datetime` | Date/time types and arithmetic |
| `collections` | OrderedDict, Counter, defaultdict, namedtuple |
| `math` | Basic math functions (sin, log, sqrt, pi) |
| `copy` | Deep/shallow copy of objects |

#### Available as Transitive Dependencies (no explicit install needed)

| Library | Import Name | Purpose | Installed via |
| :-----: | :---------: | :------ | :------------ |
| python-dateutil | `dateutil` | Smart date parsing, relative deltas | pandas |
| six | `six` | Python 2/3 compatibility | pandas → python-dateutil |
| matplotlib | `matplotlib` | Data visualization | networkx (transitive) |

#### Removed Libraries (Issue #5505)

The following libraries were removed as part of sandbox hardening. They are unnecessary for computation — their data processing features are covered by pandas, and they were designed to work with external resources (databases, networks, web servers) that are not available in the sandbox.

| Library | Reason for Removal |
| :-----: | :----------------- |
| duckdb | SQL database engine; covered by pandas |
| sqlalchemy | SQL toolkit/ORM; covered by pandas |
| bokeh | Visualization; unnecessary for computation |
| altair | Visualization; unnecessary for computation |
| cartopy | Map visualization; unnecessary for computation |
| seaborn | Visualization; unnecessary for computation |

#### Unavailable Libraries (Pyodide/WASM limitation)

| Library | Why Unavailable | Workaround |
| :-----: | :-------------- | :--------- |
| rasterio | Depends on GDAL (C/C++ library not compiled to WASM) | Pre-process raster data outside the block, pass as input |
| rioxarray | Depends on rasterio | Same as above |

### 5. Sandbox Security

Python code in custom logic blocks runs in a sandboxed environment. The following restrictions are enforced:

#### Blocked Operations

| Operation | Blocked? | Details |
| :-------- | :------: | :----- |
| Network requests (fetch, HTTP) | ✅ | JS bridge and pyodide.http blocked |
| Host file system access | ✅ | WASM virtual FS only; Docker mode: --read-only, no mounts |
| os.system, os.popen | ✅ | All process execution functions replaced |
| subprocess.run, Popen | ✅ | All subprocess functions replaced |
| os.environ (secrets) | ✅ | Cleared on startup (only HOME/PATH kept) |
| importlib.reload | ✅ | Blocked to prevent undoing patches |

#### Execution Modes

| Mode | Env Var | Description |
| :--: | :------ | :---------- |
| Pyodide (default) | `PYTHON_SANDBOX_MODE=pyodide` | Runs in WASM via Node.js Worker Thread. Python-level sandbox restrictions. |
| Docker (experimental) | `PYTHON_SANDBOX_MODE=docker` | Runs in ephemeral Docker container with --network=none, --cap-drop=ALL, --read-only, non-root user. Defense-in-depth: Python-level restrictions also applied inside container. |

{% hint style="info" %}
* Docker mode requires building the sandbox image: `docker buildx build -t guardian/python-sandbox:latest policy-service/docker/python-sandbox`
* Set `PYTHON_SANDBOX_MODE=docker` in the policy-service environment configuration
* Docker mode provides stronger isolation (OS-level) but has higher startup latency
{% endhint %}
