# Policy Differentiation using UI

1. [Step By Step Process](policy-differentiation-using-ui.md#step-by-step-process)
2. [Demo Video](policy-differentiation-using-ui.md#demo-video)

## Step by Step Process

### 1. Start Comparison and choose policies:

To compare the policies, we need to click on **Compare** button in the policies tab as shown below:

<figure><img src="../../../../.gitbook/assets/Screenshot 2024-02-27 at 6.50.09 PM.png" alt=""><figcaption></figcaption></figure>

When Compare button is clicked, we get a pop up to select policies, which we want to perform comparison off.

<figure><img src="../../../../.gitbook/assets/image (529).png" alt=""><figcaption></figcaption></figure>

### 2. Comparison Result

We have several different sections in our comparison screen including filter parameters:

<figure><img src="../../../../.gitbook/assets/image (530).png" alt=""><figcaption></figcaption></figure>

Selected Policies are compared to the first Policy (displayed in the section on the left-hand side), the rest of the sections show the results of the ‘diffs’.

<figure><img src="../../../../.gitbook/assets/image (531).png" alt=""><figcaption></figcaption></figure>

### 2.1 Comparison Parameters

1. **Events:** configures if differences in events are reflected in the results of the comparison of blocks

| Parameter     | Definition                                                             |
| ------------- | ---------------------------------------------------------------------- |
| Don't compare | event differences are not reflected in the results of comparing blocks |
| All events    | event differences are reflected in the block comparison results        |

2\. **Properties :** configures how differences in Properties are reflected in the results of comparing blocks

| Parameter              | Definition                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Don't compare          | differences in properties do not have effect on the comparison of blocks, except the ‘tag’ and ‘block type’ which do. |
| Only simple properties | only simple Properties influence block comparison                                                                     |
| All properties         | all Properties are taken into consideration for block comparison                                                      |

3\. **Children** : configures how differences in child blocks influence the results of comparing parent blocks

| Parameter                            | Definition                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| Don't compare                        | when parents blocks are compared their child blocks are not taken into consideration |
| Only child blocks of the first level | only immediate children of parent blocks are compared when comparing parent blocks   |
| All children                         | all children of parent blocks are compared when comparing parent blocks              |

4\. **UUID** : configures if UUID and Hedera ID are taken into consideration when comparing blocks

| Parameter     | Definition                                                                                                                                                                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Don't compare | UUIDs of schemas, tokens, topics, etc and their Properties are not compared when blocks are compared                                                                                                                                                                                                |
| All UUID      | <p>all IDs are taken into consideration when comparing blocks<br><em>(for example when this option is chosen if all Properties of tokens in two Policies being compared are the same these tokens would still be considered different since they would by definition have different UUIDs)</em></p> |

### 2. Sections:

There are different sections in the comparison such as

1. **Main** – shows results of comparison of the main fields of the Policies
2. **Policy Roles** – shows results of comparison of the roles of Policies
3. **Policy Groups** – shows results of comparison of the groups
4. **Policy Topics** – shows results of comparison of dynamic topics
5. **Policy Tokens** – shows results of comparisons of dynamic tokens
6. **Policy Blocks** – shows results of comparisons of Policy block structures

We have several Display settings in Policy Blocks section:

<figure><img src="../../../../.gitbook/assets/image (532).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (533).png" alt=""><figcaption></figcaption></figure>

**Display Settings:** description and show/hide settings for each color/type of difference:

- **Icons:** In addition to colors, icons are displayed between the compared blocks to help users quickly identify the type of difference.
- **Color-blind mode:** A "Color-blind mode" toggle is available in the comparison toolbar to switch between the standard color scheme and an accessible color palette optimized for users with color vision deficiencies.

| Icon  | Color         | Color Blind Mode | Purpose                                                                                 |
| ----- | ------------- | ---------------- | --------------------------------------------------------------------------------------- |
|       | Green         | Blue             | blocks are equal, including their child blocks                                          |
| [≠]   | Green - Amber | Blue - Orange    | blocks are equal, but their child blocks are different                                  |
| ≈     | Amber         | Orange           | blocks are of the same type and are partially equal, there are some notable differences |
| + / - | Red           | Purple           | blocks are absent in the other Policy                                                   |

<figure><img src="../../../../.gitbook/assets/policy-compare-colorblind-mode-1.png" alt=""><figcaption></figcaption></figure>


Block comparison displays can be unfolded to display a detailed view of the block Properties.

<figure><img src="../../../../.gitbook/assets/image (534).png" alt=""><figcaption></figcaption></figure>

## Demo Video

[Youtube](https://www.youtube.com/watch?v=wdPjoAgWSuI\&list=PLnld0e1pwLhqdR0F9dusqILDww6uZywwR\&index=10)
