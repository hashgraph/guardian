import {expect} from 'chai';
import {ContractFunctionParameters} from '@hashgraph/sdk';
import {deployRetireDoubleContract, deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {createFungibleToken, executeContract, executeContractRaw} from './helpers';

describe('RetireDoubleToken - Pool Management', function () {
    this.timeout(300000);

    before(async () => {
        await initializeClient();
        await deployWipeContract();
        await deployRetireDoubleContract();
    });

    describe('Set Pool - Two Fungible Tokens', () => {
        let token1Id: string;
        let token1Address: string;
        let token2Id: string;
        let token2Address: string;

        it('should deploy RetireDoubleToken contract', async () => {
            expect(sharedState.retireDoubleContractId).to.not.be.empty;
        });

        it('should create two fungible tokens with wipe keys', async () => {
            const result1 = await createFungibleToken(
                sharedState.client!,
                'Carbon Token A',
                'CRBA',
                sharedState.wipeContractId
            );
            token1Id = result1.tokenId;
            token1Address = result1.address;

            const result2 = await createFungibleToken(
                sharedState.client!,
                'Carbon Token B',
                'CRBB',
                sharedState.wipeContractId
            );
            token2Id = result2.tokenId;
            token2Address = result2.address;

            expect(token1Id).to.not.be.empty;
            expect(token2Id).to.not.be.empty;
        });

        it('should add retire contract as wiper for both tokens', async () => {
            let params = new ContractFunctionParameters()
                .addAddress(sharedState.retireDoubleContractAddress)
                .addAddress(token1Address);

            let {receipt} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addWiper',
                params,
                1000000
            );
            expect(receipt.status.toString()).to.equal('SUCCESS');

            params = new ContractFunctionParameters()
                .addAddress(sharedState.retireDoubleContractAddress)
                .addAddress(token2Address);

            ({receipt} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addWiper',
                params,
                1000000
            ));
            expect(receipt.status.toString()).to.equal('SUCCESS');
        });

        it('should set pool for two tokens with ratio 10:20', async () => {
            const abi = ['function setPool(tuple(address token, int64 count)[], bool immediately)'];
            const args = [
                [
                    {token: token1Address, count: 10},
                    {token: token2Address, count: 20}
                ],
                true
            ];

            const {receipt, record} = await executeContractRaw(
                sharedState.client!,
                sharedState.retireDoubleContractId,
                'setPool',
                abi,
                args,
                2000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');
        });
    });
});
