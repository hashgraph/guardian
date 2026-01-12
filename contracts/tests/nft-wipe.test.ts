import {expect} from 'chai';
import {ContractFunctionParameters, TokenAssociateTransaction, TransferTransaction} from '@hashgraph/sdk';
import {deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {accountIdToSolidityAddress, createAccount, createNFT, executeContract, mintNFT} from './helpers';

describe('Wipe Contract - NFT Operations', function () {
    this.timeout(300000);

    before(async () => {
        await initializeClient();
        await deployWipeContract();
    });

    describe('Wipe NFT Serials', () => {
        let nftTokenId: string;
        let nftTokenAddress: string;
        let serials: number[];

        it('should create NFT token with wipe key', async () => {
            const result = await createNFT(
                sharedState.client!,
                'Test NFT',
                'TNFT',
                sharedState.wipeContractId
            );
            nftTokenId = result.tokenId;
            nftTokenAddress = result.address;

            expect(nftTokenId).to.not.be.empty;
        });

        it('should mint NFTs', async () => {
            serials = await mintNFT(sharedState.client!, nftTokenId, 5);

            expect(serials).to.have.lengthOf(5);
        });

        it('should add operator as wiper for NFT', async () => {
            const operatorAddress = accountIdToSolidityAddress(sharedState.operatorId);
            const params = new ContractFunctionParameters()
                .addAddress(operatorAddress)
                .addAddress(nftTokenAddress);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addWiper',
                params,
                1000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');
        });

        it('should wipe NFT serials from user account', async () => {
            const user = await createAccount(sharedState.client!, 20);
            const associateTx = await new TokenAssociateTransaction()
                .setAccountId(user.accountId)
                .setTokenIds([nftTokenId])
                .freezeWith(sharedState.client!)
                .sign(user.privateKey);
            const associateResponse = await associateTx.execute(sharedState.client!);
            await associateResponse.getReceipt(sharedState.client!);

            const serialsToWipe = [serials[1], serials[3]];

            const transferResponse = await new TransferTransaction()
                .addNftTransfer(nftTokenId, serialsToWipe[0], sharedState.operatorId, user.accountId)
                .addNftTransfer(nftTokenId, serialsToWipe[1], sharedState.operatorId, user.accountId)
                .execute(sharedState.client!);
            await transferResponse.getReceipt(sharedState.client!);

            const params = new ContractFunctionParameters()
                .addAddress(nftTokenAddress)
                .addAddress(user.address)
                .addInt64Array(serialsToWipe);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'wipeNFT',
                params,
                2000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');
        });
    });
});
