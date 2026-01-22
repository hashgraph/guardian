import {expect} from 'chai';
import {ContractCallQuery, ContractFunctionParameters, PrivateKey} from '@hiero-ledger/sdk';
import {deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {createAccount, createFungibleToken, executeContract} from './helpers';

describe('Wipe Contract - Request System', function () {
    this.timeout(300000);

    let userAccount: { accountId: string; privateKey: PrivateKey; address: string };
    let testTokenAddress: string;

    before(async () => {
        await initializeClient();
        await deployWipeContract();

        userAccount = await createAccount(sharedState.client!, 10);

        const result = await createFungibleToken(sharedState.client!, 'Request Test Token', 'RTT');
        testTokenAddress = result.address;
    });

    describe('Enable/Disable Requests', () => {
        it('should disable requests', async () => {
            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'disableRequests',
                new ContractFunctionParameters(),
                1000000
            );
            expect(receipt.status.toString()).to.equal('SUCCESS');

            const {getClient} = await import('./helpers');
            const userClient = getClient();
            userClient.setOperator(userAccount.accountId, userAccount.privateKey);

            try {
                const params = new ContractFunctionParameters().addAddress(testTokenAddress);
                await executeContract(
                    userClient,
                    sharedState.wipeContractId,
                    'requestWiper',
                    params,
                    1000000
                );
                expect.fail('Should have reverted with REQUESTS_DISABLED');
            } catch (error: any) {
                expect(error.message).to.include('CONTRACT_REVERT_EXECUTED');
            } finally {
                userClient.close();
            }
        });

        it('should enable requests', async () => {
            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'enableRequests',
                new ContractFunctionParameters(),
                1000000
            );
            expect(receipt.status.toString()).to.equal('SUCCESS');

            const {getClient} = await import('./helpers');
            const userClient = getClient();
            userClient.setOperator(userAccount.accountId, userAccount.privateKey);

            const params = new ContractFunctionParameters().addAddress(testTokenAddress);
            const {receipt: userReceipt} = await executeContract(
                userClient,
                sharedState.wipeContractId,
                'requestWiper',
                params,
                2000000
            );
            expect(userReceipt.status.toString()).to.equal('SUCCESS');

            userClient.close();
        });
    });

    describe('Approve/Reject/Clear Requests', () => {
        let secondTokenAddress: string;

        before(async () => {
            const result = await createFungibleToken(sharedState.client!, 'Request Test Token 2', 'RTT2');
            secondTokenAddress = result.address;
        });

        it('should approve a request', async () => {
            const params = new ContractFunctionParameters()
                .addAddress(userAccount.address)
                .addAddress(testTokenAddress);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'approve',
                params,
                2000000
            );
            expect(receipt.status.toString()).to.equal('SUCCESS');

            const query = new ContractCallQuery()
                .setContractId(sharedState.wipeContractId)
                .setGas(100000)
                .setFunction('isWiper', new ContractFunctionParameters().addAddress(testTokenAddress));

            const {getClient} = await import('./helpers');
            const userClient = getClient();
            userClient.setOperator(userAccount.accountId, userAccount.privateKey);

            const result = await query.execute(userClient);
            expect(result.getBool(0)).to.be.true;
            userClient.close();
        });

        it('should reject a request', async () => {
            const {getClient} = await import('./helpers');
            const userClient = getClient();
            userClient.setOperator(userAccount.accountId, userAccount.privateKey);

            await executeContract(
                userClient,
                sharedState.wipeContractId,
                'requestWiper',
                new ContractFunctionParameters().addAddress(secondTokenAddress),
                2000000
            );

            const params = new ContractFunctionParameters()
                .addAddress(userAccount.address)
                .addAddress(secondTokenAddress)
                .addBool(false);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'reject',
                params,
                2000000
            );
            expect(receipt.status.toString()).to.equal('SUCCESS');

            const query = new ContractCallQuery()
                .setContractId(sharedState.wipeContractId)
                .setGas(100000)
                .setFunction('isWiper', new ContractFunctionParameters().addAddress(secondTokenAddress));

            const result = await query.execute(userClient);
            expect(result.getBool(0)).to.be.false;
            userClient.close();
        });

        it('should clear all user requests', async () => {
            const {getClient} = await import('./helpers');
            const userClient = getClient();
            userClient.setOperator(userAccount.accountId, userAccount.privateKey);

            await executeContract(
                userClient,
                sharedState.wipeContractId,
                'requestWiper',
                new ContractFunctionParameters().addAddress(secondTokenAddress),
                2000000
            );

            const params = new ContractFunctionParameters()
                .addAddress(userAccount.address);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'clear',
                params,
                2000000
            );
            expect(receipt.status.toString()).to.equal('SUCCESS');

            userClient.close();
        });
    });
});
