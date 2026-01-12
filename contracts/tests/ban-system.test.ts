import {expect} from 'chai';
import {ContractCallQuery, ContractFunctionParameters, PrivateKey} from '@hashgraph/sdk';
import {deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {createAccount, createFungibleToken, executeContract} from './helpers';

describe('Wipe Contract - Ban System', function () {
    this.timeout(300000);

    let bannedUserAccount: { accountId: string; privateKey: PrivateKey; address: string };
    let testTokenId: string;
    let testTokenAddress: string;

    before(async () => {
        await initializeClient();
        await deployWipeContract();

        bannedUserAccount = await createAccount(sharedState.client!, 10);

        const result = await createFungibleToken(
            sharedState.client!,
            'Ban Test Token',
            'BTT',
            sharedState.wipeContractId
        );
        testTokenId = result.tokenId;
        testTokenAddress = result.address;
    });

    describe('Ban User', () => {
        it('should ban user', async () => {
            const params = new ContractFunctionParameters()
                .addAddress(bannedUserAccount.address);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'ban',
                params,
                1000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');
        });

        it('banned user cannot call isNotBanned function', async () => {
            const {getClient} = await import('./helpers');

            const bannedClient = getClient();
            bannedClient.setOperator(
                bannedUserAccount.accountId,
                bannedUserAccount.privateKey
            );

            const addWiperParams = new ContractFunctionParameters()
                .addAddress(bannedUserAccount.address)
                .addAddress(testTokenAddress);

            await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addWiper',
                addWiperParams,
                1000000
            );

            const wipeParams = new ContractFunctionParameters()
                .addAddress(testTokenAddress)
                .addAddress(bannedUserAccount.address)
                .addInt64(100);

            try {
                await executeContract(
                    bannedClient,
                    sharedState.wipeContractId,
                    'wipe',
                    wipeParams,
                    2000000
                );
                expect.fail('Should have reverted with BANNED');
            } catch (error: any) {
                expect(error.message).to.satisfy((msg: string) =>
                    msg.includes('CONTRACT_REVERT_EXECUTED') || msg.includes('BANNED')
                );
            }

            bannedClient.close();
        });
    });

    describe('Unban User', () => {
        it('should unban user', async () => {
            const params = new ContractFunctionParameters()
                .addAddress(bannedUserAccount.address);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'unban',
                params,
                1000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');
        });

        it('unbanned user can call functions', async () => {
            const {getClient} = await import('./helpers');

            const unbannedClient = getClient();
            unbannedClient.setOperator(
                bannedUserAccount.accountId,
                bannedUserAccount.privateKey
            );

            const query = new ContractCallQuery()
                .setContractId(sharedState.wipeContractId)
                .setGas(100000)
                .setFunction('banned');

            const result = await query.execute(unbannedClient);
            const isBanned = result.getBool(0);

            expect(isBanned).to.be.false;

            unbannedClient.close();
        });
    });

    describe('Cannot Ban Already Banned', () => {
        it('cannot ban already banned user', async () => {
            let params = new ContractFunctionParameters()
                .addAddress(bannedUserAccount.address);

            await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'ban',
                params,
                1000000
            );

            params = new ContractFunctionParameters()
                .addAddress(bannedUserAccount.address);

            try {
                await executeContract(
                    sharedState.client!,
                    sharedState.wipeContractId,
                    'ban',
                    params,
                    1000000
                );
                expect.fail('Should have reverted with ALREADY_BANNED');
            } catch (error: any) {
                expect(error.message).to.satisfy((msg: string) =>
                    msg.includes('CONTRACT_REVERT_EXECUTED') || msg.includes('ALREADY_BANNED')
                );
            }

            params = new ContractFunctionParameters()
                .addAddress(bannedUserAccount.address);

            await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'unban',
                params,
                1000000
            );
        });
    });

    describe('Cannot Unban Not Banned', () => {
        it('cannot unban not banned user', async () => {
            const notBannedAccount = await createAccount(sharedState.client!, 10);

            const params = new ContractFunctionParameters()
                .addAddress(notBannedAccount.address);

            try {
                await executeContract(
                    sharedState.client!,
                    sharedState.wipeContractId,
                    'unban',
                    params,
                    1000000
                );
                expect.fail('Should have reverted with NOT_BANNED');
            } catch (error: any) {
                expect(error.message).to.satisfy((msg: string) =>
                    msg.includes('CONTRACT_REVERT_EXECUTED') || msg.includes('NOT_BANNED')
                );
            }
        });
    });

    describe('Cannot Ban Contract Itself', () => {
        it('should fail when trying to ban the contract itself', async () => {
            const params = new ContractFunctionParameters()
                .addAddress(sharedState.wipeContractAddress);

            try {
                await executeContract(
                    sharedState.client!,
                    sharedState.wipeContractId,
                    'ban',
                    params,
                    1000000
                );
                expect.fail('Should have reverted');
            } catch (error: any) {
                expect(error.message).to.include('CONTRACT_REVERT_EXECUTED');
            }
        });
    });
});
