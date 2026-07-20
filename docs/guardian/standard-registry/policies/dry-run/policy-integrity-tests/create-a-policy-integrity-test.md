# Create a Policy Integrity Test

Create a Policy Integrity Test when you want to test that given inputs will produce known outputs. This is useful for example during calculation engine steps where a user may submit input data which are then used by mathematical results included in output documents. These outputs are often part of policy validation and testing. By recording this, the test can later be attached to a policy which can skip manual validation in the future.&#x20;

#### Prerequisites

* Introduced in Guardian 3.6.0

#### Steps

1. Set your policy to be in dry run mode
2. Open the policy and start recording
3. Navigate within the policy to a form that includes inputs you want to capture as part of your test
4. Click the 'Test' drop down to open the menu and check the box to capture the input of the next form submission as part of the test
5. Submit the form
6. Inspect the 'Test' drop down to see which verifiable credential document outputs have been created
7. Navigate within the UI or click the view document link in the drop down to inspect the values of the document to confirm that they are correct
8. Open to the 'Test' drop drop and check the box beside the document output that you confirmed as correct and want to include in the test
9. Repeat to include additional form submissions and/or document outputs
10. Stop the recording&#x20;
11. Enter a title for the record file and include a description that describes what is included in this test

#### Result

You now have saved a policy integrity test record file.&#x20;

#### Troubleshooting

None

#### Related

* [.](./ "mention")



{% embed url="https://www.loom.com/share/5f0d1f86ae7947698f63827e57aced68" %}



## Related issues

* [https://github.com/hashgraph/guardian/issues/5910](https://github.com/hashgraph/guardian/issues/5910)
* [https://github.com/hashgraph/guardian/issues/5911](https://github.com/hashgraph/guardian/issues/5911)
* [https://github.com/hashgraph/guardian/issues/5912](https://github.com/hashgraph/guardian/issues/5912)
* [https://github.com/hashgraph/guardian/issues/5913](https://github.com/hashgraph/guardian/issues/5913)
* [https://github.com/hashgraph/guardian/issues/6002](https://github.com/hashgraph/guardian/issues/6002)
* [https://github.com/hashgraph/guardian/issues/6020](https://github.com/hashgraph/guardian/issues/6020)
* [https://github.com/hashgraph/guardian/issues/6021](https://github.com/hashgraph/guardian/issues/6021)
