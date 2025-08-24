import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Deploying Blockchain Digital Identity Framework...");

  // Get the ContractFactory and Signers here.
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy DigitalIdentityRegistry
  console.log("\n1. Deploying DigitalIdentityRegistry...");
  const DigitalIdentityRegistry = await ethers.getContractFactory("DigitalIdentityRegistry");
  const identityRegistry = await DigitalIdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log("DigitalIdentityRegistry deployed to:", identityRegistryAddress);

  // Deploy ZKVerificationContract
  console.log("\n2. Deploying ZKVerificationContract...");
  const ZKVerificationContract = await ethers.getContractFactory("ZKVerificationContract");
  const zkVerification = await ZKVerificationContract.deploy();
  await zkVerification.waitForDeployment();
  const zkVerificationAddress = await zkVerification.getAddress();
  console.log("ZKVerificationContract deployed to:", zkVerificationAddress);

  // Deploy PrivacyPreservingCredentials
  console.log("\n3. Deploying PrivacyPreservingCredentials...");
  const PrivacyPreservingCredentials = await ethers.getContractFactory("PrivacyPreservingCredentials");
  const privacyCredentials = await PrivacyPreservingCredentials.deploy();
  await privacyCredentials.waitForDeployment();
  const privacyCredentialsAddress = await privacyCredentials.getAddress();
  console.log("PrivacyPreservingCredentials deployed to:", privacyCredentialsAddress);

  // Setup roles
  console.log("\n4. Setting up roles...");
  
  // Grant deployer all roles for initial setup
  await identityRegistry.grantIssuerRole(deployer.address);
  await identityRegistry.grantVerifierRole(deployer.address);
  
  await zkVerification.grantVerifierRole(deployer.address);
  
  await privacyCredentials.grantIssuerRole(deployer.address);
  await privacyCredentials.grantVerifierRole(deployer.address);

  console.log("Roles granted to deployer address");

  // Save deployment addresses to file
  const deploymentInfo = {
    network: await deployer.provider.getNetwork(),
    deployer: deployer.address,
    contracts: {
      DigitalIdentityRegistry: identityRegistryAddress,
      ZKVerificationContract: zkVerificationAddress,
      PrivacyPreservingCredentials: privacyCredentialsAddress,
    },
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName = (await deployer.provider.getNetwork()).name;
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log(`\nDeployment info saved to: ${deploymentFile}`);

  // Verify contracts on Etherscan if not local network
  if (networkName !== "localhost" && networkName !== "hardhat") {
    console.log("\nWaiting for block confirmations...");
    await identityRegistry.deploymentTransaction()?.wait(5);
    await zkVerification.deploymentTransaction()?.wait(5);
    await privacyCredentials.deploymentTransaction()?.wait(5);

    console.log("Verifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: identityRegistryAddress,
        constructorArguments: [],
      });
      console.log("DigitalIdentityRegistry verified");
    } catch (error) {
      console.log("DigitalIdentityRegistry verification failed:", error);
    }

    try {
      await hre.run("verify:verify", {
        address: zkVerificationAddress,
        constructorArguments: [],
      });
      console.log("ZKVerificationContract verified");
    } catch (error) {
      console.log("ZKVerificationContract verification failed:", error);
    }

    try {
      await hre.run("verify:verify", {
        address: privacyCredentialsAddress,
        constructorArguments: [],
      });
      console.log("PrivacyPreservingCredentials verified");
    } catch (error) {
      console.log("PrivacyPreservingCredentials verification failed:", error);
    }
  }

  console.log("\n✅ Deployment completed successfully!");
  console.log("\nContract Addresses:");
  console.log("==================");
  console.log(`DigitalIdentityRegistry: ${identityRegistryAddress}`);
  console.log(`ZKVerificationContract: ${zkVerificationAddress}`);
  console.log(`PrivacyPreservingCredentials: ${privacyCredentialsAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });