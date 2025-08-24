// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IDigitalIdentity.sol";

contract DigitalIdentityRegistry is IDigitalIdentity, AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    
    mapping(bytes32 => Identity) private identities;
    mapping(bytes32 => VerificationRequest) private verificationRequests;
    mapping(address => bytes32[]) private ownerIdentities;
    mapping(address => bool) public trustedIssuers;
    
    uint256 private nonce;
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    modifier onlyIdentityOwner(bytes32 did) {
        require(identities[did].owner == msg.sender, "Not the identity owner");
        _;
    }
    
    modifier onlyActiveIdentity(bytes32 did) {
        require(identities[did].isActive, "Identity is not active");
        _;
    }
    
    function createIdentity(
        bytes32 did,
        bytes32 dataHash
    ) external override nonReentrant whenNotPaused {
        require(identities[did].owner == address(0), "Identity already exists");
        require(did != bytes32(0), "Invalid DID");
        
        Identity storage newIdentity = identities[did];
        newIdentity.did = did;
        newIdentity.owner = msg.sender;
        newIdentity.dataHash = dataHash;
        newIdentity.createdAt = block.timestamp;
        newIdentity.updatedAt = block.timestamp;
        newIdentity.isActive = true;
        
        ownerIdentities[msg.sender].push(did);
        
        emit IdentityCreated(did, msg.sender);
    }
    
    function updateIdentity(
        bytes32 did,
        bytes32 newDataHash
    ) external override onlyIdentityOwner(did) onlyActiveIdentity(did) whenNotPaused {
        Identity storage identity = identities[did];
        identity.dataHash = newDataHash;
        identity.updatedAt = block.timestamp;
        
        emit IdentityUpdated(did, newDataHash);
    }
    
    function issueCredential(
        bytes32 did,
        bytes32 credentialId,
        bytes32 credentialHash,
        uint256 expiresAt,
        bytes32 merkleRoot
    ) external override onlyRole(ISSUER_ROLE) onlyActiveIdentity(did) whenNotPaused {
        require(trustedIssuers[msg.sender], "Not a trusted issuer");
        require(expiresAt > block.timestamp, "Invalid expiration date");
        
        Credential storage credential = identities[did].credentials[credentialId];
        require(credential.issuer == address(0), "Credential already exists");
        
        credential.credentialHash = credentialHash;
        credential.issuer = msg.sender;
        credential.issuedAt = block.timestamp;
        credential.expiresAt = expiresAt;
        credential.isRevoked = false;
        credential.merkleRoot = merkleRoot;
        
        emit CredentialIssued(did, credentialId, msg.sender);
    }
    
    function revokeCredential(
        bytes32 did,
        bytes32 credentialId
    ) external override whenNotPaused {
        Credential storage credential = identities[did].credentials[credentialId];
        require(
            credential.issuer == msg.sender || 
            identities[did].owner == msg.sender ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to revoke"
        );
        require(!credential.isRevoked, "Already revoked");
        
        credential.isRevoked = true;
        
        emit CredentialRevoked(did, credentialId);
    }
    
    function requestVerification(
        bytes32 did,
        bytes32[] calldata requestedAttributes
    ) external override onlyRole(VERIFIER_ROLE) onlyActiveIdentity(did) returns (bytes32 requestId) {
        nonce++;
        requestId = keccak256(abi.encodePacked(did, msg.sender, nonce, block.timestamp));
        
        VerificationRequest storage request = verificationRequests[requestId];
        request.requestId = requestId;
        request.verifier = msg.sender;
        request.requestedAttributes = requestedAttributes;
        request.timestamp = block.timestamp;
        request.isCompleted = false;
        
        emit VerificationRequested(requestId, did, msg.sender);
    }
    
    function submitVerificationProof(
        bytes32 requestId,
        bytes calldata proof
    ) external override whenNotPaused {
        VerificationRequest storage request = verificationRequests[requestId];
        require(request.verifier != address(0), "Invalid request");
        require(!request.isCompleted, "Request already completed");
        
        // In a real implementation, this would verify the zero-knowledge proof
        // For now, we'll assume the proof is valid
        bool isValid = proof.length > 0;
        
        request.isCompleted = true;
        
        emit VerificationCompleted(requestId, isValid);
    }
    
    function getIdentity(bytes32 did) external view override returns (
        address owner,
        bytes32 dataHash,
        uint256 createdAt,
        uint256 updatedAt,
        bool isActive
    ) {
        Identity storage identity = identities[did];
        return (
            identity.owner,
            identity.dataHash,
            identity.createdAt,
            identity.updatedAt,
            identity.isActive
        );
    }
    
    function getCredential(
        bytes32 did,
        bytes32 credentialId
    ) external view override returns (
        bytes32 credentialHash,
        address issuer,
        uint256 issuedAt,
        uint256 expiresAt,
        bool isRevoked,
        bytes32 merkleRoot
    ) {
        Credential storage credential = identities[did].credentials[credentialId];
        return (
            credential.credentialHash,
            credential.issuer,
            credential.issuedAt,
            credential.expiresAt,
            credential.isRevoked,
            credential.merkleRoot
        );
    }
    
    function addTrustedIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        trustedIssuers[issuer] = true;
        _grantRole(ISSUER_ROLE, issuer);
    }
    
    function removeTrustedIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        trustedIssuers[issuer] = false;
        _revokeRole(ISSUER_ROLE, issuer);
    }
    
    function addVerifier(address verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, verifier);
    }
    
    function removeVerifier(address verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VERIFIER_ROLE, verifier);
    }
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    function getOwnerIdentities(address owner) external view returns (bytes32[] memory) {
        return ownerIdentities[owner];
    }
}