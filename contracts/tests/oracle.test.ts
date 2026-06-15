import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { GuardianOracle } from '../typechain-types';

describe('GuardianOracle', () => {
    let oracle: GuardianOracle;
    let owner: SignerWithAddress;
    let operator: SignerWithAddress;
    let stranger: SignerWithAddress;

    const TOKEN_A = '0x0000000000000000000000000000000000aaaaaa';
    const TOKEN_B = '0x0000000000000000000000000000000000bbbbbb';
    const TOKEN_C = '0x0000000000000000000000000000000000cccccc';

    beforeEach(async () => {
        [owner, operator, stranger] = await ethers.getSigners();
        const OracleFactory = await ethers.getContractFactory('GuardianOracle');
        oracle = (await OracleFactory.deploy()) as GuardianOracle;
        await oracle.waitForDeployment();
    });

    // -------------------------------------------------------------------------
    // Deployment
    // -------------------------------------------------------------------------

    describe('deployment', () => {
        it('sets deployer as owner', async () => {
            expect(await oracle.owner()).to.equal(owner.address);
        });

        it('owner is an operator by default', async () => {
            expect(await oracle.isOperator(owner.address)).to.be.true;
        });

        it('returns version [1,0,0]', async () => {
            const v = await oracle.ver();
            expect(v.map(Number)).to.deep.equal([1, 0, 0]);
        });
    });

    // -------------------------------------------------------------------------
    // Single-token read  — default state
    // -------------------------------------------------------------------------

    describe('isTokenValid (default)', () => {
        it('returns false + timestamp 0 for unknown token', async () => {
            const [valid, ts] = await oracle.isTokenValid(TOKEN_A);
            expect(valid).to.be.false;
            expect(ts).to.equal(0n);
        });
    });

    // -------------------------------------------------------------------------
    // updateVerdict
    // -------------------------------------------------------------------------

    describe('updateVerdict', () => {
        it('owner can mark a token valid', async () => {
            await oracle.connect(owner).updateVerdict(TOKEN_A, true);
            const [valid] = await oracle.isTokenValid(TOKEN_A);
            expect(valid).to.be.true;
        });

        it('authorised operator can mark a token invalid', async () => {
            await oracle.connect(owner).addOperator(operator.address);
            await oracle.connect(owner).updateVerdict(TOKEN_A, true);
            await oracle.connect(operator).updateVerdict(TOKEN_A, false);
            const [valid] = await oracle.isTokenValid(TOKEN_A);
            expect(valid).to.be.false;
        });

        it('stranger cannot update verdict', async () => {
            await expect(
                oracle.connect(stranger).updateVerdict(TOKEN_A, true)
            ).to.be.revertedWithCustomError(oracle, 'NotOperator');
        });

        it('reverts on zero address', async () => {
            await expect(
                oracle.updateVerdict(ethers.ZeroAddress, true)
            ).to.be.revertedWithCustomError(oracle, 'ZeroAddress');
        });

        it('emits VerdictUpdated event', async () => {
            await expect(oracle.updateVerdict(TOKEN_A, true))
                .to.emit(oracle, 'VerdictUpdated')
                .withArgs(TOKEN_A, true, await latestTimestamp(), owner.address);
        });

        it('updatedAt reflects block timestamp', async () => {
            const tx = await oracle.updateVerdict(TOKEN_A, true);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt!.blockNumber);
            const [, ts] = await oracle.isTokenValid(TOKEN_A);
            expect(ts).to.equal(BigInt(block!.timestamp));
        });
    });

    // -------------------------------------------------------------------------
    // updateVerdicts (batch)
    // -------------------------------------------------------------------------

    describe('updateVerdicts', () => {
        it('updates multiple tokens in one call', async () => {
            await oracle.updateVerdicts([TOKEN_A, TOKEN_B, TOKEN_C], [true, false, true]);
            const [resA] = await oracle.isTokenValid(TOKEN_A);
            const [resB] = await oracle.isTokenValid(TOKEN_B);
            const [resC] = await oracle.isTokenValid(TOKEN_C);
            expect(resA).to.be.true;
            expect(resB).to.be.false;
            expect(resC).to.be.true;
        });

        it('reverts on array length mismatch', async () => {
            await expect(
                oracle.updateVerdicts([TOKEN_A, TOKEN_B], [true])
            ).to.be.revertedWithCustomError(oracle, 'ArrayLengthMismatch');
        });

        it('reverts if any token is zero address', async () => {
            await expect(
                oracle.updateVerdicts([TOKEN_A, ethers.ZeroAddress], [true, true])
            ).to.be.revertedWithCustomError(oracle, 'ZeroAddress');
        });

        it('stranger cannot call batch update', async () => {
            await expect(
                oracle.connect(stranger).updateVerdicts([TOKEN_A], [true])
            ).to.be.revertedWithCustomError(oracle, 'NotOperator');
        });
    });

    // -------------------------------------------------------------------------
    // areTokensValid
    // -------------------------------------------------------------------------

    describe('areTokensValid', () => {
        beforeEach(async () => {
            await oracle.updateVerdicts([TOKEN_A, TOKEN_B, TOKEN_C], [true, false, true]);
        });

        it('returns correct parallel arrays', async () => {
            const [results, timestamps] = await oracle.areTokensValid([TOKEN_A, TOKEN_B, TOKEN_C]);
            expect(results.map(Boolean)).to.deep.equal([true, false, true]);
            expect(timestamps.every(ts => ts > 0n)).to.be.true;
        });

        it('empty input returns empty arrays', async () => {
            const [results, timestamps] = await oracle.areTokensValid([]);
            expect(results).to.have.length(0);
            expect(timestamps).to.have.length(0);
        });
    });

    // -------------------------------------------------------------------------
    // allTokensValid
    // -------------------------------------------------------------------------

    describe('allTokensValid', () => {
        it('returns true when all tokens are valid', async () => {
            await oracle.updateVerdicts([TOKEN_A, TOKEN_B], [true, true]);
            expect(await oracle.allTokensValid([TOKEN_A, TOKEN_B])).to.be.true;
        });

        it('returns false when any token is invalid', async () => {
            await oracle.updateVerdicts([TOKEN_A, TOKEN_B], [true, false]);
            expect(await oracle.allTokensValid([TOKEN_A, TOKEN_B])).to.be.false;
        });

        it('returns true for empty array', async () => {
            expect(await oracle.allTokensValid([])).to.be.true;
        });
    });

    // -------------------------------------------------------------------------
    // Operator management
    // -------------------------------------------------------------------------

    describe('operator management', () => {
        it('owner can add an operator', async () => {
            await oracle.addOperator(operator.address);
            expect(await oracle.isOperator(operator.address)).to.be.true;
        });

        it('owner can remove an operator', async () => {
            await oracle.addOperator(operator.address);
            await oracle.removeOperator(operator.address);
            expect(await oracle.isOperator(operator.address)).to.be.false;
        });

        it('non-owner cannot add operator', async () => {
            await expect(
                oracle.connect(stranger).addOperator(operator.address)
            ).to.be.revertedWithCustomError(oracle, 'NotOwner');
        });

        it('non-owner cannot remove operator', async () => {
            await oracle.addOperator(operator.address);
            await expect(
                oracle.connect(stranger).removeOperator(operator.address)
            ).to.be.revertedWithCustomError(oracle, 'NotOwner');
        });

        it('emits OperatorAdded event', async () => {
            await expect(oracle.addOperator(operator.address))
                .to.emit(oracle, 'OperatorAdded')
                .withArgs(operator.address);
        });

        it('emits OperatorRemoved event', async () => {
            await oracle.addOperator(operator.address);
            await expect(oracle.removeOperator(operator.address))
                .to.emit(oracle, 'OperatorRemoved')
                .withArgs(operator.address);
        });

        it('reverts adding zero address as operator', async () => {
            await expect(
                oracle.addOperator(ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(oracle, 'ZeroAddress');
        });
    });

    // -------------------------------------------------------------------------
    // getVerdict helper
    // -------------------------------------------------------------------------

    describe('getVerdict', () => {
        it('returns full verdict struct after update', async () => {
            await oracle.updateVerdict(TOKEN_A, true);
            const [isValid, updatedAt, updatedBy] = await oracle.getVerdict(TOKEN_A);
            expect(isValid).to.be.true;
            expect(updatedAt).to.be.greaterThan(0n);
            expect(updatedBy).to.equal(owner.address);
        });
    });
});

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------
async function latestTimestamp(): Promise<bigint> {
    const block = await ethers.provider.getBlock('latest');
    return BigInt(block!.timestamp + 1); // next block
}
