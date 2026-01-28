# Search Block using UI

1. [Step By Step Process](search-block-using-ui.md#id-1.-step-by-step-process)
2. [Demo Video](search-block-using-ui.md#id-2.-demo-video)

## 1. Step By Step Process

## 1. Search Example

Blocks of similar configuration can be searched by clicking on search icon with respect to the block as shown below:

<figure><img src="../../../../.gitbook/assets/image (10) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

## 2. Search Result

Search result displays all the policies and its blocks, which have same flow with respect to the base block search.

<figure><img src="../../../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (2).png" alt=""><figcaption></figcaption></figure>

### 2.1 Context

The search finds and displays the ranked list (most similar on top) of longest continuous matching sequences of blocks surrounding the target block (highlighted). The search considers all dimensions - next/previous, parent/child - to be of equal weight and thus ranks results by the number of blocks in the found ‘similar’ sequence.

<figure><img src="../../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

Additionally, the system compares the configuration of the blocks individually, and displays the %% of similarity to the right of each block in comparison with the corresponding blocks in the base policy.

### 2.2 Block Configuration

Right panel of the UI displays the configuration details of the currently selected block as shown below.

Clicking “Apply” button will transfer (or apply) the configuration of the found block to the corresponding base policy block.

{% hint style="info" %}
**Note:** Original settings of the base policy block will be lost if ‘Apply’ action is executed.
{% endhint %}

<figure><img src="../../../../.gitbook/assets/image (3) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (2).png" alt=""><figcaption></figcaption></figure>

### 2.3 Search Results Layout Display

Search results are displayed as folded groups by Policy (policy name is displayed in the group heading).

<figure><img src="../../../../.gitbook/assets/image (4) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

The results are sorted by (in the correct order):

1\. The number of the similar blocks in the matching sequence

2\. Cumulative similarity score (%%) of the blocks

<figure><img src="../../../../.gitbook/assets/image (5) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

## 2. Demo Video

[Youtube](https://youtu.be/qvmSPYIZx8k?si=1zSNjIFzzB0iVWCX\&t=108)
