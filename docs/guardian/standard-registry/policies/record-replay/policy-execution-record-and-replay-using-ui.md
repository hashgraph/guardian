# 💻 Policy execution record and replay using UI

## 1. Record

The recording starts on the press of the ‘Record’ button.

{% hint style="info" %}
Note: It is strongly recommended to initiate recording at the very beginning of the policy execution, otherwise issues may be encountered at the ‘Replay’ stage.
{% endhint %}

![image1.png](<../../../../.gitbook/assets/0 (11).png>)

### 1.1 Menu

<figure><img src="../../../../.gitbook/assets/1 (13).png" alt=""><figcaption></figcaption></figure>

1. “Stop” - ends the recording and downloads the capture file.

![image3.png](<../../../../.gitbook/assets/2 (15).png>)

2. Actions - shows/hides the list of recorded steps/events.

![image4.png](<../../../../.gitbook/assets/3 (12).png>)

## 2. Replay

Pressing the ‘Run’ button will initiate replay of the previously recorded file.

![image5.png](<../../../../.gitbook/assets/4 (10).png>)

![image6.png](<../../../../.gitbook/assets/5 (13).png>)

### 2.1 Menu

<figure><img src="../../../../.gitbook/assets/6 (12).png" alt=""><figcaption></figcaption></figure>

1. Fast Forward - quick transition to the next step (skipping the replay of the recorded pause).

![image8.png](<../../../../.gitbook/assets/7 (12).png>)

2. Stop - ends the replay

![image9.png](<../../../../.gitbook/assets/8 (13).png>)

3. Actions - shows/hides the list of replayed steps/events

![image10.png](<../../../../.gitbook/assets/9 (11).png>)

### 2.2 Error

![image11.png](<../../../../.gitbook/assets/10 (12).png>)

In the case of an error the following actions are possible

1. Retry - attempts to repeat the errored step/event

![image12.png](<../../../../.gitbook/assets/11 (11).png>)

2. Skip - skips the errored step/event and execute the next one

![image13.png](<../../../../.gitbook/assets/12 (11).png>)

### 2.3 Results

A summary dialogue is shown at the end of the replay. This dialogue contains the information about the tokens and document created during the policy execution, and the extend to which these artifacts are similar to those produced during the original execution (when the ‘records’ file was created).

![image14.png](<../../../../.gitbook/assets/13 (11).png>)

The ‘details’ page shows detailed breakdown of differences between the corresponding documents or tokens.

![image15.png](<../../../../.gitbook/assets/14 (9).png>)

**Schemas**

Changes in the Schemas menu

![image16.png](<../../../../.gitbook/assets/15 (11).png>)

1. Example – the facility to add example values for the schema fields

![image17.png](<../../../../.gitbook/assets/16 (10).png>)

1. Preview – show a preview of how users will see the policy form during the execution of the policy

![image18.png](<../../../../.gitbook/assets/17 (11).png>)

In Dry Run mode it is possible to quickly fill in the fields using the provided example values from the schema. This feature is most useful for testing/demonstrations or for experimenting and learning Guardian capabilities.

![image19.png](<../../../../.gitbook/assets/18 (8).png>)
