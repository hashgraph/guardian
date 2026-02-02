import {expect} from 'chai';
import {ContractFunctionParameters} from '@hiero-ledger/sdk';
import {deployRetireSingleContract, deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {createAccount, createFungibleToken, executeContract, executeContractRaw, getClient} from './helpers';

describe('RetireSingleToken - Pool Management', function () {
    this.timeout(300000);

    before(async () => {
        await initializeClient();
        await deployWipeContract();
        await deployRetireSingleContract();
    });

    describe('Set Pool - Fungible Token', () => {
        let tokenId: string;
        let tokenAddress: string;

        it('should deploy RetireSingleToken contract', async () => {
            expect(sharedState.retireSingleContractId).to.not.be.empty;
        });

        it('should create fungible token with wipe key', async () => {
            const result = await createFungibleToken(
                sharedState.client!,
                'Retire Token',
                'RET',
                sharedState.wipeContractId
            );
            tokenId = result.tokenId;
            tokenAddress = result.address;

            expect(tokenId).to.not.be.empty;
        });

        it('should add retire contract as wiper in wipe contract', async () => {
            const params = new ContractFunctionParameters()
                .addAddress(sharedState.retireSingleContractAddress)
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

        it('should set pool for token', async () => {
            const poolCount = 100;
            const immediately = true;

            const abi = ['function setPool(tuple(address token, int64 count)[], bool immediately)'];
            const args = [[{token: tokenAddress, count: poolCount}], immediately];

            const {receipt, record} = await executeContractRaw(
                sharedState.client!,
                sharedState.retireSingleContractId,
                'setPool',
                abi,
                args,
                2000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');
        });

        it('should fail to set pool by non-admin', async () => {
            const user = await createAccount(sharedState.client!, 10);
            const userClient = getClient();
            userClient.setOperator(user.accountId, user.privateKey);

            const abi = ['function setPool(tuple(address token, int64 count)[], bool immediately)'];
            const args = [[{token: tokenAddress, count: 200}], true];

            try {
                await executeContractRaw(
                    userClient,
                    sharedState.retireSingleContractId,
                    'setPool',
                    abi,
                    args,
                    2000000
                );
                expect.fail('Should have reverted with NO_PERMISSIONS');
            } catch (error: any) {
                expect(error.message).to.satisfy((msg: string) =>
                    msg.includes('CONTRACT_REVERT_EXECUTED') || msg.includes('NO_PERMISSIONS')
                );
            } finally {
                userClient.close();
            }
        });
    });
});
