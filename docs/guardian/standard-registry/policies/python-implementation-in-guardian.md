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

<figure><img src="../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

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

### 4.  Supported Python Libraries and its Versions&#x20;

|           aiohttp          |        3.9.5        |
| :------------------------: | :-----------------: |
|          aiosignal         |        1.3.1        |
|           altair           |        5.3.0        |
|       annotated-types      |        0.6.0        |
|          asciitree         |        0.3.3        |
|           astropy          |        6.0.1        |
|     astropy\_iers\_data    | 0.2024.4.22.0.29.50 |
|          asttokens         |        2.4.1        |
|        async-timeout       |        4.0.3        |
|        atomicwrites        |        1.4.1        |
|            attrs           |        23.2.0       |
|          autograd          |        1.6.2        |
|         awkward-cpp        |          33         |
|             b2d            |        0.7.4        |
|           bcrypt           |        4.1.2        |
|       beautifulsoup4       |        4.12.3       |
|          biopython         |         1.83        |
|          bitarray          |        2.9.2        |
|          bitstring         |        4.1.4        |
|           bleach           |        6.1.0        |
|            bokeh           |        3.4.1        |
|       boost-histogram      |        1.4.1        |
|           brotli           |        1.1.0        |
|         cachetools         |        5.3.3        |
|           Cartopy          |        0.23.0       |
|          cbor-diag         |        1.0.1        |
|           certifi          |       2024.2.2      |
|            cffi            |        1.16.0       |
|        cffi\_example       |         0.1         |
|           cftime           |        1.6.3        |
|     charset-normalizer     |        3.3.2        |
|          clarabel          |        0.7.1        |
|            click           |        8.1.7        |
|            cligj           |        0.7.2        |
|         cloudpickle        |        3.0.0        |
|            cmyt            |        2.0.0        |
|        colorspacious       |        1.1.2        |
|          contourpy         |        1.2.1        |
|          coolprop          |        6.6.0        |
|          coverage          |        7.4.4        |
|           cramjam          |        2.8.3        |
|           crc32c           |         2.4         |
|        cryptography        |        42.0.5       |
|          cssselect         |        1.2.0        |
|         cvxpy-base         |        1.5.1        |
|           cycler           |        0.12.1       |
|          cysignals         |        1.11.4       |
|           cytoolz          |        0.12.3       |
|          decorator         |        5.1.1        |
|            demes           |        0.2.3        |
|         deprecation        |        2.1.0        |
|           distlib          |        0.3.8        |
|          docutils          |        0.21.1       |
|           duckdb           |        1.0.0        |
|      ewah\_bool\_utils     |        1.2.0        |
|       exceptiongroup       |        1.2.1        |
|          executing         |        2.0.1        |
|         fastparquet        |       2024.2.0      |
|            fiona           |        1.9.5        |
|          fonttools         |        4.51.0       |
|          freesasa          |        2.2.1        |
|         frozenlist         |        1.4.1        |
|           fsspec           |       2024.3.1      |
|           future           |        1.0.0        |
|            galpy           |        1.9.2        |
|           gensim           |        4.3.2        |
|          geopandas         |        0.14.3       |
|            gmpy2           |        2.1.5        |
|             gsw            |        3.6.17       |
|            h5py            |        3.11.0       |
|          html5lib          |         1.1         |
|            idna            |         3.7         |
|           igraph           |        0.11.4       |
|           imageio          |        2.34.1       |
|          iniconfig         |        2.0.0        |
|           ipython          |        8.23.0       |
|            jedi            |        0.19.1       |
|           Jinja2           |        3.1.3        |
|           joblib           |        1.4.0        |
|         jsonschema         |        4.21.1       |
| jsonschema\_specifications |      2023.12.1      |
|         kiwisolver         |        1.4.5        |
|        lakers-python       |        0.3.0        |
|      lazy-object-proxy     |        1.10.0       |
|        lazy\_loader        |         0.4         |
|           libcst           |        1.3.1        |
|          lightgbm          |        4.3.0        |
|           logbook          |     1.7.0.post0     |
|            lxml            |        5.2.1        |
|         MarkupSafe         |        2.1.5        |
|         matplotlib         |        3.5.2        |
|      matplotlib-inline     |        0.1.7        |
|     matplotlib-pyodide     |        0.2.2        |
|      memory-allocator      |        0.1.4        |
|          micropip          |        0.6.0        |
|            mmh3            |        4.1.0        |
|             mne            |        1.7.0        |
|       more-itertools       |        10.2.0       |
|           mpmath           |        1.3.0        |
|           msgpack          |        1.0.8        |
|           msgspec          |        0.18.6       |
|           msprime          |        1.3.1        |
|          multidict         |        6.0.5        |
|            munch           |        4.0.0        |
|            mypy            |        1.9.0        |
|           netcdf4          |        1.6.5        |
|          networkx          |         3.3         |
|           newick           |        1.9.0        |
|             nh3            |        0.2.17       |
|            nlopt           |        2.7.0        |
|            nltk            |        3.8.1        |
|          numcodecs         |        0.11.0       |
|            numpy           |        1.26.4       |
|        opencv-python       |       4.9.0.80      |
|           optlang          |        1.8.1        |
|           orjson           |        3.10.1       |
|          packaging         |         23.2        |
|           pandas           |        2.2.0        |
|            parso           |        0.8.4        |
|            patsy           |        0.5.6        |
|           peewee           |        3.17.3       |
|           Pillow           |        10.2.0       |
|        pillow\_heif        |        0.8.0        |
|          pkgconfig         |        1.5.5        |
|           pluggy           |        1.5.0        |
|            pplpy           |        0.8.10       |
|        primecountpy        |        0.1.0        |
|       prompt\_toolkit      |        3.0.43       |
|          protobuf          |        4.24.4       |
|         pure\_eval         |        0.2.2        |
|             py             |        1.11.0       |
|          pyclipper         |     1.3.0.post5     |
|          pycparser         |         2.22        |
|        pycryptodome        |        3.20.0       |
|          pydantic          |        2.7.0        |
|       pydantic\_core       |        2.18.1       |
|           pyerfa           |       2.0.1.4       |
|          pygame-ce         |        2.4.1        |
|          Pygments          |        2.17.2       |
|           pyheif           |        0.7.1        |
|          pyiceberg         |        0.6.0        |
|        pyinstrument        |        4.4.0        |
|           pynacl           |        1.5.0        |
|        pyodide-http        |        0.2.1        |
|          pyparsing         |        3.1.2        |
|           pyproj           |        3.6.1        |
|         pyrsistent         |        0.20.0       |
|            pysam           |        0.22.0       |
|            pyshp           |        2.3.1        |
|           pytest           |        8.1.1        |
|       pytest-asyncio       |        0.23.7       |
|      pytest-benchmark      |        4.0.0        |
|       python-dateutil      |     2.9.0.post0     |
|        python-flint        |        0.6.0        |
|        python-magic        |        0.4.27       |
|         python-sat         |      1.8.dev13      |
|     python\_solvespace     |        3.0.8        |
|            pytz            |        2024.1       |
|         pywavelets         |        1.6.0        |
|            pyxel           |        1.9.10       |
|           pyxirr           |        0.10.3       |
|           pyyaml           |        6.0.1        |
|           rebound          |        3.24.2       |
|          reboundx          |        3.10.1       |
|         referencing        |        0.34.0       |
|            regex           |      2024.4.16      |
|          requests          |        2.31.0       |
|          retrying          |        1.3.4        |
|            rich            |        13.7.1       |
|            river           |        0.19.0       |
|       RobotRaconteur       |        1.2.0        |
|           rpds-py          |        0.18.0       |
|         ruamel.yaml        |        0.18.6       |
|       rust-panic-test      |         1.0         |
|        scikit-image        |        0.23.2       |
|        scikit-learn        |        1.4.2        |
|            scipy           |        1.12.0       |
|           screed           |        1.1.3        |
|         setuptools         |        69.5.1       |
|           shapely          |        2.0.2        |
|         simplejson         |        3.19.2       |
|            sisl            |        0.14.3       |
|             six            |        1.16.0       |
|         smart\_open        |        7.0.4        |
|      sortedcontainers      |        2.4.0        |
|          soupsieve         |         2.5         |
|          sourmash          |        4.8.8        |
|          sparseqr          |         1.2         |
|         sqlalchemy         |        2.0.29       |
|         stack\_data        |        0.6.3        |
|         statsmodels        |        0.14.2       |
|         strictyaml         |        1.7.3        |
|          svgwrite          |        1.4.3        |
|           swiglpk          |        5.0.10       |
|            sympy           |         1.12        |
|            tblib           |        3.0.0        |
|          termcolor         |        2.4.0        |
|          texttable         |        1.7.0        |
|        threadpoolctl       |        3.4.0        |
|            tomli           |        2.0.1        |
|           tomli-w          |        1.0.0        |
|            toolz           |        0.12.1       |
|            tqdm            |        4.66.2       |
|          traitlets         |        5.14.3       |
|           traits           |        6.4.3        |
|            tskit           |        0.5.6        |
|      typing-extensions     |        4.11.0       |
|           tzdata           |        2024.1       |
|        uncertainties       |        3.1.7        |
|            unyt            |        3.0.2        |
|           urllib3          |        2.2.1        |
|           wcwidth          |        0.2.13       |
|        webencodings        |        0.5.1        |
|          wordcloud         |        1.9.3        |
|            wrapt           |        1.16.0       |
|           xarray           |       2024.3.0      |
|           xgboost          |      2.1.0.dev0     |
|            xlrd            |        2.0.1        |
|           xxhash           |        3.4.1        |
|         xyzservices        |       2024.4.0      |
|            yarl            |        1.9.4        |
|             yt             |        4.3.0        |
|            zarr            |        2.16.1       |
|            zengl           |        2.4.1        |
|          zstandard         |        0.22.0       |

\
