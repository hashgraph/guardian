###  Multi session consistency according to environment
###### \#1888, \#1696.

Content of data stored during Guardian operative sessions are discriminated according to the environment so that they are always consistent with the data persisted in Hedera Network. This is guaranteed for every operative data and messages exchanged between services that are persisted during different sessions. With the word “session” is intended the time in which the Guardian platform is up and running with the same environment between two different start and stop of the Guardian system.
Persisted data during each session regarding  transactions both towards Headera net and or Guardian database are easily discriminated in terms of environment  and remain consistent with target Hedera network. 

The persistence consistency is guaranteed leveraging the environment variable which describe the target Headera Network(HEDERA_NET) used  together with the "Guardian ecosystem-environment" name itself (GUARDIAN_ENV). 
This two environment attribute can be considered as a key of the other session parameters, infact there is a functional dependency between the couple  <GuardianEnvironment, HederaNetwork> and the data written to the DB during a working session.

The implementation goes in the same line as Data level separation of concerns: in order to discriminate data stored to the database it has been added a different database per each Hedera network and Guardian environment. The new db names have the following format  
	
	<GUARDIAN_ENV>_<HEDERA_NET>_db_name.

![persistence](https://user-images.githubusercontent.com/70752752/226858513-eb732e4e-ca6e-4263-aca7-3428568186d7.png)

It has been introduced a new parameter PREUSED_HEDERA_NET, this parameter is intended to hold the target Hedera network that the system already started to notarized data to. The PREUSED_HEDERA_NET can assume the values mainnet, testnet, previewnet, localnode.

To mantain the usage of the current databse the GUARDIAN_ENV parameter has to be left empty while the PREUSED_HEDERA_NET should be configured as stated before. 

Using this configuration the system will keep behaving in the same way as now and the original database names will be used for the data related to the currently used HEDERA_NET and current Guardian environment. In this way the modification will not impact the current data but will be possible to define multiple different environments and hedera net target BC sharing the same infrastructure without data separation concerns.
