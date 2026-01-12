import {ethers} from 'hardhat';

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log('Deploying contracts with the account:', deployer.address);

    // Deploy Wipe
    const Wipe = await ethers.getContractFactory('Wipe');
    const wipe = await Wipe.deploy();
    await wipe.waitForDeployment();
    console.log('Wipe deployed to:', await wipe.getAddress());

    // Deploy RetireSingleToken
    const RetireSingleToken = await ethers.getContractFactory('RetireSingleToken');
    const retireSingle = await RetireSingleToken.deploy();
    await retireSingle.waitForDeployment();
    console.log('RetireSingleToken deployed to:', await retireSingle.getAddress());

    // Deploy RetireDoubleToken
    const RetireDoubleToken = await ethers.getContractFactory('RetireDoubleToken');
    const retireDouble = await RetireDoubleToken.deploy();
    await retireDouble.waitForDeployment();
    console.log('RetireDoubleToken deployed to:', await retireDouble.getAddress());

    console.log('All contracts deployed successfully.');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
