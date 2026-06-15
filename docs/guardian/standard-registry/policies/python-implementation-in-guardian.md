---
icon: python
---

# Python Implementation in Guardian

## Overview

The Guardian platform now supports Python scripting within its Custom Logic blocks, expanding its flexibility and enabling developers to perform complex computations and logic more easily. This feature introduces a new Script Language selection option and includes enhancements to VC (Verifiable Credential) document schemas for better version tracking.

### 1. Custom Logic Block: Script Language Selection

A new dropdown setting has been added to the Custom Logic block in the Policy Editor, allowing users to select the desired scripting language.

#### Configuration

* **Field:** `Script Language`
* **Options:**
  * `JavaScript` _(default for backward compatibility)_
  * `Python` _(newly introduced)_

<figure><img src="../../../.gitbook/assets/image (3) (1) (2).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

#### Use Case

Choose "Python" when you want to leverage Python's expressive syntax and advanced computation libraries for policy logic.

### 2. Python Scripting Support

Guardian now supports Python as a language for defining business logic in Custom Logic blocks.

#### Capabilities

* Execute Python scripts directly as part of policy execution.
* Access context variables and input data in Python syntax.
* Perform conditional logic, calculations, or transformations using Python.

#### Available globals

The following names are pre-populated in the script's global scope:

| Name | Type | Description |
| :--- | :--- | :---------- |
| `documents` | `list[dict]` | Input documents passed into the block |
| `user` | `dict` | Information about the user running the block |
| `artifacts` | `list` | Policy artifacts attached to the block |
| `sources` | `list[dict]` | Documents collected from configured sources |
| `table` | object | Helper for accessing table-field data (see Table Data Input Field docs) |
| `done(result)` | function | Return the final result from the script |
| `debug(value)` | function | Emit a debug message visible in the policy logs |

`documents`, `user`, `artifacts`, and `sources` are converted to native Python types, so dict idioms work as expected (`document.get('credentialSubject', [])`, `.keys()`, `.items()`, etc.).

#### Example

```python
# Sample Python logic inside Custom Logic block
for document in documents:
    if document.get('type') == 'Certificate':
        document['status'] = 'Verified'
done(documents)
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

#### Removed Libraries starting from Guardian v3.6.0

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
* **Startup:** package wheels are pre-downloaded at policy-service startup so they are warm in the on-disk cache
* **Per-execution install:** each script is parsed with `pyodide.code.find_imports`, and only the allowlisted packages it actually imports are installed into the worker (e.g. importing only `pandas` skips the cost of unpacking `geopandas`, `astropy`, etc.)
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

    Or uncomment the `python-sandbox` image build definition in the compose file and run:

    ```bash
    docker compose -f docker-compose-build.yml build python-sandbox
    ```

2. Set `PYTHON_SANDBOX_MODE=docker` in `configs/.env..guardian.system` (or the corresponding system env file for your environment). The variable is present as a commented-out example in all env templates.

3. For docker-compose deployments, uncomment the Docker socket volume mount for policy-service in the relevant compose file:

   * `docker-compose-build.yml`, `docker-compose.yml`, `docker-compose-production.yml`, `docker-compose-production-build.yml`, `docker-compose-quickstart.yml`
   * The socket must be mounted without `:ro` (policy-service needs read-write access to communicate with the Docker daemon)
   * For non-Docker deployments (running services directly), skip this step — Docker socket is already accessible on the host

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
| `pyodide.code` (exposes `run_js` → arbitrary Node host code) | Cached entry evicted, stubbed in `sys.modules` *and* on the parent `pyodide` package, blocked via import hook |
| `pyodide.ffi`, `pyodide.webloop`, `pyodide.console` | Same treatment as `pyodide.code` |
| `micropip` (would let user code extend the install allowlist) | Removed from `sys.modules` after controlled install, blocked via import hook |
| `sqlite3` (pulled transitively by geopandas → fiona) | Blocked via module stub + import hook |
| `os.system`, `os.popen`, `os.exec*`, `os.spawn*` | All replaced with blocked function |
| `subprocess.run`, `subprocess.Popen` | All execution functions replaced |
| `socket.socket`, `socket.connect` | All networking functions replaced |
| `os.environ` (secrets) | Cleared on startup (only HOME/PATH kept) |
| `importlib.reload` | Blocked to prevent undoing patches |
| `builtins.__import__` | Guarded via closure to prevent bypass |
| Dry-run input depth/size | Capped at 64 levels / 100k nodes before `pyodide.toPy` conversion |
| Execution timeout | Configurable via `PYTHON_SANDBOX_TIMEOUT_MS` (default 120s) |
| Worker heap memory | Capped via the Worker's `resourceLimits`, tunable with `PYTHON_SANDBOX_HEAP_MB` (default 512 MB). Applies only to Pyodide mode; Docker mode uses `PYTHON_SANDBOX_MEMORY` instead. |

#### Docker Mode Restrictions

All restrictions above are provided by Docker container isolation:

* **Network:** `--network=none` blocks all connections (verified: HTTP requests fail)
* **File system:** `--read-only` + no host mounts — container sees only its own minimal filesystem
* **Processes:** commands run inside isolated container only, destroyed after execution
* **Environment:** `os.environ` cleared before user code runs
* **Resources:** `--memory` (default 512m, also pins `--memory-swap`), `--cpus` (default 1.0), `--pids-limit` (default 128) bound a misbehaving script; container destroyed with `--rm` after each execution. Each cap is tunable via `PYTHON_SANDBOX_MEMORY` / `PYTHON_SANDBOX_CPUS` / `PYTHON_SANDBOX_PIDS`.

#### Vulnerability Comparison

| Attack Vector | Pyodide Mode | Docker Mode |
| :------------ | :----------- | :---------- |
| Network requests | Blocked (Python-level) | Blocked (OS-level `--network=none`) |
| Host filesystem access | Blocked (WASM virtual FS) | Blocked (`--read-only`, no mounts) |
| Process execution | Blocked (functions replaced) | Runs inside isolated container |
| `os.environ` secrets | Cleared | Cleared + container has own env |
| `ctypes` C function calls | Not blocked (needed by pandas, harmless in WASM) | Runs inside isolated container |
| Python introspection bypass | Possible (known limitation) | Irrelevant — container is isolated |
| Memory/CPU exhaustion | Timeout only | `--memory` / `--cpus` / `--pids-limit` + timeout + container destroyed |

{% hint style="info" %}

* **Pyodide mode** is suitable when users are trusted or semi-trusted. It blocks common attack vectors but is vulnerable to sophisticated Python introspection attacks.
* **Docker mode** is suitable for untrusted code. OS-level isolation makes Python-level bypasses irrelevant — the container has no network, no host access, and is destroyed after execution.

{% endhint %}

### 7. Configuration Reference

| Environment Variable | Template Value | Required | Description |
| :------------------- | :------------- | :------- | :---------- |
| `PYTHON_SANDBOX_MODE` | `pyodide` | No (defaults to `pyodide` if unset) | Execution mode: `pyodide` or `docker` |
| `PYTHON_SANDBOX_TIMEOUT_MS` | `120000` | Yes | Execution timeout in milliseconds (both modes). Provided by all `configs/.env.*.guardian.system` templates; the policy-service has no in-code fallback, so the variable must be present or block execution will fail immediately. |
| `PYTHON_SANDBOX_IMAGE` | `guardian/python-sandbox:latest` | No (Docker mode only) | Docker sandbox image name |
| `PYTHON_SANDBOX_MEMORY` | `512m` | No (Docker mode only) | Container memory limit (passed to `docker run --memory` and `--memory-swap`). Accepts the same suffix forms as Docker (`b`, `k`, `m`, `g`). |
| `PYTHON_SANDBOX_CPUS` | `1.0` | No (Docker mode only) | Container CPU quota (passed to `docker run --cpus`). |
| `PYTHON_SANDBOX_PIDS` | `128` | No (Docker mode only) | Container PID limit (passed to `docker run --pids-limit`). |
| `PYTHON_SANDBOX_HEAP_MB` | `512` | No (Pyodide mode only) | Pyodide worker heap cap in megabytes (Node `Worker` `resourceLimits.maxOldGenerationSizeMb`). Ignored in Docker mode, which uses `PYTHON_SANDBOX_MEMORY`. |
| `DRY_RUN_BLOCK_TIMEOUT_MS` | `180000` | Yes | Overall timeout for the Policy Editor "Test" dialog (dry-run block execution). Provided by all env templates; no in-code fallback. Must be larger than `PYTHON_SANDBOX_TIMEOUT_MS` to leave room for Pyodide cold start. |
