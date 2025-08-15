# TrustChain representation of token retirement

Guardian TrustChain represents token retirement operations as special card groups which are positioned following the ‘Token Minted’ card in the trust chain sequence. Each such group consists of a main card and several instance cards connected to it. Main card displays information about the token, the retirement contract used in the retirement operation, and the number of instances retired. Instance cards contain information about the “Instance ID” of the retired instances, retirement transaction IDs, user IDs which retired the tokens, and provide access to the retirement confirmation VC files.

<figure><img src="../../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (2).png" alt=""><figcaption></figcaption></figure>

The alternative trustchain view presents the retirement operation as an ordered (by time) sequence of cards featuring the corresponding Contract and User details.

<figure><img src="../../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

Guardian needs access to an Indexer instance for information to put on the cards. When Indexer is not available the information scope is reduced. In such cases Guardian trustchain may also lack information about retirements performed by 3rd party applications directly (without Guardian involvement).

<figure><img src="../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (2).png" alt=""><figcaption></figcaption></figure>

Guardian displays “No data from the indexer. Connect it and click Refresh for full details.” warning when Indexer access is not configured.
