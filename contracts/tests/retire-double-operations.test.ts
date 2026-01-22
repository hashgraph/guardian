import {expect} from 'chai';
import {ContractFunctionParameters, TokenAssociateTransaction, TransferTransaction} from '@hiero-ledger/sdk';
import {deployRetireDoubleContract, deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {createAccount, createFungibleToken, executeContract, executeContractRaw, getClient, getTokenBalance} from './helpers';

describe('RetireDoubleToken - Retire Operations', function () {
    this.timeout(300000);

    before(async () => {
        await initializeClient();
        await deployWipeContract();
        await deployRetireDoubleContract();
    });

    describe('Retire - Exact Ratio, Immediate', () => {
        let token1Id: string;
        let token1Address: string;
        let token2Id: string;
        let token2Address: string;
        let user: any;
        let userClient: any;

        before(async () => {
            const result1 = await createFungibleToken(
                sharedState.client!,
                'Retire Double Token A',
                'RDTA',
                sharedState.wipeContractId
            );
            token1Id = result1.tokenId;
            token1Address = result1.address;

            const result2 = await createFungibleToken(
                sharedState.client!,
                'Retire Double Token B',
                'RDTB',
                sharedState.wipeContractId
            );
            token2Id = result2.tokenId;
            token2Address = result2.address;

            let wiperParams = new ContractFunctionParameters()
                .addAddress(sharedState.retireDoubleContractAddress)
                .addAddress(token1Address);

            await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addWiper',
                wiperParams,
                1000000
            );

            wiperParams = new ContractFunctionParameters()
                .addAddress(sharedState.retireDoubleContractAddress)
                .addAddress(token2Address);

            await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addWiper',
                wiperParams,
                1000000
            );

            const poolAbi = ['function setPool(tuple(address token, int64 count)[], bool immediately)'];
            const poolArgs = [
                [
                    {token: token1Address, count: 10},
                    {token: token2Address, count: 20}
                ],
                true
            ];

            await executeContractRaw(
                sharedState.client!,
                sharedState.retireDoubleContractId,
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
                .setTokenIds([token1Id, token2Id])
                .freezeWith(sharedState.client!)
                .sign(user.privateKey);
            const associateResponse = await associateTx.execute(sharedState.client!);
            await associateResponse.getReceipt(sharedState.client!);

            const transferResponse = await new TransferTransaction()
                .addTokenTransfer(token1Id, sharedState.operatorId, -1000)
                .addTokenTransfer(token1Id, user.accountId, 1000)
                .addTokenTransfer(token2Id, sharedState.operatorId, -1000)
                .addTokenTransfer(token2Id, user.accountId, 1000)
                .freezeWith(sharedState.client!)
                .execute(sharedState.client!);
            await transferResponse.getReceipt(sharedState.client!);
        });

        after(() => {
            if (userClient) {
                userClient.close();
            }
        });

        it('should retire with exact ratio', async () => {
            const balance1Before = await getTokenBalance(sharedState.client!, user.accountId, token1Id);
            const balance2Before = await getTokenBalance(sharedState.client!, user.accountId, token2Id);

            const abi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
            const args = [
                [
                    {token: token1Address, count: 10, serials: []},
                    {token: token2Address, count: 20, serials: []}
                ]
            ];

            const {receipt, record} = await executeContractRaw(
                userClient,
                sharedState.retireDoubleContractId,
                'retire',
                abi,
                args,
                3000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');

            const balance1After = await getTokenBalance(sharedState.client!, user.accountId, token1Id);
            const balance2After = await getTokenBalance(sharedState.client!, user.accountId, token2Id);

            expect(balance1After).to.be.lessThan(balance1Before);
            expect(balance2After).to.be.lessThan(balance2Before);
        });
    });

    describe('RetireDoubleToken - Validation Tests', () => {
        let token1Id: string;
        let token1Address: string;
        let token2Id: string;
        let token2Address: string;
        let user: any;
        let userClient: any;

        before(async () => {
            const result1 = await createFungibleToken(
                sharedState.client!,
                'Validation Token A',
                'VALA',
                sharedState.wipeContractId
            );
            token1Id = result1.tokenId;
            token1Address = result1.address;

            const result2 = await createFungibleToken(
                sharedState.client!,
                'Validation Token B',
                'VALB',
                sharedState.wipeContractId
            );
            token2Id = result2.tokenId;
            token2Address = result2.address;

            let wiperParams = new ContractFunctionParameters()
                .addAddress(sharedState.retireDoubleContractAddress)
                .addAddress(token1Address);

            await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addWiper',
                wiperParams,
                1000000
            );

            wiperParams = new ContractFunctionParameters()
                .addAddress(sharedState.retireDoubleContractAddress)
                .addAddress(token2Address);

            await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addWiper',
                wiperParams,
                1000000
            );

            const poolAbi = ['function setPool(tuple(address token, int64 count)[], bool immediately)'];
            const poolArgs = [
                [
                    {token: token1Address, count: 10},
                    {token: token2Address, count: 20}
                ],
                true
            ];

            await executeContractRaw(
                sharedState.client!,
                sharedState.retireDoubleContractId,
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
                .setTokenIds([token1Id, token2Id])
                .freezeWith(sharedState.client!)
                .sign(user.privateKey);
            const associateResponse = await associateTx.execute(sharedState.client!);
            await associateResponse.getReceipt(sharedState.client!);

            const transferResponse = await new TransferTransaction()
                .addTokenTransfer(token1Id, sharedState.operatorId, -2000)
                .addTokenTransfer(token1Id, user.accountId, 2000)
                .addTokenTransfer(token2Id, sharedState.operatorId, -2000)
                .addTokenTransfer(token2Id, user.accountId, 2000)
                .freezeWith(sharedState.client!)
                .execute(sharedState.client!);
            await transferResponse.getReceipt(sharedState.client!);
        });

        after(() => {
            if (userClient) {
                userClient.close();
            }
        });

        it('should retire multiple of ratio', async () => {
            const balance1Before = await getTokenBalance(sharedState.client!, user.accountId, token1Id);
            const balance2Before = await getTokenBalance(sharedState.client!, user.accountId, token2Id);

            const abi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
            const args = [
                [
                    {token: token1Address, count: 50, serials: []},
                    {token: token2Address, count: 100, serials: []}
                ]
            ];

            const {receipt, record} = await executeContractRaw(
                userClient,
                sharedState.retireDoubleContractId,
                'retire',
                abi,
                args,
                3000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');

            const balance1After = await getTokenBalance(sharedState.client!, user.accountId, token1Id);
            const balance2After = await getTokenBalance(sharedState.client!, user.accountId, token2Id);

            expect(balance1After).to.equal(balance1Before - 50);
            expect(balance2After).to.equal(balance2Before - 100);
        });

        it('should fail with wrong ratio', async () => {
            const abi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
            const args = [
                [
                    {token: token1Address, count: 50, serials: []},
                    {token: token2Address, count: 110, serials: []}
                ]
            ];

            try {
                await executeContractRaw(
                    userClient,
                    sharedState.retireDoubleContractId,
                    'retire',
                    abi,
                    args,
                    3000000
                );
                expect.fail('Should have reverted with RETIRE_CHECK');
            } catch (error: any) {
                expect(error.message).to.include('CONTRACT_REVERT_EXECUTED');
            }
        });

        it('should fail when correct ratio but less than pool minimum', async () => {
            const abi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
            const args = [
                [
                    {token: token1Address, count: 5, serials: []},
                    {token: token2Address, count: 10, serials: []}
                ]
            ];

            try {
                await executeContractRaw(
                    userClient,
                    sharedState.retireDoubleContractId,
                    'retire',
                    abi,
                    args,
                    3000000
                );
                expect.fail('Should have reverted with RETIRE_CHECK');
            } catch (error: any) {
                expect(error.message).to.include('CONTRACT_REVERT_EXECUTED');
            }
        });
    });
});
