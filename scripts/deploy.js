const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  const SafeExecution = await hre.ethers.getContractFactory('SafeExecution');
  const contract = await SafeExecution.deploy();

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log('SafeExecution deployed to:', address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
