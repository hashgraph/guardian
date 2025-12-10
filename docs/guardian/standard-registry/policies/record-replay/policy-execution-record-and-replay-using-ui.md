# Policy execution record and replay using UI

1. [Step By Step Process](policy-execution-record-and-replay-using-ui.md#id-1.-step-by-step-process)
2. [Demo Video](policy-execution-record-and-replay-using-ui.md#id-2.-demo-video)

## 1. Step By Step Process

## 1. Record

The recording starts on the press of the ‘Record’ button.

{% hint style="info" %}
Note: It is strongly recommended to initiate recording at the very beginning of the policy execution, otherwise issues may be encountered at the ‘Replay’ stage.
{% endhint %}

![image1.png](<../../../../.gitbook/assets/0 (10) (1).png>)

### 1.1 Menu

<figure><img src="../../../../.gitbook/assets/1 (11) (1).png" alt=""><figcaption></figcaption></figure>

1. “Stop” - ends the recording and downloads the capture file.

![image3.png](<../../../../.gitbook/assets/2 (14) (1).png>)

2. Actions - shows/hides the list of recorded steps/events.

![image4.png](<../../../../.gitbook/assets/3 (10) (1).png>)

## 2. Replay

Pressing the ‘Run’ button will initiate replay of the previously recorded file.

![image5.png](<../../../../.gitbook/assets/4 (9) (1).png>)

![image6.png](<../../../../.gitbook/assets/5 (12) (1).png>)

### 2.1 Menu

<figure><img src="../../../../.gitbook/assets/6 (11) (1).png" alt=""><figcaption></figcaption></figure>

1. Fast Forward - quick transition to the next step (skipping the replay of the recorded pause).

![image8.png](<../../../../.gitbook/assets/7 (11) (1).png>)

2. Stop - ends the replay

![image9.png](<../../../../.gitbook/assets/8 (12) (1).png>)

3. Actions - shows/hides the list of replayed steps/events

![image10.png](<../../../../.gitbook/assets/9 (10) (1).png>)

### 2.2 Error

![image11.png](<../../../../.gitbook/assets/10 (11) (1).png>)

In the case of an error the following actions are possible

1. Retry - attempts to repeat the errored step/event

![image12.png](<../../../../.gitbook/assets/11 (9) (1).png>)

2. Skip - skips the errored step/event and execute the next one

![image13.png](<../../../../.gitbook/assets/12 (10) (1).png>)

### 2.3 Results

A summary dialogue is shown at the end of the replay. This dialogue contains the information about the tokens and document created during the policy execution, and the extend to which these artifacts are similar to those produced during the original execution (when the ‘records’ file was created).

![image14.png](<../../../../.gitbook/assets/13 (10) (1).png>)

The ‘details’ page shows detailed breakdown of differences between the corresponding documents or tokens.

![image15.png](<../../../../.gitbook/assets/14 (8) (1).png>)

## 2. Demo Video

[Youtube](https://youtu.be/WU_ntIM5SJA?si=MtY9JUD5mmVd4Gpp\&t=108)
