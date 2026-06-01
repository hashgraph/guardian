import {expect} from 'chai';
import {ContractCallQuery, ContractFunctionParameters, PrivateKey} from '@hiero-ledger/sdk';
import {deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {createAccount, createFungibleToken, executeContract} from './helpers';

describe('Wipe Contract - Wiper Management', function () {
    this.timeout(300000);

    let wiperAccount: { accountId: string; privateKey: PrivateKey; address: string };
    let testTokenId: string;
    let testTokenAddress: string;

    before(async () => {
        await initializeClient();
        await deployWipeContract();

        wiperAccount = await createAccount(sharedState.client!, 10);

        const result = await createFungibleToken(sharedState.client!, 'Wiper Test Token', 'WTT');
        testTokenId = result.tokenId;
        testTokenAddress = result.address;
    });

    describe('Add Wiper for Token', () => {
        it('should add wiper for token', async () => {
            const params = new ContractFunctionParameters()
                .addAddress(wiperAccount.address)
                .addAddress(testTokenAddress);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addWiper',
                params,
                1000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');
        });

        it('should verify user is wiper', async () => {
            const {getClient} = await import('./helpers');

            const wiperClient = getClient();
            wiperClient.setOperator(
                wiperAccount.accountId,
                wiperAccount.privateKey
            );

            const query = new ContractCallQuery()
                .setContractId(sharedState.wipeContractId)
                .setGas(100000)
                .setFunction('isWiper', new ContractFunctionParameters().addAddress(testTokenAddress));

            const result = await query.execute(wiperClient);
            const isWiper = result.getBool(0);

            expect(isWiper).to.be.true;

            wiperClient.close();
        });
    });

    describe('Remove Wiper for Token', () => {
        it('should remove wiper for token', async () => {
            const params = new ContractFunctionParameters()
                .addAddress(wiperAccount.address)
                .addAddress(testTokenAddress);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'removeWiper',
                params,
                1000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');
        });

        it('should verify user is no longer wiper', async () => {
            const {getClient} = await import('./helpers');

            const wiperClient = getClient();
            wiperClient.setOperator(
                wiperAccount.accountId,
                wiperAccount.privateKey
            );

            const query = new ContractCallQuery()
                .setContractId(sharedState.wipeContractId)
                .setGas(100000)
                .setFunction('isWiper', new ContractFunctionParameters().addAddress(testTokenAddress));

            const result = await query.execute(wiperClient);
            const isWiper = result.getBool(0);

            expect(isWiper).to.be.false;

            wiperClient.close();
        });
    });

    describe('Non-Admin Cannot Add Wiper', () => {
        it('non-admin cannot add wiper', async () => {
            const {getClient} = await import('./helpers');

            const nonAdminAccount = await createAccount(sharedState.client!, 10);
            const nonAdminClient = getClient();
            nonAdminClient.setOperator(
                nonAdminAccount.accountId,
                nonAdminAccount.privateKey
            );

            const params = new ContractFunctionParameters()
                .addAddress(wiperAccount.address)
                .addAddress(testTokenAddress);

            try {
                await executeContract(
                    nonAdminClient,
                    sharedState.wipeContractId,
                    'addWiper',
                    params,
                    1000000
                );
                expect.fail('Should have reverted with NO_PERMISSIONS');
            } catch (error: any) {
                expect(error.message).to.include('CONTRACT_REVERT_EXECUTED');
            }

            nonAdminClient.close();
        });
    });
});
