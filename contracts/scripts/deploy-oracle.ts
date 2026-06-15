import { ethers, network } from 'hardhat';

/**
 * Deploy GuardianOracle contract.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-oracle.ts --network testnet
 *   npx hardhat run scripts/deploy-oracle.ts --network local
 *
 * After deployment, copy the contract address into your Guardian environment:
 *   ORACLE_CONTRACT_ADDRESS=0x...
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying GuardianOracle on network: ${network.name}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} HBAR`);

    const OracleFactory = await ethers.getContractFactory('GuardianOracle');
    const oracle = await OracleFactory.deploy();
    await oracle.waitForDeployment();

    const address = await oracle.getAddress();
    console.log(`\nGuardianOracle deployed to: ${address}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Set ORACLE_CONTRACT_ADDRESS=${address} in your Guardian .env`);
    console.log(`  2. Set ORACLE_ENABLED=true in your Guardian .env`);
    console.log(`  3. Restart guardian-service — it will auto-register as an operator`);
    console.log(`\nVerify on Hashscan: https://hashscan.io/${network.name}/contract/${address}`);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
