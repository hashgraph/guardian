import {expect} from 'chai';
import {ContractId} from '@hiero-ledger/sdk';
import {deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {createAccount, executeContractRaw, getClient} from './helpers';

describe('Access - Owner Management', function () {
    this.timeout(300000);

    let ownerAccount: any;
    let newOwnerAccount: any;
    let otherAccount: any;
    let wipeContractId: string;

    before(async () => {
        await initializeClient();
        await deployWipeContract();
        wipeContractId = sharedState.wipeContractId;
        ownerAccount = {
            accountId: sharedState.client!.operatorAccountId!.toString(),
            address: sharedState.client!.operatorAccountId!.toEvmAddress()
        };
        newOwnerAccount = await createAccount(sharedState.client!, 10);
        otherAccount = await createAccount(sharedState.client!, 10);
    });

    describe('Ownership Transfer', () => {
        it('Should NOT allow non-owner to propose', async () => {
            const clientOther = getClient().setOperator(otherAccount.accountId, otherAccount.privateKey);
            const abi = ['function proposeOwner(address newOwner)'];
            const args = [otherAccount.address];
            try {
                await executeContractRaw(clientOther, wipeContractId, 'proposeOwner', abi, args, 200000);
                expect.fail('Should have reverted');
            } catch (e: any) {
                expect(e.message).to.include('CONTRACT_REVERT_EXECUTED');
            } finally {
                clientOther.close();
            }
        });

        it('Should allow owner to propose a new owner', async () => {
            const abi = ['function proposeOwner(address newOwner)'];
            const args = [newOwnerAccount.address];
            const {receipt} = await executeContractRaw(
                sharedState.client!,
                wipeContractId,
                'proposeOwner',
                abi,
                args,
                200000
            );
            expect(receipt.status.toString()).to.equal('SUCCESS');
        });

        it('Should NOT allow random account to claim ownership', async () => {
            const clientOther = getClient().setOperator(otherAccount.accountId, otherAccount.privateKey);
            const abi = ['function claimOwner()'];
            try {
                await executeContractRaw(clientOther, wipeContractId, 'claimOwner', abi, [], 200000);
                expect.fail('Should have reverted');
            } catch (e: any) {
                expect(e.message).to.include('CONTRACT_REVERT_EXECUTED');
            } finally {
                clientOther.close();
            }
        });

        it('Should allow pending owner to claim ownership', async () => {
            const clientNewOwner = getClient().setOperator(newOwnerAccount.accountId, newOwnerAccount.privateKey);
            const abi = ['function claimOwner()'];
            const {receipt} = await executeContractRaw(
                clientNewOwner,
                wipeContractId,
                'claimOwner',
                abi,
                [],
                200000
            );
            expect(receipt.status.toString()).to.equal('SUCCESS');
            clientNewOwner.close();
        });

        it('Should clear pendingOwner after claim', async () => {
            const clientNewOwner = getClient().setOperator(newOwnerAccount.accountId, newOwnerAccount.privateKey);
            const abi = ['function claimOwner()'];
            try {
                await executeContractRaw(clientNewOwner, wipeContractId, 'claimOwner', abi, [], 200000);
                expect.fail('Should have reverted');
            } catch (e: any) {
                expect(e.message).to.include('CONTRACT_REVERT_EXECUTED');
            } finally {
                clientNewOwner.close();
            }
        });
    });

    describe('Multiple Owners and Removal', () => {
        it('Should have two owners and both can perform actions', async () => {
            const clientNewOwner = getClient().setOperator(newOwnerAccount.accountId, newOwnerAccount.privateKey);
            const addAdminAbi = ['function addAdmin(address account)'];
            const addAdminArgs = [otherAccount.address];
            const {receipt} = await executeContractRaw(
                clientNewOwner,
                wipeContractId,
                'addAdmin',
                addAdminAbi,
                addAdminArgs,
                200000
            );
            expect(receipt.status.toString()).to.equal('SUCCESS');
            clientNewOwner.close();

            const removeAdminAbi = ['function removeAdmin(address account)'];
            const removeAdminArgs = [otherAccount.address];
            const {receipt: receiptRemove} = await executeContractRaw(
                sharedState.client!,
                wipeContractId,
                'removeAdmin',
                removeAdminAbi,
                removeAdminArgs,
                200000
            );
            expect(receiptRemove.status.toString()).to.equal('SUCCESS');
        });

        it('Should NOT allow owner to remove themselves', async () => {
            const abi = ['function removeOwner(address account)'];
            const args = [ownerAccount.address];
            try {
                await executeContractRaw(sharedState.client!, wipeContractId, 'removeOwner', abi, args, 200000);
                expect.fail('Should have reverted');
            } catch (e: any) {
                expect(e.message).to.include('CONTRACT_REVERT_EXECUTED');
            }
        });

        it('Should NOT allow removing the contract itself', async () => {
            const abi = ['function removeOwner(address account)'];
            const args = [ContractId.fromString(wipeContractId).toEvmAddress()];
            try {
                await executeContractRaw(sharedState.client!, wipeContractId, 'removeOwner', abi, args, 200000);
                expect.fail('Should have reverted');
            } catch (e: any) {
                expect(e.message).to.include('CONTRACT_REVERT_EXECUTED');
            }
        });

        it('Should allow one owner to remove another owner', async () => {
            const abi = ['function removeOwner(address account)'];
            const args = [newOwnerAccount.address];
            const {receipt} = await executeContractRaw(
                sharedState.client!,
                wipeContractId,
                'removeOwner',
                abi,
                args,
                200000
            );
            expect(receipt.status.toString()).to.equal('SUCCESS');

            const clientNewOwner = getClient().setOperator(newOwnerAccount.accountId, newOwnerAccount.privateKey);
            const addAdminAbi = ['function addAdmin(address account)'];
            const addAdminArgs = [otherAccount.address];
            try {
                await executeContractRaw(clientNewOwner, wipeContractId, 'addAdmin', addAdminAbi, addAdminArgs, 200000);
                expect.fail('Should have reverted');
            } catch (e: any) {
                expect(e.message).to.include('CONTRACT_REVERT_EXECUTED');
            } finally {
                clientNewOwner.close();
            }
        });
    });

    describe('Edge Cases', () => {
        it('Should overwrite pendingOwner if proposeOwner is called again', async () => {
            const proposeAbi = ['function proposeOwner(address newOwner)'];
            const claimAbi = ['function claimOwner()'];

            await executeContractRaw(sharedState.client!, wipeContractId, 'proposeOwner', proposeAbi, [otherAccount.address], 200000);
            await executeContractRaw(sharedState.client!, wipeContractId, 'proposeOwner', proposeAbi, [newOwnerAccount.address], 200000);

            const clientOther = getClient().setOperator(otherAccount.accountId, otherAccount.privateKey);
            try {
                await executeContractRaw(clientOther, wipeContractId, 'claimOwner', claimAbi, [], 200000);
                expect.fail('Should have reverted');
            } catch (e: any) {
                expect(e.message).to.include('CONTRACT_REVERT_EXECUTED');
            } finally {
                clientOther.close();
            }

            const clientNewOwner = getClient().setOperator(newOwnerAccount.accountId, newOwnerAccount.privateKey);
            await executeContractRaw(clientNewOwner, wipeContractId, 'claimOwner', claimAbi, [], 200000);
            clientNewOwner.close();
        });
    });
});
