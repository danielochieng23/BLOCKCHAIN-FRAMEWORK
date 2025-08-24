import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Starting deployment...\n');

  // Get the contract factory
  const DigitalIdentityRegistry = await ethers.getContractFactory('DigitalIdentityRegistry');
  
  // Deploy the contract
  console.log('Deploying DigitalIdentityRegistry...');
  const registry = await DigitalIdentityRegistry.deploy();
  await registry.waitForDeployment();
  
  const registryAddress = await registry.getAddress();
  console.log(`✅ DigitalIdentityRegistry deployed to: ${registryAddress}`);
  
  // Get deployer information
  const [deployer] = await ethers.getSigners();
  console.log(`\n📋 Deployment Information:`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`   Block Number: ${await ethers.provider.getBlockNumber()}`);
  
  // Setup initial roles
  console.log('\n🔐 Setting up roles...');
  
  // Add trusted issuers (example addresses - replace with actual)
  const trustedIssuers = [
    '0x0000000000000000000000000000000000000001', // Example issuer 1
    '0x0000000000000000000000000000000000000002', // Example issuer 2
  ];
  
  for (const issuer of trustedIssuers) {
    try {
      const tx = await registry.addTrustedIssuer(issuer);
      await tx.wait();
      console.log(`   ✅ Added trusted issuer: ${issuer}`);
    } catch (error) {
      console.log(`   ❌ Failed to add issuer ${issuer}: ${error}`);
    }
  }
  
  // Add verifiers (example addresses - replace with actual)
  const verifiers = [
    '0x0000000000000000000000000000000000000003', // Example verifier 1
  ];
  
  for (const verifier of verifiers) {
    try {
      const tx = await registry.addVerifier(verifier);
      await tx.wait();
      console.log(`   ✅ Added verifier: ${verifier}`);
    } catch (error) {
      console.log(`   ❌ Failed to add verifier ${verifier}: ${error}`);
    }
  }
  
  // Save deployment information
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    contracts: {
      DigitalIdentityRegistry: {
        address: registryAddress,
        deployer: deployer.address,
        deploymentBlock: await ethers.provider.getBlockNumber(),
        deploymentTimestamp: new Date().toISOString(),
      },
    },
    trustedIssuers,
    verifiers,
  };
  
  const deploymentPath = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  const filename = `deployment-${(await ethers.provider.getNetwork()).chainId}.json`;
  fs.writeFileSync(
    path.join(deploymentPath, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`\n💾 Deployment info saved to: deployments/${filename}`);
  
  // Verify contract on Etherscan (if not local network)
  if ((await ethers.provider.getNetwork()).chainId !== 31337n) {
    console.log('\n🔍 Preparing for Etherscan verification...');
    console.log('Run the following command to verify:');
    console.log(`npx hardhat verify --network ${(await ethers.provider.getNetwork()).name} ${registryAddress}`);
  }
  
  console.log('\n✨ Deployment completed successfully!');
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });