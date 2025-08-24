import { expect } from "chai";
import { ethers } from "hardhat";
import { DigitalIdentityRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("DigitalIdentityRegistry", function () {
  let identityRegistry: DigitalIdentityRegistry;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let issuer: SignerWithAddress;
  let verifier: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, issuer, verifier] = await ethers.getSigners();

    const DigitalIdentityRegistry = await ethers.getContractFactory("DigitalIdentityRegistry");
    identityRegistry = await DigitalIdentityRegistry.deploy();
    await identityRegistry.waitForDeployment();

    // Grant roles
    await identityRegistry.grantIssuerRole(issuer.address);
    await identityRegistry.grantVerifierRole(verifier.address);
  });

  describe("Identity Creation", function () {
    it("Should create a new identity", async function () {
      const didDocument = JSON.stringify({
        "@context": ["https://www.w3.org/ns/did/v1"],
        id: "did:blockchain:test123",
        controller: user1.address
      });

      await expect(identityRegistry.connect(user1).createIdentity(didDocument))
        .to.emit(identityRegistry, "IdentityCreated");

      const identityId = await identityRegistry.addressToIdentityId(user1.address);
      expect(identityId).to.equal(1);

      const identity = await identityRegistry.getIdentity(identityId);
      expect(identity.owner).to.equal(user1.address);
      expect(identity.isActive).to.be.true;
    });

    it("Should not allow duplicate identities", async function () {
      const didDocument = JSON.stringify({
        "@context": ["https://www.w3.org/ns/did/v1"],
        id: "did:blockchain:test123"
      });

      await identityRegistry.connect(user1).createIdentity(didDocument);

      await expect(
        identityRegistry.connect(user1).createIdentity(didDocument)
      ).to.be.revertedWith("Identity already exists");
    });

    it("Should reject empty DID document", async function () {
      await expect(
        identityRegistry.connect(user1).createIdentity("")
      ).to.be.revertedWith("DID document cannot be empty");
    });
  });

  describe("Identity Updates", function () {
    beforeEach(async function () {
      const didDocument = JSON.stringify({
        "@context": ["https://www.w3.org/ns/did/v1"],
        id: "did:blockchain:test123"
      });
      await identityRegistry.connect(user1).createIdentity(didDocument);
    });

    it("Should allow owner to update identity", async function () {
      const newDidDocument = JSON.stringify({
        "@context": ["https://www.w3.org/ns/did/v1"],
        id: "did:blockchain:test123-updated"
      });

      const identityId = await identityRegistry.addressToIdentityId(user1.address);
      
      await expect(
        identityRegistry.connect(user1).updateIdentity(identityId, newDidDocument)
      ).to.emit(identityRegistry, "IdentityUpdated");

      const identity = await identityRegistry.getIdentity(identityId);
      expect(identity.didDocument).to.equal(newDidDocument);
    });

    it("Should not allow non-owner to update identity", async function () {
      const newDidDocument = JSON.stringify({
        "@context": ["https://www.w3.org/ns/did/v1"],
        id: "did:blockchain:test123-updated"
      });

      const identityId = await identityRegistry.addressToIdentityId(user1.address);
      
      await expect(
        identityRegistry.connect(user2).updateIdentity(identityId, newDidDocument)
      ).to.be.revertedWith("Not the identity owner");
    });
  });

  describe("Credential Management", function () {
    beforeEach(async function () {
      const didDocument = JSON.stringify({
        "@context": ["https://www.w3.org/ns/did/v1"],
        id: "did:blockchain:test123"
      });
      await identityRegistry.connect(user1).createIdentity(didDocument);
    });

    it("Should allow issuer to issue credentials", async function () {
      const credentialHash = ethers.keccak256(ethers.toUtf8Bytes("credential-data"));
      const expiresAt = Math.floor(Date.now() / 1000) + 86400; // 24 hours
      const zkProofHash = "test-zk-proof-hash";

      await expect(
        identityRegistry.connect(issuer).issueCredential(
          user1.address,
          "AgeVerification",
          credentialHash,
          expiresAt,
          zkProofHash
        )
      ).to.emit(identityRegistry, "CredentialIssued");

      const credentialCount = await identityRegistry.getCredentialCount();
      expect(credentialCount).to.equal(1);
    });

    it("Should not allow non-issuer to issue credentials", async function () {
      const credentialHash = ethers.keccak256(ethers.toUtf8Bytes("credential-data"));
      const expiresAt = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        identityRegistry.connect(user2).issueCredential(
          user1.address,
          "AgeVerification",
          credentialHash,
          expiresAt,
          "test-proof"
        )
      ).to.be.reverted;
    });

    it("Should allow issuer to revoke credentials", async function () {
      const credentialHash = ethers.keccak256(ethers.toUtf8Bytes("credential-data"));
      const expiresAt = Math.floor(Date.now() / 1000) + 86400;
      
      await identityRegistry.connect(issuer).issueCredential(
        user1.address,
        "AgeVerification",
        credentialHash,
        expiresAt,
        "test-proof"
      );

      // Get the credential ID (simplified for test)
      const credentialId = ethers.keccak256(
        ethers.solidityPacked(["address", "address", "uint256"], [issuer.address, user1.address, 1])
      );

      await expect(
        identityRegistry.connect(issuer).revokeCredential(credentialId)
      ).to.emit(identityRegistry, "CredentialRevoked");
    });
  });

  describe("Verification Requests", function () {
    beforeEach(async function () {
      const didDocument = JSON.stringify({
        "@context": ["https://www.w3.org/ns/did/v1"],
        id: "did:blockchain:test123"
      });
      await identityRegistry.connect(user1).createIdentity(didDocument);
    });

    it("Should allow verifier to request verification", async function () {
      const requiredAttributes = ["age", "location"];

      await expect(
        identityRegistry.connect(verifier).requestVerification(
          user1.address,
          requiredAttributes
        )
      ).to.emit(identityRegistry, "VerificationRequested");
    });

    it("Should not allow non-verifier to request verification", async function () {
      const requiredAttributes = ["age", "location"];

      await expect(
        identityRegistry.connect(user2).requestVerification(
          user1.address,
          requiredAttributes
        )
      ).to.be.reverted;
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to grant issuer role", async function () {
      await identityRegistry.grantIssuerRole(user1.address);
      expect(await identityRegistry.hasRole(await identityRegistry.ISSUER_ROLE(), user1.address))
        .to.be.true;
    });

    it("Should allow admin to grant verifier role", async function () {
      await identityRegistry.grantVerifierRole(user1.address);
      expect(await identityRegistry.hasRole(await identityRegistry.VERIFIER_ROLE(), user1.address))
        .to.be.true;
    });

    it("Should allow admin to pause contract", async function () {
      await identityRegistry.pause();
      expect(await identityRegistry.paused()).to.be.true;
    });

    it("Should not allow non-admin to pause contract", async function () {
      await expect(
        identityRegistry.connect(user1).pause()
      ).to.be.reverted;
    });
  });

  describe("Gas Usage", function () {
    it("Should track gas usage for identity creation", async function () {
      const didDocument = JSON.stringify({
        "@context": ["https://www.w3.org/ns/did/v1"],
        id: "did:blockchain:test123"
      });

      const tx = await identityRegistry.connect(user1).createIdentity(didDocument);
      const receipt = await tx.wait();
      
      console.log(`Identity creation gas used: ${receipt?.gasUsed}`);
      expect(receipt?.gasUsed).to.be.lessThan(500000); // Reasonable gas limit
    });

    it("Should track gas usage for credential issuance", async function () {
      // First create identity
      const didDocument = JSON.stringify({
        "@context": ["https://www.w3.org/ns/did/v1"],
        id: "did:blockchain:test123"
      });
      await identityRegistry.connect(user1).createIdentity(didDocument);

      // Then issue credential
      const credentialHash = ethers.keccak256(ethers.toUtf8Bytes("credential-data"));
      const expiresAt = Math.floor(Date.now() / 1000) + 86400;
      
      const tx = await identityRegistry.connect(issuer).issueCredential(
        user1.address,
        "AgeVerification",
        credentialHash,
        expiresAt,
        "test-proof"
      );
      const receipt = await tx.wait();
      
      console.log(`Credential issuance gas used: ${receipt?.gasUsed}`);
      expect(receipt?.gasUsed).to.be.lessThan(300000); // Reasonable gas limit
    });
  });
});