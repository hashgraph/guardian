# Data Transformation Addon

The purpose of this block is to produce a transformed result based on the data from the source

and filters blocks.

This block can be used in conjunction with pagination and filters for the

source block.

<figure><img src="../../../../../.gitbook/assets/image (833).png" alt=""><figcaption></figcaption></figure>

## Usage

As shown in the example below, dataTransformationAddon blocks should be placed after

documentsSourceAddon and filtersAddon blocks.

<figure><img src="../../../../../.gitbook/assets/image (834).png" alt=""><figcaption></figcaption></figure>

## Properties

| Property Name        | Description                                                                                                                            | Example                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Expression           | <p>A custom JavaScript</p><p>function that transforms</p><p>the existing source data</p><p>and returns it in a</p><p>custom format</p> | <p><code>function main(documents){</code></p><p><code>let sum = 0;</code></p><p><code>for(let i=0; i&#x3C; documents.length; i++) {</code></p><p><code>sum+=</code></p><p><code>documents[i].document.credentialSubject[0].fiel</code></p><p><code>d0 +</code></p><p><code>d1;</code></p><p><code>documents[i].document.credentialSubject[0].fiel</code></p><p><code>}</code></p><p><code>return {</code></p><p><code>sum</code></p><p><code>}</code></p><p><code>}</code></p><p><code>done(main(documents));</code></p> |
| hideWhenDiscontinued | Check if the button should be hidden when policy is discontinued                                                                       | Checked/Unchecked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## API

The API for the dataTransformationAddon uses the GET method

Example response to a GET request that returns the sum of 2 fields in a custom format:

```
{
"sum": 10
}
```

The request can be fulfilled through both endpoint

_`/api/v1/policies/{policyId}/blocks/{blockId}`_

and

_`/api/v1/policies/{policyId}/tag/{blockTag}/blocks`_
