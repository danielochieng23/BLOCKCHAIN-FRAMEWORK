// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDigitalIdentity {
    struct Identity {
        bytes32 did; // Decentralized Identifier
        address owner;
        bytes32 dataHash; // Hash of encrypted identity data
        uint256 createdAt;
        uint256 updatedAt;
        bool isActive;
        mapping(bytes32 => Credential) credentials;
    }

    struct Credential {
        bytes32 credentialHash;
        address issuer;
        uint256 issuedAt;
        uint256 expiresAt;
        bool isRevoked;
        bytes32 merkleRoot; // For selective disclosure
    }

    struct VerificationRequest {
        bytes32 requestId;
        address verifier;
        bytes32[] requestedAttributes;
        uint256 timestamp;
        bool isCompleted;
    }

    event IdentityCreated(bytes32 indexed did, address indexed owner);
    event IdentityUpdated(bytes32 indexed did, bytes32 newDataHash);
    event CredentialIssued(bytes32 indexed did, bytes32 indexed credentialId, address indexed issuer);
    event CredentialRevoked(bytes32 indexed did, bytes32 indexed credentialId);
    event VerificationRequested(bytes32 indexed requestId, bytes32 indexed did, address indexed verifier);
    event VerificationCompleted(bytes32 indexed requestId, bool success);

    function createIdentity(bytes32 did, bytes32 dataHash) external;
    function updateIdentity(bytes32 did, bytes32 newDataHash) external;
    function issueCredential(
        bytes32 did,
        bytes32 credentialId,
        bytes32 credentialHash,
        uint256 expiresAt,
        bytes32 merkleRoot
    ) external;
    function revokeCredential(bytes32 did, bytes32 credentialId) external;
    function requestVerification(
        bytes32 did,
        bytes32[] calldata requestedAttributes
    ) external returns (bytes32 requestId);
    function submitVerificationProof(
        bytes32 requestId,
        bytes calldata proof
    ) external;
    function getIdentity(bytes32 did) external view returns (
        address owner,
        bytes32 dataHash,
        uint256 createdAt,
        uint256 updatedAt,
        bool isActive
    );
    function getCredential(bytes32 did, bytes32 credentialId) external view returns (
        bytes32 credentialHash,
        address issuer,
        uint256 issuedAt,
        uint256 expiresAt,
        bool isRevoked,
        bytes32 merkleRoot
    );
}