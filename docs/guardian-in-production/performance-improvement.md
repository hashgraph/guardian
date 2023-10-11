# Performance Improvement

This report aims to analyze and address the current inefficiencies in the token minting process. Specifically, the focus is on reducing the processing time required to mint a given quantity of tokens. The current scenario reveals that minting 1,000 tokens takes approximately 7 minutes, while processing 10,000 tokens consumes approximately 1 hour and 15 minutes. Additionally, the batch quantity processed is set to 10 out of 10. This report will explore potential solutions to optimize the minting process and enhance its efficiency.

Current Scenario

* **Minting 1,000 Tokens:**
* **Processing time: Approximately 7 minutes**
* **Minting 10,000 Tokens:**
* **Processing time: Approximately 1 hour and 15 minutes**
* **Batch quantity processed: 10 out of 10**

## Issues and Challenges

The current minting process suffers from the following issues and challenges:

1. Lengthy Processing Time: The time taken to mint both 1,000 and 10,000 tokens is significantly high, affecting the overall efficiency of the system.
2. Inconsistent Batch Processing: The current batch quantity processed is set to 10 out of 10, which suggests that the system might be configured to process a fixed batch size. This approach may result in suboptimal performance and limited scalability.

## Optimization Strategies

To address the aforementioned issues and enhance the efficiency of the minting process in a Node.js environment, the following strategies can be considered, including the utilization of Promise.all:

**Performance Evaluation:** Conduct a thorough evaluation of the existing Node.js infrastructure, including hardware and software components involved in the minting process. Identify potential bottlenecks and areas for improvement specific to Node.js.

**System Scaling:** Explore options for scaling up the Node.js infrastructure to handle larger minting volumes. This may involve upgrading hardware components, optimizing network configurations, and leveraging cloud-based services to distribute the processing load.

**Batch Size Optimization**: Reconsider the batch quantity processed during each minting operation, taking advantage of Promise.all. By using Promise.all in Node.js, it can concurrently process multiple tokens within a batch, significantly reducing overall processing time. Dynamically adjust the batch size based on system capabilities and workload, considering factors such as available memory and CPU resources.

**Parallel Processing:** Utilize Promise.all in Node.js to implement parallel processing techniques. With Promise.all, we can execute multiple asynchronous minting tasks concurrently, taking advantage of Node.js's event-driven, non-blocking architecture. This approach allows for efficient resource utilization and can significantly reduce processing time. Carefully design the codebase to leverage Promise.all effectively, considering error handling, load balancing, and concurrency limits.

**Asynchronous Operations:** Maximize the use of asynchronous operations in the Node.js codebase. By utilizing asynchronous APIs and non-blocking I/O operations, it can ensure that the minting process remains responsive and efficient. Avoid blocking or synchronous operations that may introduce unnecessary delays.

The topics above are indicated regardless of the kind of application which handles asynchronous tasks, process and so on.

## Code Analysis

At the time when this issue was addressed the current functionalities were not developed or at least improved. Nowadays, the mint process contains a lot of these best practices, many which were pointed out above. 1000 tokens are minted in 4 minutes because we can define an environment variable `BATCH_NFT_MINT_SIZE` that allows us to increase the number of tokens of each interaction.

According to the history, one month before this issue was created on github ([https://github.com/hashgraph/guardian/issues/1756](https://github.com/hashgraph/guardian/issues/1756)) a developer, Simonov Valery was working on this topic, available at that time on the release v2.9.0, 3e6b8f89e32bb1ab8b9d4a7a099dc7adb6c620cc.

Considering all strategies above, this particular operation **already covers the best practices to mint the tokens.**

However, some changes were applied in the main function which handles directly the minting actions, but no difference was found in terms of performance, according to [this draft PR](https://github.com/hashgraph/guardian/pull/2401/files) that uses Promise.allSettled vs Promise.all.

V2:\\

<figure><img src="https://lh4.googleusercontent.com/Jtf1mhdOt51sngHt0cYjCkx4v00ZqeN2LRu4A6x0bJNO9mq12moZwVG2S2kRyj23TbieMDpoQYDKgdcBVXGb8BOZMJWw4ju7l8tp9M9Ax91FdfawL7XbMxKI0i0V2bYszp_JqYHWm3AV3oF3NFlxDw8" alt=""><figcaption></figcaption></figure>

Current version:

<figure><img src="https://lh3.googleusercontent.com/sj0gOqV872K1mmoKltwSC8EPMfiA20ji6vUQ9tZBz-0Fi-aV749p1dqdFeZG0tskaytxl1cxIcifGOJxp3o1L_HPTVFiblVTB3rbyVutgL3iEun7eExQtYibcNApbUFs-sHbCKO00VukhqSlNRuYluM" alt=""><figcaption></figcaption></figure>

In both scenarios where BATCH\_NFT\_MINT\_SIZE=50, 1000 tokens were processed in 4 minutes.
