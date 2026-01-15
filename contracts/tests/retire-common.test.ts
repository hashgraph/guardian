import {expect} from 'chai';
import {ContractCallQuery, ContractFunctionParameters} from '@hiero-ledger/sdk';
import {deployRetireSingleContract, deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {createAccount, createFungibleToken, executeContract, executeContractRaw, getClient} from './helpers';

describe('Retire - Common Operations', function () {
    this.timeout(300000);

    let token1Address: string;
    let token2Address: string;

    before(async () => {
        await initializeClient();
        await deployWipeContract();
        await deployRetireSingleContract();

        const result1 = await createFungibleToken(sharedState.client!, 'Common Test Token 1', 'CTT1', sharedState.wipeContractId);
        token1Address = result1.address;

        const result2 = await createFungibleToken(sharedState.client!, 'Common Test Token 2', 'CTT2', sharedState.wipeContractId);
        token2Address = result2.address;
    });

    describe('CanWipe Checks', () => {
        it('should return true when Retire contract is wiper for the token', async () => {
            const params = new ContractFunctionParameters()
                .addAddress(sharedState.retireSingleContractAddress)
                .addAddress(token1Address);

            await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addWiper',
                params,
                1000000
            );

            const abi = ['function canWipe(address[] tokens) returns (bool)'];
            const args = [[token1Address]];

            const query = new ContractCallQuery()
                .setContractId(sharedState.retireSingleContractId)
                .setGas(200000)
                .setFunction('canWipe', new ContractFunctionParameters().addAddressArray([token1Address]));

            const result = await query.execute(sharedState.client!);
            expect(result.getBool(0)).to.be.true;
        });

        it('should return false when Retire contract is NOT wiper for the token', async () => {
            const query = new ContractCallQuery()
                .setContractId(sharedState.retireSingleContractId)
                .setGas(200000)
                .setFunction('canWipe', new ContractFunctionParameters().addAddressArray([token2Address]));

            const result = await query.execute(sharedState.client!);
            expect(result.getBool(0)).to.be.false;
        });

        it('should return false if one of the tokens is not wiped', async () => {
            const query = new ContractCallQuery()
                .setContractId(sharedState.retireSingleContractId)
                .setGas(200000)
                .setFunction('canWipe', new ContractFunctionParameters().addAddressArray([token1Address, token2Address]));

            const result = await query.execute(sharedState.client!);
            expect(result.getBool(0)).to.be.false;
        });
    });

    describe('Cancel Retire Request', () => {
        it('should cancel retire request', async () => {
            const user = await createAccount(sharedState.client!, 10);
            const userClient = getClient();
            userClient.setOperator(user.accountId, user.privateKey);

            const poolAbi = ['function setPool(tuple(address token, int64 count)[], bool immediately)'];
            const poolArgs = [[{token: token1Address, count: 100}], false]; // immediately = false

            await executeContractRaw(
                sharedState.client!,
                sharedState.retireSingleContractId,
                'setPool',
                poolAbi,
                poolArgs,
                2000000
            );

            const retireAbi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
            const retireArgs = [[{token: token1Address, count: 100, serials: []}]];

            await executeContractRaw(
                userClient,
                sharedState.retireSingleContractId,
                'retire',
                retireAbi,
                retireArgs,
                3000000
            );

            const cancelAbi = ['function cancelRetireRequest(address[] tokens)'];
            const cancelArgs = [[token1Address]];

            const {receipt, record} = await executeContractRaw(
                userClient,
                sharedState.retireSingleContractId,
                'cancelRetireRequest',
                cancelAbi,
                cancelArgs,
                1000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');

            userClient.close();
        });
    });
});
