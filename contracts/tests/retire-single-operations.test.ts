import {expect} from 'chai';
import {ContractFunctionParameters, TokenAssociateTransaction, TransferTransaction} from '@hiero-ledger/sdk';
import {deployRetireSingleContract, deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {assertBalanceChange, createAccount, createFungibleToken, executeContract, executeContractRaw, getClient} from './helpers';

describe('RetireSingleToken - Retire Operations', function () {
    this.timeout(300000);

    before(async () => {
        await initializeClient();
        await deployWipeContract();
        await deployRetireSingleContract();
    });

    describe('Retire - Immediate, Exact Pool Amount', () => {
        let tokenId: string;
        let tokenAddress: string;
        let user: any;
        let userClient: any;

        before(async () => {
            const result = await createFungibleToken(
                sharedState.client!,
                'Retire Token Basic',
                'RTB',
                sharedState.wipeContractId
            );
            tokenId = result.tokenId;
            tokenAddress = result.address;

            const wiperParams = new ContractFunctionParameters()
                .addAddress(sharedState.retireSingleContractAddress)
                .addAddress(tokenAddress);

            await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addWiper',
                wiperParams,
                1000000
            );

            const poolAbi = ['function setPool(tuple(address token, int64 count)[], bool immediately)'];
            const poolArgs = [[{token: tokenAddress, count: 100}], true];

            await executeContractRaw(
                sharedState.client!,
                sharedState.retireSingleContractId,
                'setPool',
                poolAbi,
                poolArgs,
                2000000
            );

            user = await createAccount(sharedState.client!, 20);
            userClient = getClient();
            userClient.setOperator(user.accountId, user.privateKey);

            const associateTx = await new TokenAssociateTransaction()
                .setAccountId(user.accountId)
                .setTokenIds([tokenId])
                .freezeWith(sharedState.client!)
                .sign(user.privateKey);
            const associateResponse = await associateTx.execute(sharedState.client!);
            await associateResponse.getReceipt(sharedState.client!);

            const transferResponse = await new TransferTransaction()
                .addTokenTransfer(tokenId, sharedState.operatorId, -500)
                .addTokenTransfer(tokenId, user.accountId, 500)
                .freezeWith(sharedState.client!)
                .execute(sharedState.client!);
            await transferResponse.getReceipt(sharedState.client!);
        });

        after(() => {
            if (userClient) {
                userClient.close();
            }
        });

        it('should retire exact pool amount', async () => {
            const retireAmount = 100;
            const abi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
            const args = [[{token: tokenAddress, count: retireAmount, serials: []}]];

            await assertBalanceChange(
                sharedState.client!,
                user.accountId,
                tokenId,
                -retireAmount,
                async () => {
                    const {receipt, record} = await executeContractRaw(
                        userClient,
                        sharedState.retireSingleContractId,
                        'retire',
                        abi,
                        args,
                        3000000
                    );
                    expect(receipt.status.toString()).to.equal('SUCCESS');
                }
            );
        });
    });

    describe('RetireSingleToken - Validation Tests', () => {
        let tokenId: string;
        let tokenAddress: string;
        let user: any;
        let userClient: any;

        before(async () => {
            const result = await createFungibleToken(
                sharedState.client!,
                'Validation Token',
                'VAL',
                sharedState.wipeContractId
            );
            tokenId = result.tokenId;
            tokenAddress = result.address;

            const wiperParams = new ContractFunctionParameters()
                .addAddress(sharedState.retireSingleContractAddress)
                .addAddress(tokenAddress);

            await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addWiper',
                wiperParams,
                1000000
            );

            const poolAbi = ['function setPool(tuple(address token, int64 count)[], bool immediately)'];
            const poolArgs = [[{token: tokenAddress, count: 100}], true];

            await executeContractRaw(
                sharedState.client!,
                sharedState.retireSingleContractId,
                'setPool',
                poolAbi,
                poolArgs,
                2000000
            );

            user = await createAccount(sharedState.client!, 20);
            userClient = getClient();
            userClient.setOperator(user.accountId, user.privateKey);

            const associateTx = await new TokenAssociateTransaction()
                .setAccountId(user.accountId)
                .setTokenIds([tokenId])
                .freezeWith(sharedState.client!)
                .sign(user.privateKey);
            const associateResponse = await associateTx.execute(sharedState.client!);
            await associateResponse.getReceipt(sharedState.client!);

            const transferResponse = await new TransferTransaction()
                .addTokenTransfer(tokenId, sharedState.operatorId, -1000)
                .addTokenTransfer(tokenId, user.accountId, 1000)
                .freezeWith(sharedState.client!)
                .execute(sharedState.client!);
            await transferResponse.getReceipt(sharedState.client!);
        });

        after(() => {
            if (userClient) {
                userClient.close();
            }
        });

        it('should retire multiple of pool amount', async () => {
            const retireAmount = 300; // 3x pool amount
            const abi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
            const args = [[{token: tokenAddress, count: retireAmount, serials: []}]];

            await assertBalanceChange(
                sharedState.client!,
                user.accountId,
                tokenId,
                -retireAmount,
                async () => {
                    const {receipt, record} = await executeContractRaw(
                        userClient,
                        sharedState.retireSingleContractId,
                        'retire',
                        abi,
                        args,
                        3000000
                    );
                    expect(receipt.status.toString()).to.equal('SUCCESS');
                }
            );
        });

        it('should fail when retiring non-multiple of pool', async () => {
            const retireAmount = 150; // Not a multiple of 100

            const abi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
            const args = [[{token: tokenAddress, count: retireAmount, serials: []}]];

            try {
                await executeContractRaw(
                    userClient,
                    sharedState.retireSingleContractId,
                    'retire',
                    abi,
                    args,
                    3000000
                );
                expect.fail('Should have reverted with RETIRE_CHECK');
            } catch (error: any) {
                expect(error.message).to.satisfy((msg: string) =>
                    msg.includes('CONTRACT_REVERT_EXECUTED') || msg.includes('RETIRE_CHECK')
                );
            }
        });

        it('should fail when retiring less than pool', async () => {
            const retireAmount = 50; // Less than pool count of 100

            const abi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
            const args = [[{token: tokenAddress, count: retireAmount, serials: []}]];

            try {
                await executeContractRaw(
                    userClient,
                    sharedState.retireSingleContractId,
                    'retire',
                    abi,
                    args,
                    3000000
                );
                expect.fail('Should have reverted with RETIRE_CHECK');
            } catch (error: any) {
                expect(error.message).to.satisfy((msg: string) =>
                    msg.includes('CONTRACT_REVERT_EXECUTED') || msg.includes('RETIRE_CHECK')
                );
            }
        });

        it('should fail when user has NOT associated the token', async () => {
            const result = await createFungibleToken(sharedState.client!, 'Unassociated Token', 'UT');
            const unassociatedTokenAddress = result.address;

            const poolAbi = ['function setPool(tuple(address token, int64 count)[], bool immediately)'];
            const poolArgs = [[{token: unassociatedTokenAddress, count: 100}], true];
            await executeContractRaw(sharedState.client!, sharedState.retireSingleContractId, 'setPool', poolAbi, poolArgs, 2000000);

            const wiperParams = new ContractFunctionParameters().addAddress(sharedState.retireSingleContractAddress).addAddress(unassociatedTokenAddress);
            await executeContract(sharedState.client!, sharedState.wipeContractId, 'addWiper', wiperParams, 1000000);

            const abi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
            const args = [[{token: unassociatedTokenAddress, count: 100, serials: []}]];

            try {
                await executeContractRaw(
                    userClient,
                    sharedState.retireSingleContractId,
                    'retire',
                    abi,
                    args,
                    3000000
                );
                expect.fail('Should have failed because user did not associate the token');
            } catch (error: any) {
                expect(error.message).to.satisfy((msg: string) =>
                    msg.includes('CONTRACT_REVERT_EXECUTED') || msg.includes('TOKEN_NOT_ASSOCIATED_TO_ACCOUNT')
                );
            }
        });

        it('should fail when count is 0 for fungible token', async () => {
            const abi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
            const args = [[{token: tokenAddress, count: 0, serials: []}]];

            try {
                await executeContractRaw(
                    userClient,
                    sharedState.retireSingleContractId,
                    'retire',
                    abi,
                    args,
                    3000000
                );
                expect.fail('Should have failed with count 0');
            } catch (error: any) {
                expect(error.message).to.satisfy((msg: string) =>
                    msg.includes('CONTRACT_REVERT_EXECUTED') || msg.includes('RETIRE_CHECK')
                );
            }
        });
    });
});
