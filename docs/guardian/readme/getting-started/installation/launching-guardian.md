# Launching Guardian

Once [http://localhost:3000](http://localhost:3000) is launched, we need to first generate Operator ID and Operator Key by clicking on Generate button as shown below:

<figure><img src="../../../../.gitbook/assets/image (18) (3).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
Note: If OPERATORID and OPERATOR KEY are added in .env file, we can click on Generate button directly without entering the details again in the UI.
{% endhint %}

Once you generated Operator ID and Operator Key, we can either click on Next or restore the Data, by selecting Restore Data from the Next button dropdown to setup Registry as shown below.

**Note**: Restore Data can be restored from Hedera if data is available for setting up the Registry.

<figure><img src="../../../../.gitbook/assets/image (21) (4).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Limitations on restoring the data:**\
1\. The state of policy workflows is not persisted onto any decentralised storage used by Guardian (such as IPFS and/or Hedera blockchain), and therefore not available for restoring. This means that while all artifacts produced by projects and their respective Policy workflows will be discovered and made accessible through the restored Guardian, the policy execution state will not be restored.

2\. Similarly, dynamic filled ‘options’ from VCs is not available at restoration time. This results in the limitation that some document grids will not be restored.
{% endhint %}

If Next is clicked, we need to manually setup the Registry or if Restore Data is clicked, it is filled automatically.

![](<../../../../.gitbook/assets/image (23) (4) (1).png>)

**Note:** The above fields in UI are mandatory only for this default Schema.

The Format of the Standard Registry Hello World Message is as follows:

```
{
	'type': 'Standard Registry',
	'status':'ISSUE'
	'id': '35c5d340-1a93-475d-9659-818bb77d45df',
	'did': 'did:hedera:testnet:vzN41A2bMhvYGhg7oCMoo5UAzQ6PCTq4VTQaNPE1uPG;hedera:testnet:tid=0.0.3423402',
	'action': 'Init',
	'topicId': '0.0.34234020',
	'lang': 'en-US',
    'attributes' : {
    	'ISIC': '051 062',
    	'geography' : 'USA CAN EU AUS',
    	'law': 'USA',
    	'tags': 'VERRA iREC'
  }
}
```

Where the list of `attributes` is extendable, and all attributes in it are **optional**.

#### Standard Registry Message Parameters

<table><thead><tr><th width="305.3333333333333">Parameter</th><th width="210">Purpose</th><th>Example</th></tr></thead><tbody><tr><td>type</td><td>Account Type</td><td>Standard Registry</td></tr><tr><td>status</td><td>status of the message</td><td>ISSUE</td></tr><tr><td>id</td><td>Message ID</td><td>35c5d340-1a93-475d-9659-818bb77d45df</td></tr><tr><td>did</td><td>Hedera DID</td><td>did:hedera:testnet:vzN41A2bMhvYGhg7oCMoo5UAzQ6PCTq4VTQaNPE1uPG</td></tr><tr><td>action</td><td>Action Type</td><td>Init</td></tr><tr><td>topicId</td><td>Standard Registry Message Topic ID</td><td>0.0.34234020</td></tr><tr><td>lang</td><td>Language</td><td>ENG</td></tr><tr><td>ISIC</td><td>ISIC code</td><td>051</td></tr><tr><td>geography</td><td>Location</td><td>USA</td></tr><tr><td>law</td><td>Country Law</td><td>USA</td></tr><tr><td>tags</td><td>Policy Tags</td><td>Verra, iREC</td></tr></tbody></table>

### INITIALIZATION\_TOPIC\_ID for different Hedera Networks

| Network    | INITIALIZATION\_TOPIC\_ID |
| ---------- | ------------------------- |
| Mainnet    | 0.0.1368856               |
| Testnet    | 0.0.1960                  |
| Previewnet | 0.0.10071                 |

### RETIRE\_CONTRACT\_FILE\_ID and WIPE\_CONTRACT\_FILE\_ID for different Hedera Networks

<table><thead><tr><th width="146">Network</th><th width="258">RETIRE_CONTRACT_FILE_ID</th><th>WIPE_CONTRACT_FILE_ID</th></tr></thead><tbody><tr><td>Mainnet</td><td>0.0.5344116</td><td>0.0.5344170</td></tr><tr><td>Testnet</td><td>0.0.2219</td><td>0.0.2235</td></tr></tbody></table>

### **How to Deploy Contracts on Mainnet using your own account:**

**Note:** If you wish you have an option to deploy your own instances (from an account that your organization controls - e.g. an ‘official’ account of your organization). We have created scripts for easy deployment you can use. In this case the following procedure needs to be followed:

1. Navigate to `./guardian-cli`folder.
2. Execute `npm install` followed by `npm run build` and `npm i -g`
3. Now the scripts are ready, and you can execute at the level of the `guardian-cli` folder
4. RETIRE contract deployment:

`guardian-cli deploy-contract-file ../contracts/retire/Retire.sol Retire {account} {key} -n {network}`

5. WIPE contract deployment:

`guardian-cli deploy-contract-file ../contracts/wipe/Wipe.sol Wipe {account} {key} -n {network}`

Where:

* `account` - accound ID in hedera
* `key` - its private key
* `network` - the target network (testnet, mainnet, previewnet), by default it uses testnet

The contract file identifier will be printed out in the terminal.
