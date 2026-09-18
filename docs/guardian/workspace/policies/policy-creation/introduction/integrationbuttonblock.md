# IntegrationButtonBlock

The purpose of this block is to enable interaction with third-party data providers through configurable parameters and caching mechanisms.

Below is a description of the available options and supported services:

## 1.1 Properties <a href="#id-1.1-properties" id="id-1.1-properties"></a>

<table><thead><tr><th>Property Name</th><th width="269.6015625">Description</th><th>Example</th></tr></thead><tbody><tr><td>Button name</td><td>The display name of the button</td><td>Integration Data</td></tr><tr><td>Enable caching</td><td>If set to true, and the data was previously saved to the database (e.g., via the "sendToGuardian" block), future requests with the same parameters will retrieve the data from the cache instead of performing a new request.</td><td>Checked/unchecked</td></tr><tr><td>Integration</td><td><p></p><p>Type of integration. Currently supported values:</p><ul><li>GLOBAL_FOREST_WATCH</li><li>KANOP_IO</li><li>WORLD_BANK</li><li>FIRM</li></ul></td><td>KANOP_IO</td></tr><tr><td>hideWhenDiscontinued</td><td>Check if the button should be hidden when policy is discontinued</td><td>Checked/Unchecked</td></tr><tr><td>Request type</td><td>The name of the specific request to execute (varies per integration).</td><td>getDatasets</td></tr><tr><td>Request params</td><td>Parameters required for the selected request. These are integration-specific.</td><td>datasets</td></tr></tbody></table>

<figure><img src="https://docs.hedera.com/guardian/~gitbook/image?url=https%3A%2F%2F1556785885-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FNYWPEEAknX9Vki1yV5HY%252Fuploads%252FIagZQVulGgAMVzRwvKGL%252Fimage.png%3Falt%3Dmedia%26token%3Dfeb0ba56-aa6c-4113-9c0e-982cd327b4d8&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=bcd756be&#x26;sv=2" alt=""><figcaption></figcaption></figure>

## 1.2 Output Events <a href="#id-1.2-output-events" id="id-1.2-output-events"></a>

This block can emits the following events:

* RunEvent
* ReleaseEvent
* RefreshEvent

<figure><img src="https://docs.hedera.com/guardian/~gitbook/image?url=https%3A%2F%2F1556785885-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FNYWPEEAknX9Vki1yV5HY%252Fuploads%252FShQR7hOiHrSkgf1lcBIK%252Fimage.png%3Falt%3Dmedia%26token%3Dd7902a14-392c-4bf4-a69b-d27842a90cad&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=b08eb688&#x26;sv=2" alt=""><figcaption></figcaption></figure>

To enable caching functionality, data must be saved to the database using the "sendToGuardian" block with the source set to auto or database. You can link the IntegrationButton to the "sendToGuardian" block using the RunEvent output event.

<figure><img src="https://docs.hedera.com/guardian/~gitbook/image?url=https%3A%2F%2F1556785885-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FNYWPEEAknX9Vki1yV5HY%252Fuploads%252FkAHcZs6ia2IQT1ndhREY%252Fimage.png%3Falt%3Dmedia%26token%3D4c90437a-c575-4389-b88f-1e580c2117af&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=dbaffe2c&#x26;sv=2" alt=""><figcaption></figcaption></figure>

## 1.3 Supported Integrations <a href="#id-1.3-supported-integrations" id="id-1.3-supported-integrations"></a>

This block supports four third-party data providers:

1\. [Global Forest Watch](https://data-api.globalforestwatch.org/)&#x20;

2\. [Kanop](https://www.kanop.io/)&#x20;

3\. [World Bank Governance Indicators](https://databank.worldbank.org/source/worldwide-governance-indicators)&#x20;

4\. [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/)

<figure><img src="https://docs.hedera.com/guardian/~gitbook/image?url=https%3A%2F%2F1556785885-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FNYWPEEAknX9Vki1yV5HY%252Fuploads%252Feqoda6K0NQWTeRuixYF7%252Fimage.png%3Falt%3Dmedia%26token%3De32c1907-92a6-409c-866e-5ef54955d5a3&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=d5408100&#x26;sv=2" alt=""><figcaption></figcaption></figure>

## 1.4 Request UI Parameters <a href="#id-1.4-request-ui-parameters" id="id-1.4-request-ui-parameters"></a>

Each integration has a list of supported requests and associated parameters. For each request parameter, two input methods are available:

| Parameter          | Description                                                   |
| ------------------ | ------------------------------------------------------------- |
| Path field for ... | A Path input to extract data from an existing field.          |
| Value for ...      | A manual input for static values (e.g., known dataset names). |

{% hint style="info" %}
**Note: If both fields are filled, "Value for ..." takes precedence.**
{% endhint %}

<figure><img src="https://docs.hedera.com/guardian/~gitbook/image?url=https%3A%2F%2F1556785885-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FNYWPEEAknX9Vki1yV5HY%252Fuploads%252FhB05XVxFlflvB1Qi0UhN%252Fimage.png%3Falt%3Dmedia%26token%3De26ca44b-e9b5-42ec-b8bf-3adc5016a30f&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=58027a6c&#x26;sv=2" alt=""><figcaption></figcaption></figure>
