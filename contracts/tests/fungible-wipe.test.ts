import {expect} from 'chai';
import {ContractFunctionParameters, TokenAssociateTransaction, TransferTransaction} from '@hashgraph/sdk';
import {deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {accountIdToSolidityAddress, createAccount, createFungibleToken, executeContract, getTokenBalance} from './helpers';

describe('Wipe Contract - Fungible Token Operations', function () {
    this.timeout(300000);

    before(async () => {
        await initializeClient();
        await deployWipeContract();
    });

    describe('Wipe Fungible Tokens - Immediate', () => {
        let tokenId: string;
        let tokenAddress: string;

        it('should create fungible token with wipe key', async () => {
            const result = await createFungibleToken(
                sharedState.client!,
                'Test Token',
                'TEST',
                sharedState.wipeContractId
            );
            tokenId = result.tokenId;
            tokenAddress = result.address;

            expect(tokenId).to.not.be.empty;
        });

        it('should add operator as wiper', async () => {
            const operatorAddress = accountIdToSolidityAddress(sharedState.operatorId);
            const params = new ContractFunctionParameters()
                .addAddress(operatorAddress)
                .addAddress(tokenAddress);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addWiper',
                params,
                1000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');
        });

        it('should wipe tokens from user account', async () => {
            const user = await createAccount(sharedState.client!, 20);
            const associateTx = await new TokenAssociateTransaction()
                .setAccountId(user.accountId)
                .setTokenIds([tokenId])
                .freezeWith(sharedState.client!)
                .sign(user.privateKey);
            const associateResponse = await associateTx.execute(sharedState.client!);
            await associateResponse.getReceipt(sharedState.client!);

            const transferResponse = await new TransferTransaction()
                .addTokenTransfer(tokenId, sharedState.operatorId, -200000000)
                .addTokenTransfer(tokenId, user.accountId, 200000000)
                .execute(sharedState.client!);
            await transferResponse.getReceipt(sharedState.client!);

            const initialBalance = await getTokenBalance(sharedState.client!, user.accountId, tokenId);

            const wipeAmount = 100000000;
            const params = new ContractFunctionParameters()
                .addAddress(tokenAddress)
                .addAddress(user.address)
                .addInt64(wipeAmount);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'wipe',
                params,
                2000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');

            const finalBalance = await getTokenBalance(sharedState.client!, user.accountId, tokenId);

            expect(finalBalance).to.be.lessThan(initialBalance);
        });
    });

    describe('Non-Wiper Cannot Wipe', () => {
        let tokenId: string;
        let tokenAddress: string;

        before(async () => {
            const result = await createFungibleToken(
                sharedState.client!,
                'No Wiper Test Token',
                'NWTT',
                sharedState.wipeContractId
            );
            tokenId = result.tokenId;
            tokenAddress = result.address;
        });

        it('should fail when non-wiper tries to wipe', async () => {
            const {getClient} = await import('./helpers');

            const nonWiperAccount = await createAccount(sharedState.client!, 10);
            const nonWiperClient = getClient();
            nonWiperClient.setOperator(
                nonWiperAccount.accountId,
                nonWiperAccount.privateKey
            );

            const operatorAddress = accountIdToSolidityAddress(sharedState.operatorId);
            const params = new ContractFunctionParameters()
                .addAddress(tokenAddress)
                .addAddress(operatorAddress)
                .addInt64(100);

            try {
                await executeContract(
                    nonWiperClient,
                    sharedState.wipeContractId,
                    'wipe',
                    params,
                    2000000
                );
                expect.fail('Should have reverted with NOT_WIPER');
            } catch (error: any) {
                expect(error.message).to.include('CONTRACT_REVERT_EXECUTED');
            }

            nonWiperClient.close();
        });
    });
});
