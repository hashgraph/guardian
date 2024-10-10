# 🌎 Multi session consistency according to Environment

Content of data stored during Guardian operative sessions are discriminated according to the environment so that they are always consistent with the data persisted in Hedera Network. This is guaranteed for every operative data and messages exchanged between services that are persisted during different sessions. With the word “session” the time in which the Guardian platform is up and running with the same environment between two different start and stop of the Guardian system is intended. Persisted data during each session regarding transactions both towards Hedera net and or Guardian database are easily discriminated against in terms of environment and remain consistent with target Hedera network.

The persistence consistency is guaranteed leveraging the environment variable which describes the target Hedera Network(HEDERA\_NET) used together with the "Guardian ecosystem-environment" name itself (GUARDIAN\_ENV). These two environment attributes can be considered as a key of the other session parameters, in fact there is a functional dependency between the couple \<GuardianEnvironment, HederaNetwork> and the data written to the DB during a working session.

The implementation goes in the same line as Data level separation of concerns: in order to discriminate data stored to the database it has been added a different database per each Hedera network and Guardian environment. The new db names have the following format

```
<GUARDIAN_ENV>_<HEDERA_NET>_db_name.
```

<figure><img src="../../../.gitbook/assets/env123.png" alt=""><figcaption></figcaption></figure>

It has been introduced a new parameter PREUSED\_HEDERA\_NET, this parameter is intended to hold the target Hedera network that the system already started to notarized data to. This parameter is needed only to that Guardian Systems that needs to be upgraded from a release previous Multi-environment (2.13.0) after that the parameter will last in the configuration unchanged. For all the Guardian System that came up after the release 2.13.0 PREUSED\_HEDERA\_NET is unuseful and could be deleted. The PREUSED\_HEDERA\_NET can assume the values mainnet, testnet, previewnet, localnode.

To maintain the usage of the current database(previous of the upgrading) the GUARDIAN\_ENV parameter has to be left empty while the PREUSED\_HEDERA\_NET should be configured as stated before: PREUSED\_HEDERA\_NET has to be the reference to the HEDERA\_NET that was in usage before the upgrading. Configure this parameter with the same value as the previous target HEDERA\_NET.

Using this configuration the system will keep behaving in the same way as before of upgrading and the previous database names will be used for the data related to the currently used HEDERA\_NET and current Guardian environment. In this way the modification will not impact the current data but will be possible to define multiple different environments and hedera net target BC sharing the same infrastructure without data separation concerns.
