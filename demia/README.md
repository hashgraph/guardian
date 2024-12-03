# Demia Integration 

The following instructions will assist you in integrating Guardian into your Demia project. The prerequisite for this 
integration is to have an account set up within the Demia platform. These instructions outline how to connect Demia and 
Guardian in a testnet environment (meaning both the Guardian and Demia Application are operating on their respective testnets).

### Testnet Constants

*Hedera Guardian Url*: http://guardian.demia-nodes.net
*Demia Portal Url*: https://demo.demia.net 


*VVB account*:
```
Username: VVB 
Password: test
```

*Standard Registry account*:
```
Username: StandardRegistry
Password: test
```

## Integration Steps
1. [Create a new account on the Demia platform](DemiaSetup.md).
2. [Create a new account on the Guardian platform](GuardianSetup.md).
3. Integrate Guardian into Demia


## Expand on existing Policies
This example policy provides a baseline requirement for fields necessary to demonstrate connection
between the Demia ecosystem and the Guardian ecosystem. You can take the schema present for the Demia 
Report in the policy and extend other existing policies to include these fields to allow for granular 
data referencing from within the Demia zero knowledge proof data network. 