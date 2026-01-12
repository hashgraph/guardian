import {expect} from 'chai';
import {ContractFunctionParameters, TokenAssociateTransaction} from '@hashgraph/sdk';
import {deployRetireSingleContract, deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {createAccount, createNFT, executeContract, executeContractRaw, getClient, mintNFT, transferNFTs} from './helpers';

describe('RetireSingleToken - NFT Operations', function () {
    this.timeout(300000);

    let nftTokenId: string;
    let nftTokenAddress: string;
    let user: any;
    let userClient: any;

    before(async () => {
        await initializeClient();
        await deployWipeContract();
        await deployRetireSingleContract();

        const result = await createNFT(
            sharedState.client!,
            'Retire NFT',
            'RNFT',
            sharedState.wipeContractId
        );
        nftTokenId = result.tokenId;
        nftTokenAddress = result.address;

        const wiperParams = new ContractFunctionParameters()
            .addAddress(sharedState.retireSingleContractAddress)
            .addAddress(nftTokenAddress);

        await executeContract(
            sharedState.client!,
            sharedState.wipeContractId,
            'addWiper',
            wiperParams,
            1000000
        );

        user = await createAccount(sharedState.client!, 20);
        userClient = getClient();
        userClient.setOperator(user.accountId, user.privateKey);

        const associateTx = await new TokenAssociateTransaction()
            .setAccountId(user.accountId)
            .setTokenIds([nftTokenId])
            .freezeWith(sharedState.client!)
            .sign(user.privateKey);
        await (await associateTx.execute(sharedState.client!)).getReceipt(sharedState.client!);
    });

    after(() => {
        if (userClient) {
            userClient.close();
        }
    });

    it('should set pool for NFT with count 3', async () => {
        const poolAbi = ['function setPool(tuple(address token, int64 count)[], bool immediately)'];
        const poolArgs = [[{token: nftTokenAddress, count: 3}], true];

        const {receipt, record} = await executeContractRaw(
            sharedState.client!,
            sharedState.retireSingleContractId,
            'setPool',
            poolAbi,
            poolArgs,
            2000000
        );
        expect(receipt.status.toString()).to.equal('SUCCESS');
    });

    it('should fail to set pool for NFT with count > 10', async () => {
        const poolAbi = ['function setPool(tuple(address token, int64 count)[], bool immediately)'];
        const poolArgs = [[{token: nftTokenAddress, count: 11}], true];

        try {
            await executeContractRaw(
                sharedState.client!,
                sharedState.retireSingleContractId,
                'setPool',
                poolAbi,
                poolArgs,
                2000000
            );
            expect.fail('Should have reverted with NFTS_LIMIT');
        } catch (error: any) {
            expect(error.message).to.include('CONTRACT_REVERT_EXECUTED');
        }
    });

    it('should retire NFT serials matching pool count', async () => {
        const serials = await mintNFT(sharedState.client!, nftTokenId, 3);

        await transferNFTs(sharedState.client!, nftTokenId, serials, sharedState.operatorId, user.accountId);

        const retireAbi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
        const retireArgs = [[{token: nftTokenAddress, count: 0, serials: serials}]];

        const {receipt, record} = await executeContractRaw(
            userClient,
            sharedState.retireSingleContractId,
            'retire',
            retireAbi,
            retireArgs,
            4000000
        );
        expect(receipt.status.toString()).to.equal('SUCCESS');
    });

    it('should fail when retiring more than 10 NFTs at once', async () => {
        const poolAbi = ['function setPool(tuple(address token, int64 count)[], bool immediately)'];
        const poolArgs = [[{token: nftTokenAddress, count: 1}], true];
        await executeContractRaw(sharedState.client!, sharedState.retireSingleContractId, 'setPool', poolAbi, poolArgs, 2000000);

        const serials = await mintNFT(sharedState.client!, nftTokenId, 11);

        await transferNFTs(sharedState.client!, nftTokenId, serials, sharedState.operatorId, user.accountId);

        const retireAbi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
        const retireArgs = [[{token: nftTokenAddress, count: 0, serials: serials}]]; // 11 serials

        try {
            await executeContractRaw(
                userClient,
                sharedState.retireSingleContractId,
                'retire',
                retireAbi,
                retireArgs,
                4000000
            );
            expect.fail('Should have reverted with NFTS_LIMIT');
        } catch (error: any) {
            expect(error.message).to.satisfy((msg: string) =>
                msg.includes('CONTRACT_REVERT_EXECUTED') || msg.includes('NFTS_LIMIT')
            );
        }
    });

    it('should fail when serials are NOT unique', async () => {
        const poolAbi = ['function setPool(tuple(address token, int64 count)[], bool immediately)'];
        const poolArgs = [[{token: nftTokenAddress, count: 2}], true];
        await executeContractRaw(sharedState.client!, sharedState.retireSingleContractId, 'setPool', poolAbi, poolArgs, 2000000);

        const serials = await mintNFT(sharedState.client!, nftTokenId, 1);
        await transferNFTs(sharedState.client!, nftTokenId, serials, sharedState.operatorId, user.accountId);

        const retireAbi = ['function retire(tuple(address token, int64 count, int64[] serials)[])'];
        const retireArgs = [[{token: nftTokenAddress, count: 0, serials: [serials[0], serials[0]]}]]; // Duplicate serial

        try {
            await executeContractRaw(
                userClient,
                sharedState.retireSingleContractId,
                'retire',
                retireAbi,
                retireArgs,
                4000000
            );
            expect.fail('Should have failed with NOT_UNIQUE_SERIALS');
        } catch (error: any) {
            expect(error.message).to.satisfy((msg: string) =>
                msg.includes('CONTRACT_REVERT_EXECUTED') || msg.includes('NOT_UNIQUE_SERIALS')
            );
        }
    });
});
