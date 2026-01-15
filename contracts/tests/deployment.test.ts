import {expect} from 'chai';
import {ContractCallQuery, ContractFunctionParameters, PrivateKey} from '@hiero-ledger/sdk';
import {deployWipeContract, initializeClient, sharedState} from './shared-setup';
import {createAccount, executeContract, parseLogs} from './helpers';

describe('Wipe Contract - Deployment & Access Control', function () {
    this.timeout(300000);

    before(async () => {
        await initializeClient();
        await deployWipeContract();
    });

    describe('Deploy Wipe Contract', () => {
        it('should deploy Wipe contract successfully', async () => {
            expect(sharedState.wipeContractId).to.be.a('string').and.not.be.empty;
            expect(sharedState.wipeContractAddress).to.be.a('string').and.not.be.empty;
        });

        it('should return correct version [1, 0, 1]', async () => {
            const query = new ContractCallQuery()
                .setContractId(sharedState.wipeContractId)
                .setGas(100000)
                .setFunction('ver');

            const result = await query.execute(sharedState.client!);
            const version = result.getUint256(0);

            expect(version.toNumber()).to.equal(1);
        });
    });

    describe('Add/Remove Manager', () => {
        let managerAccount: { accountId: string; privateKey: PrivateKey; address: string };

        before(async () => {
            managerAccount = await createAccount(sharedState.client!, 10);
        });

        it('should add new manager', async () => {
            const params = new ContractFunctionParameters()
                .addAddress(managerAccount.address);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addManager',
                params,
                1000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');

            const logs = parseLogs(['event ManagerAdded(address account)'], record);
            const event = logs.find((l: any) => l.name === 'ManagerAdded' || l.fragment?.name === 'ManagerAdded');
            expect(event).to.not.be.undefined;
            expect(event.args[0].toLowerCase()).to.equal(managerAccount.address.toLowerCase());
        });

        it('should verify manager can execute manager-only function', async () => {
            const {getClient, createFungibleToken, createAccount: createAcc} = await import('./helpers');

            const managerClient = getClient();
            managerClient.setOperator(
                managerAccount.accountId,
                managerAccount.privateKey
            );

            const tokenResult = await createFungibleToken(sharedState.client!, 'Manager Test Token', 'MTT');
            const testUserAccount = await createAcc(sharedState.client!, 10);

            const params = new ContractFunctionParameters()
                .addAddress(testUserAccount.address)
                .addAddress(tokenResult.address);

            const {receipt, record} = await executeContract(
                managerClient,
                sharedState.wipeContractId,
                'addWiper',
                params,
                1000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');

            managerClient.close();
        });

        it('should remove manager', async () => {
            const params = new ContractFunctionParameters()
                .addAddress(managerAccount.address);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'removeManager',
                params,
                1000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');
        });

        it('should fail when removed manager tries to execute manager function', async () => {
            const {getClient, createFungibleToken, createAccount: createAcc} = await import('./helpers');

            const managerClient = getClient();
            managerClient.setOperator(
                managerAccount.accountId,
                managerAccount.privateKey
            );

            const testUserAccount = await createAcc(sharedState.client!, 10);
            const tokenResult = await createFungibleToken(sharedState.client!, 'Manager Test Token 2', 'MTT2');

            const params = new ContractFunctionParameters()
                .addAddress(testUserAccount.address)
                .addAddress(tokenResult.address);

            try {
                await executeContract(
                    managerClient,
                    sharedState.wipeContractId,
                    'addWiper',
                    params,
                    1000000
                );
                expect.fail('Should have reverted with NO_PERMISSIONS');
            } catch (error: any) {
                expect(error.message).to.include('CONTRACT_REVERT_EXECUTED');
            }

            managerClient.close();
        });
    });

    describe('Add/Remove Admin', () => {
        let adminAccount: { accountId: string; privateKey: PrivateKey; address: string };

        before(async () => {
            adminAccount = await createAccount(sharedState.client!, 10);
        });

        it('should add new admin', async () => {
            const params = new ContractFunctionParameters()
                .addAddress(adminAccount.address);

            const {receipt} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'addAdmin',
                params,
                1000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');
        });

        it('should verify admin can add manager', async () => {
            const {getClient, createAccount: createAcc} = await import('./helpers');

            const adminClient = getClient();
            adminClient.setOperator(
                adminAccount.accountId,
                adminAccount.privateKey
            );

            const testManagerAccount = await createAcc(sharedState.client!, 10);

            const params = new ContractFunctionParameters()
                .addAddress(testManagerAccount.address);

            const {receipt, record} = await executeContract(
                adminClient,
                sharedState.wipeContractId,
                'addManager',
                params,
                1000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');

            adminClient.close();
        });

        it('should remove admin', async () => {
            const params = new ContractFunctionParameters()
                .addAddress(adminAccount.address);

            const {receipt, record} = await executeContract(
                sharedState.client!,
                sharedState.wipeContractId,
                'removeAdmin',
                params,
                1000000
            );

            expect(receipt.status.toString()).to.equal('SUCCESS');
        });

        it('should fail when removed admin tries to add manager', async () => {
            const {getClient, createAccount: createAcc} = await import('./helpers');

            const adminClient = getClient();
            adminClient.setOperator(
                adminAccount.accountId,
                adminAccount.privateKey
            );

            const testManagerAccount = await createAcc(sharedState.client!, 10);

            const params = new ContractFunctionParameters()
                .addAddress(testManagerAccount.address);

            try {
                await executeContract(
                    adminClient,
                    sharedState.wipeContractId,
                    'addManager',
                    params,
                    1000000
                );
                expect.fail('Should have reverted with NO_PERMISSIONS');
            } catch (error: any) {
                expect(error.message).to.include('CONTRACT_REVERT_EXECUTED');
            }

            adminClient.close();
        });
    });

    describe('Cannot Remove Self Contract Roles', () => {
        it('should fail when trying to remove role from the contract itself', async () => {
            const params = new ContractFunctionParameters()
                .addAddress(sharedState.wipeContractAddress);

            try {
                await executeContract(
                    sharedState.client!,
                    sharedState.wipeContractId,
                    'removeAdmin',
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
