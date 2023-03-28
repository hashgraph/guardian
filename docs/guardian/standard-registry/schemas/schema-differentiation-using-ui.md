# 💻 Schema Differentiation using UI

We can compare two schemas by following some steps as follows:

## 1. Start Comparison by choosing Schemas:

We click on **Compare** button present in Schemas tab as shown below:

<figure><img src="../../../.gitbook/assets/image (10) (1) (3).png" alt=""><figcaption></figcaption></figure>

## 2. Comparison View

### 2.1 Parameters

**UUID** : configures whether differences in UUIDs and Header IDs are taken into consideration when comparing blocks

| Parameter     | Definition                                                                                                                                                                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Don't compare | UUIDs and Header IDs are not involved in comparison of the blocks and their Properties.                                                                                                                                                                                                                                            |
| All UUID      | <p>Differences in UUIDs and Header IDs are taken into consideration when comparing blocks and their Properties.<br><em>(For example, when two schemas are exactly the same in every property they will still be considered as different due to differences in the values of IDs which by definition are always different)</em></p> |

## 2.2 Sections

1\. **Main** – comparison of the main fields of schemas.

2\. **Schema Fields** – comparison results of the schema fields.

<figure><img src="../../../.gitbook/assets/image (1) (1) (3).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (24) (2).png" alt=""><figcaption></figcaption></figure>

**Display settings** _–_ description and show/hide settings for each color/type of difference

| Color          | Purpose                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Green          | fields are identical                                                                                                                         |
| Green -  Amber | when fields are embedded schemas, and these schemas are identical. The fields themselves are not different because their UUIDs are different |
| Amber          | fields are partially equal                                                                                                                   |
| Red            | fields are absent in the other Policy                                                                                                        |

Field comparison displays can be unfolded to display a detailed view of the block Properties.
