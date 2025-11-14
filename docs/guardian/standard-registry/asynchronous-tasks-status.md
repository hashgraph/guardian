# Asynchronous Tasks Status

Worker Tasks tab displays active user's jobs performed asynchronously by the ‘worker’.

<figure><img src="../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (2) (1).png" alt=""><figcaption></figcaption></figure>

* Tasks can have the following status:
  * IN QUEUE - for task which are queued pending activation
  * PROCESSING - for task which are being performed (in progress)
  * COMPLETE - for tasks completed successfully
  * ERROR, Reason: \<some error> - for tasks which did not complete successfully, with the reason for failure.
* Failed tasks (in the ERROR state) can be manually retried or deleted.
* Tasks with COMPLETE status are cleared automatically 30 minutes after execution. The system assumes that tasks which have been in the PROCESSING for longer than an hour have stalled. Guardian automatically re-queues them for another attempt (with IN QUEUE state is displayed in the UI).

<figure><img src="../../.gitbook/assets/image (3) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

Architecturally, all errors (if any) are passed back to the Guardian process initiated the task (e.g. ‘publish schema’), which may result in the entire execution flow being rolled back. In the case of task manual restart and its successful completion the success status is passed back to the process originally initiated the task.
