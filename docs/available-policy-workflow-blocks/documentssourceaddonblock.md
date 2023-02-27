# DocumentsSourceAddOn

{% hint style="info" %}
Note: This block is used for dropdown. You can add multiple blocks to 1 grid to combine different data.&#x20;
{% endhint %}

### Properties

| Block Property      | Definition                                                                                             | Example Input                                                        | Status                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------ |
| type                | A block for searching VC, for grid                                                                     | **DocumentsSourceAddOn** Block (Can't be changed).                   |                                            |
| tag                 | Unique name for the logic block.                                                                       | approve_d\_documents\__grid\_source                                  |                                            |
| permissions         | Which entity has rights to interact at this part of the workflow.                                      | Installer.                                                           |                                            |
| defaultActive       | Shows whether this block is active at this time and whether it needs to be shown.                      | Checked or unchecked.                                                |                                            |
| dependencies        | Automatic update. The block is automatically re-rendered if any of the linked components gets updated. | Select the appropriate block from the dropdown.                      |                                            |
| Data Type           | Specify the table to request the data from.                                                            | Current options are: Verifiable Credential, DID, Approve, or Hedera. |                                            |
| Schema              | Filters the VC according to the selected scheme                                                        | iRec Application Details (1.0.0) PUBLISHED                           |                                            |
| onlyOwnDocuments    | When checked, filter out only VCs created by the user                                                  | checked or unchecked                                                 |                                            |
| onlyAssignDocuments | When checked, it filter only VCs assigned to the user                                                  | checked or unchecked                                                 |                                            |
| ViewHistory         | When checked, documents in the Grid will be displayed with status timeline                             | checked or unchecked                                                 | <mark style="color:red;">Deprecated</mark> |
| Order Field         | name of the field                                                                                      | Source                                                               |                                            |
| Order Direction     | Ascending or Descending direction of the order                                                         | ASC/DESC                                                             |                                            |

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

{% swagger-parameter in="body" name="orderBy" type="String" %}
Order Field Path
{% endswagger-parameter %}

{% swagger-parameter in="body" name="orderDirection" type="String" %}
Order Direction, ASC, DESC
{% endswagger-parameter %}
{% endswagger %}
