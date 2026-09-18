# DocumentsSourceAddOn

{% hint style="info" %}
Note: This block is used for dropdown. You can add multiple blocks to 1 grid to combine different data.
{% endhint %}

### Properties

<table><thead><tr><th width="282.3333333333333">Block Property</th><th>Definition</th><th>Example Input</th><th>Status</th></tr></thead><tbody><tr><td>type</td><td>A block for searching VC, for grid</td><td><strong>DocumentsSourceAddOn Block</strong> (Can't be changed).</td><td></td></tr><tr><td>tag</td><td>Unique name for the logic block.</td><td>approve<em>d_documents_</em>grid_source</td><td></td></tr><tr><td>permissions</td><td>Which entity has rights to interact at this part of the workflow.</td><td>Installer.</td><td></td></tr><tr><td>defaultActive</td><td>Shows whether this block is active at this time and whether it needs to be shown.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>dependencies</td><td>Automatic update. The block is automatically re-rendered if any of the linked components gets updated.</td><td>Select the appropriate block from the dropdown.</td><td></td></tr><tr><td>Data Type</td><td>Specify the table to request the data from.</td><td>Current options are: Verifiable Credential, DID, Approve, or Hedera.</td><td></td></tr><tr><td>Schema</td><td>Filters the VC according to the selected scheme</td><td>iRec Application Details (1.0.0) PUBLISHED</td><td></td></tr><tr><td>onlyOwnDocuments</td><td>When checked, filter out only VCs created by the user</td><td>checked or unchecked</td><td></td></tr><tr><td>onlyAssignDocuments</td><td>When checked, it filter only VCs assigned to the user</td><td>checked or unchecked</td><td></td></tr><tr><td>Order Field</td><td>name of the field</td><td>Source</td><td></td></tr><tr><td>Order Direction</td><td>Ascending or Descending direction of the order</td><td>ASC/DESC</td><td></td></tr></tbody></table>

{% hint style="info" %}
Note: If no Order Field is specified, but Order Direction is specified, then Order Field will be automatically filled = createDate and data will be sorted by createDate
{% endhint %}

### Filter Properties

| Filter Property | Definition                                                 | Example Input |
| --------------- | ---------------------------------------------------------- | ------------- |
| Field           | Name of the field to filter, it can be nested using "."    | option.status |
| Type            | Filter on the basis of type (Equal, Not Equal, In, Not In) | Equal         |
| Value           | The field by which to filter Value                         | Verified      |

### API Parameters

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="policyID" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Block UUID
{% endswagger-parameter %}

{% swagger-parameter in="body" name="orderBy" type="String" required="false" %}
Order Field Path
{% endswagger-parameter %}

{% swagger-parameter in="body" name="orderDirection" type="String" required="false" %}
Order Direction, ASC, DESC
{% endswagger-parameter %}
{% endswagger %}
