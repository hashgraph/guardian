# Schema Fields Reference

Schema fields define the data a document can collect and validate. Select a type from the field picker or drag it into the schema.

### Simple types

| Field type       | Use it for                                             |
| ---------------- | ------------------------------------------------------ |
| **Number**       | Numeric values, including decimals.                    |
| **Integer**      | Whole numbers, including negative values.              |
| **String**       | Plain text.                                            |
| **Boolean**      | A `true` or `false` value.                             |
| **Date**         | A calendar date.                                       |
| **Time**         | A time of day.                                         |
| **DateTime**     | A date and time together.                              |
| **Duration**     | A period, such as `P1D` or `P2W`.                      |
| **URL**          | A web address.                                         |
| **URI**          | A resource identifier, including IPFS links.           |
| **Email**        | An email address.                                      |
| **Image**        | An uploaded image.                                     |
| **File**         | An uploaded file.                                      |
| **Enum**         | One value from a defined list.                         |
| **Help Text**    | Instructions or guidance within a form.                |
| **GeoJSON**      | Geographic points, lines, and polygons.                |
| **Sentinel Hub** | Geographic raster-imagery coordinates and date ranges. |
| **Table**        | CSV-based tabular data.                                |
| **Rich Text**    | Formatted long-form text.                              |

### Geographic types

Use these fields for standardized location values:

| Field type         | Use it for               |
| ------------------ | ------------------------ |
| **Continent**      | A continent.             |
| **Country**        | An ISO 3166 country.     |
| **State/Province** | An ISO 3166 subdivision. |

Geographic fields can be linked into a cascading group. Selecting a parent filters compatible child values.

### Units of measure

| Field type  | Use it for                           |
| ----------- | ------------------------------------ |
| **Prefix**  | A fixed unit before a numeric value. |
| **Postfix** | A fixed unit after a numeric value.  |

### Hedera and schema types

| Field type     | Use it for                                 |
| -------------- | ------------------------------------------ |
| **Account**    | A Hedera account reference.                |
| **Sub-schema** | A nested object defined by another schema. |

### Configure a field

For each field, define its name, description, and type. You can also:

* Mark the field as required, hidden, or optional.
* Allow multiple answers when the field accepts a list.
* Set default, suggested, and test values.
* Map the field to an IWA dMRV property.

Use **Conditions** to show fields based on other answers. Use **Repeatable links** for repeating related data.

{% hint style="info" %}
Choose the most specific field type available. It improves validation and data consistency.
{% endhint %}
