import {expect} from 'chai';
import {ContractFunctionParameters, TokenAssociateTransaction, TransferTransaction} from '@hashgraph/sdk';
import {deployRetireSingleContract, deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {assertBalanceChange, createAccount, createFungibleToken, executeContract, executeContractRaw, getClient, getTokenBalance, parseLogs} from './helpers';

describe('RetireSingleToken - Request Flow', function () {
    this.timeout(300000);

    let tokenId: string;
    let tokenAddress: string;
    let user: any;
    let userClient: any;

    before(async () => {
        await initializeClient();
        await deployWipeContract();
        await deployRetireSingleContract();

        const result = await createFungibleToken(
            sharedState.client!,
            'Request Flow Token',
            'RFT',
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
        const poolArgs = [[{token: tokenAddress, count: 100}], false];

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
        await (await associateTx.execute(sharedState.client!)).getReceipt(sharedState.client!);

        const transferResponse = await new TransferTransaction()
            .addTokenTransfer(tokenId, sharedState.operatorId, -500)
            .addTokenTransfer(tokenId, user.accountId, 500)
            .execute(sharedState.client!);
        await transferResponse.getReceipt(sharedState.client!);
    });

    after(() => {
        if (userClient) {
            userClient.close();
        }
    });

    it('should create a retire request when immediately=false', async () => {
        const retireAmount = 100;

        await assertBalanceChange(
            sharedState.client!,
            user.accountId,
            tokenId,
            0, // Balance should not change when creating a request
            async () => {
                const abi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
                const args = [[{token: tokenAddress, count: retireAmount, serials: []}]];

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

    it('should approve retire request by ADMIN', async () => {
        const retireAmount = 100;

        await assertBalanceChange(
            sharedState.client!,
            user.accountId,
            tokenId,
            -retireAmount,
            async () => {
                const abi = ['function approveRetire(address usr, tuple(address token, int64 count, int64[] serials)[])'];
                const args = [user.address, [{token: tokenAddress, count: retireAmount, serials: []}]];

                const {receipt, record} = await executeContractRaw(
                    sharedState.client!,
                    sharedState.retireSingleContractId,
                    'approveRetire',
                    abi,
                    args,
                    4000000
                );

                expect(receipt.status.toString()).to.equal('SUCCESS');
            }
        );
    });

    it('should fail when approving with wrong amount', async () => {
        const retireAbi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
        const retireArgs = [[{token: tokenAddress, count: 100, serials: []}]];
        await executeContractRaw(userClient, sharedState.retireSingleContractId, 'retire', retireAbi, retireArgs, 3000000);

        const approveAbi = ['function approveRetire(address usr, tuple(address token, int64 count, int64[] serials)[])'];
        const approveArgs = [user.address, [{token: tokenAddress, count: 200, serials: []}]];

        try {
            await executeContractRaw(
                sharedState.client!,
                sharedState.retireSingleContractId,
                'approveRetire',
                approveAbi,
                approveArgs,
                4000000
            );
            expect.fail('Should have reverted due to hash mismatch');
        } catch (error: any) {
            expect(error.message).to.satisfy((msg: string) => 
                msg.includes('CONTRACT_REVERT_EXECUTED') || msg.includes('RETIRE_CHECK')
            );
        }
    });

    it('should fail to approve by non-admin', async () => {
        const retireAbi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
        const retireArgs = [[{token: tokenAddress, count: 100, serials: []}]];
        await executeContractRaw(userClient, sharedState.retireSingleContractId, 'retire', retireAbi, retireArgs, 3000000);

        const approveAbi = ['function approveRetire(address usr, tuple(address token, int64 count, int64[] serials)[])'];
        const approveArgs = [user.address, [{token: tokenAddress, count: 100, serials: []}]];

        try {
            await executeContractRaw(
                userClient,
                sharedState.retireSingleContractId,
                'approveRetire',
                approveAbi,
                approveArgs,
                4000000
            );
            expect.fail('Should have reverted with NO_PERMISSIONS');
        } catch (error: any) {
            expect(error.message).to.satisfy((msg: string) => 
                msg.includes('CONTRACT_REVERT_EXECUTED') || msg.includes('NO_PERMISSIONS')
            );
        }
    });

    it('should fail to approve same request twice (double spend)', async () => {
        const approveAbi = ['function approveRetire(address usr, tuple(address token, int64 count, int64[] serials)[])'];
        const approveArgs = [user.address, [{token: tokenAddress, count: 100, serials: []}]];

        await executeContractRaw(
            sharedState.client!,
            sharedState.retireSingleContractId,
            'approveRetire',
            approveAbi,
            approveArgs,
            4000000
        );

        try {
            await executeContractRaw(
                sharedState.client!,
                sharedState.retireSingleContractId,
                'approveRetire',
                approveAbi,
                approveArgs,
                4000000
            );
            expect.fail('Should have reverted because request was already removed');
        } catch (error: any) {
            expect(error.message).to.satisfy((msg: string) => 
                msg.includes('CONTRACT_REVERT_EXECUTED')
            );
        }
    });
});
