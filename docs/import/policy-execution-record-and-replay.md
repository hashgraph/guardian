# Policy execution record and replay

**Record**

**“**Record/Run” options provide facilities to capture policy execution events, save and/or export them in a records file, which can then be replayed in the context of a different policy.

Note: this functionality currently works in a Dry Run mode only.

1. **Record**

The recording starts on the press of the ‘Record’ button.

Important note: it is strongly recommended to initiate recording at the very beginning of the policy execution, otherwise issues may be encountered at the ‘Replay’ stage.

![image1.png](<../.gitbook/assets/0 (10).png>)

*
  1. **Menu**

![image2.png](<../.gitbook/assets/1 (11).png>)

1. “Stop” - ends the recoding and downloads the capture file.

![image3.png](<../.gitbook/assets/2 (14).png>)

1. Actions shows/hides the list of recorded steps/events.

![image4.png](<../.gitbook/assets/3 (10).png>)

1. **Replay**

Pressing the ‘Run’ button will initiate replay of the previously recorded file.

![image5.png](<../.gitbook/assets/4 (9).png>)

![image6.png](<../.gitbook/assets/5 (12).png>)

*
  1. **Menu**

![image7.png](<../.gitbook/assets/6 (11).png>)

1. Fast Forward - quick transition to the next step (skipping the replay of the recorded pause).

![image8.png](<../.gitbook/assets/7 (11).png>)

1. Stop - ends the replay

![image9.png](<../.gitbook/assets/8 (12).png>)

1. Actions - shows/hides the list of replayed steps/events

![image10.png](<../.gitbook/assets/9 (10).png>)

*
  1. **Error**

![image11.png](<../.gitbook/assets/10 (11).png>)

In the case of an error the following actions are possible

1. Retry - attempt to repeat the errored step/event

![image12.png](<../.gitbook/assets/11 (9).png>)

1. Skip - skip the errored step/event and execute the next one

![image13.png](<../.gitbook/assets/12 (10).png>)

*
  1. **Results**

A summary dialogue is shown at the end of the replay. This dialogue contains the information about the tokens and document created during the policy execution, and the extend to which these artifacts are similar to those produced during the original execution (when the ‘records’ file was created).

![image14.png](<../.gitbook/assets/13 (10).png>)

The ‘details’ page shows detailed breakdown of differences between the corresponding documents or tokens.

![image15.png](<../.gitbook/assets/14 (8).png>)

1. **API**

Get _/record/{policyId}/status_ – return current status for the selected policy (recording or replay is in progress)

Post _/record/{policyId}/recording/start_ – begin the recording for the selected policy

Post _/record/{policyId}/recording/stop_ – end the recording for the selected policy

Get _/record/{policyId}/recording/actions_ – list of the recorded policies

Post _/record/{policyId}/running/start_ – replay of the selected file for the selected policy

Post _/record/{policyId}/running/stop_ – stop replay

Get _/record/{policyId}/running/results_ – summary result of the replay

Get _/record/{policyId}/running/details_ – detailed comparison of the replay and the original results

Post _/record/{policyId}/running/fast-forward_ – quick transition to the next step/event

Post _/record/{policyId}/running/retry_ – attempt to retry the step/event - to be used in the case of prior error

Post _/record/{policyId}/running/skip_ – attempt to ‘step over’ (i.e. skip) the step/event - to be used in the case of prior error

**Schemas**

Changes in the Schemas menu

![image16.png](<../.gitbook/assets/15 (10).png>)

1. Example – the facility to add example values for the schema fields

![image17.png](<../.gitbook/assets/16 (8).png>)

1. Preview – show a preview of how users will see the policy form during the execution of the policy

![image18.png](<../.gitbook/assets/17 (10).png>)

In Dry Run mode it is possible to quickly fill in the fields using the provided example values from the schema. This feature is most useful for testing/demonstrations or for experimenting and learning Guardian capabilities.

![image19.png](<../.gitbook/assets/18 (7).png>)
