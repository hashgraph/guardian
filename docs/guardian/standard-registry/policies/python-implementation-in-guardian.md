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

Choose "Python" when you want to leverage Python's expressive syntax and advanced computation libraries for policy logic.

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

| Library Name | Import Name | Version |
| :----------: | :---------: | :-----: |
| numpy | `numpy` | 1.26.4 |
| scipy | `scipy` | 1.12.0 |
| sympy | `sympy` | 1.12 |
| pandas | `pandas` | 2.2.0 |
| pint | `pint` | 0.25.3 |
| cftime | `cftime` | 1.6.3 |
| astropy | `astropy` | 6.0.1 |
| statsmodels | `statsmodels` | 0.14.2 |
| networkx | `networkx` | 3.3 |
| scikit-learn | `sklearn` | 1.4.2 |
| xarray | `xarray` | 2024.3.0 |
| geopandas | `geopandas` | 0.14.3 |

{% hint style="info" %}
Library versions listed are for the default Pyodide mode. Docker mode may have newer versions as it uses native CPython with pip.
{% endhint %}

#### Docker-Only Libraries

These libraries require native C/C++ dependencies (GDAL) and are only available in Docker mode:

| Library Name | Import Name | Purpose |
| :----------: | :---------: | :------ |
| rasterio | `rasterio` | Read/write raster geospatial data (GeoTIFF, satellite imagery) |
| rioxarray | `rioxarray` | Bridge between xarray and rasterio — CRS management, reprojection |

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

### 5. Execution Modes

Guardian supports two execution modes for Python custom logic blocks, controlled by the `PYTHON_SANDBOX_MODE` environment variable.

#### Pyodide Mode (default)

The default mode runs Python code using Pyodide (CPython compiled to WebAssembly) inside a Node.js Worker Thread.

* **No additional infrastructure required** — works out of the box
* **Startup:** packages are pre-cached at policy-service startup for faster execution
* **Limitation:** some C-extension packages (rasterio, rioxarray) are unavailable in WASM

**Configuration:** No env var needed (default), or explicitly set `PYTHON_SANDBOX_MODE=pyodide`

#### Docker Mode (experimental)

Runs Python code in an ephemeral Docker container using native CPython 3.12. Provides OS-level isolation.

**Container security flags:**

| Flag | Purpose |
| :--- | :------ |
| `--network=none` | All network access blocked |
| `--cap-drop=ALL` | No Linux capabilities |
| `--security-opt=no-new-privileges` | Prevent privilege escalation |
| `--read-only` | Read-only root filesystem |
| `--user=1001:1001` | Non-root execution |
| `--log-driver=none` | No container log storage |
| `--pull=never` | Never pull untrusted images |
| `--tmpfs /tmp` | Writable scratch space (noexec, destroyed on exit) |

**Setup:**

1. Build the sandbox image:
```bash
docker buildx build -t guardian/python-sandbox:latest policy-service/docker/python-sandbox
```
Or via docker-compose:
```bash
docker compose -f docker-compose-build.yml build python-sandbox
```

2. Set the environment variable in policy-service configuration:
```
PYTHON_SANDBOX_MODE=docker
```

3. Ensure the policy-service container has Docker socket access. For docker-compose deployments, uncomment the Docker socket volume mount in the policy-service and the `python-sandbox` service in the relevant compose file:
   - `docker-compose-build.yml`, `docker-compose.yml`, `docker-compose-production.yml`, `docker-compose-production-build.yml`, `docker-compose-quickstart.yml` — uncomment the Docker socket volume and `python-sandbox` service

{% hint style="warning" %}
Docker mode requires the Docker daemon to be available. The policy-service needs access to the Docker socket to spawn sandbox containers. For production deployments, consider using a Docker API proxy to restrict operations to sandbox container management only.
{% endhint %}

### 6. Sandbox Security

Python code in custom logic blocks runs in a sandboxed environment. The following restrictions are enforced:

#### Pyodide Mode Restrictions

| Restriction | Details |
| :---------- | :----- |
| JavaScript bridge (`from js import ...`) | Blocked via module stub + import hook |
| `pyodide.http` network access | Blocked via module stub + import hook |
| `os.system`, `os.popen`, `os.exec*`, `os.spawn*` | All replaced with blocked function |
| `subprocess.run`, `subprocess.Popen` | All execution functions replaced |
| `socket.socket`, `socket.connect` | All networking functions replaced |
| `os.environ` (secrets) | Cleared on startup (only HOME/PATH kept) |
| `importlib.reload` | Blocked to prevent undoing patches |
| `builtins.__import__` | Guarded via closure to prevent bypass |
| Execution timeout | Configurable via `PYTHON_SANDBOX_TIMEOUT_MS` (default 120s) |

#### Docker Mode Restrictions

All restrictions above are provided by Docker container isolation:

* **Network:** `--network=none` blocks all connections (verified: HTTP requests fail)
* **File system:** `--read-only` + no host mounts — container sees only its own minimal filesystem
* **Processes:** commands run inside isolated container only, destroyed after execution
* **Environment:** `os.environ` cleared before user code runs
* **Resources:** container destroyed with `--rm` after each execution

#### Vulnerability Comparison

| Attack Vector | Pyodide Mode | Docker Mode |
| :------------ | :----------- | :---------- |
| Network requests | Blocked (Python-level) | Blocked (OS-level `--network=none`) |
| Host filesystem access | Blocked (WASM virtual FS) | Blocked (`--read-only`, no mounts) |
| Process execution | Blocked (functions replaced) | Runs inside isolated container |
| `os.environ` secrets | Cleared | Cleared + container has own env |
| `ctypes` C function calls | Not blocked (needed by pandas, harmless in WASM) | Runs inside isolated container |
| Python introspection bypass | Possible (known limitation) | Irrelevant — container is isolated |
| Memory/CPU exhaustion | Timeout only | Timeout + container destroyed |

{% hint style="info" %}
* **Pyodide mode** is suitable when users are trusted or semi-trusted. It blocks common attack vectors but is vulnerable to sophisticated Python introspection attacks.
* **Docker mode** is suitable for untrusted code. OS-level isolation makes Python-level bypasses irrelevant — the container has no network, no host access, and is destroyed after execution.
{% endhint %}

### 7. Configuration Reference

| Environment Variable | Default | Description |
| :------------------- | :------ | :---------- |
| `PYTHON_SANDBOX_MODE` | `pyodide` | Execution mode: `pyodide` (default) or `docker` |
| `PYTHON_SANDBOX_TIMEOUT_MS` | `120000` | Execution timeout in milliseconds (both modes) |
| `PYTHON_SANDBOX_IMAGE` | `guardian/python-sandbox:latest` | Docker sandbox image name (Docker mode only) |
