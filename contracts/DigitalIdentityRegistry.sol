// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title DigitalIdentityRegistry
 * @dev Main contract for managing decentralized digital identities
 * Implements W3C DID standard and privacy-preserving mechanisms
 */
contract DigitalIdentityRegistry is AccessControl, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    // Roles
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Counters
    Counters.Counter private _identityCounter;
    Counters.Counter private _credentialCounter;

    // Structs
    struct Identity {
        address owner;
        string didDocument;
        uint256 createdAt;
        uint256 updatedAt;
        bool isActive;
        bytes32[] credentials;
    }

    struct Credential {
        uint256 id;
        address issuer;
        address subject;
        string credentialType;
        bytes32 credentialHash;
        uint256 issuedAt;
        uint256 expiresAt;
        bool isRevoked;
        string zkProofHash; // Hash of zero-knowledge proof
    }

    struct VerificationRequest {
        address verifier;
        address subject;
        string[] requiredAttributes;
        uint256 requestedAt;
        bool isCompleted;
    }

    // Mappings
    mapping(address => uint256) public addressToIdentityId;
    mapping(uint256 => Identity) public identities;
    mapping(bytes32 => Credential) public credentials;
    mapping(bytes32 => VerificationRequest) public verificationRequests;
    mapping(address => mapping(string => bool)) public revokedCredentials;

    // Events
    event IdentityCreated(
        uint256 indexed identityId,
        address indexed owner,
        string didDocument
    );

    event IdentityUpdated(
        uint256 indexed identityId,
        address indexed owner,
        string newDidDocument
    );

    event CredentialIssued(
        bytes32 indexed credentialId,
        address indexed issuer,
        address indexed subject,
        string credentialType
    );

    event CredentialRevoked(
        bytes32 indexed credentialId,
        address indexed issuer,
        address indexed subject
    );

    event VerificationRequested(
        bytes32 indexed requestId,
        address indexed verifier,
        address indexed subject
    );

    event VerificationCompleted(
        bytes32 indexed requestId,
        address indexed verifier,
        address indexed subject,
        bool success
    );

    // Modifiers
    modifier onlyIdentityOwner(uint256 identityId) {
        require(
            identities[identityId].owner == msg.sender,
            "Not the identity owner"
        );
        _;
    }

    modifier identityExists(uint256 identityId) {
        require(identities[identityId].owner != address(0), "Identity does not exist");
        _;
    }

    modifier credentialExists(bytes32 credentialId) {
        require(credentials[credentialId].issuer != address(0), "Credential does not exist");
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Create a new digital identity
     * @param didDocument The DID document JSON string
     */
    function createIdentity(string memory didDocument) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        require(addressToIdentityId[msg.sender] == 0, "Identity already exists");
        require(bytes(didDocument).length > 0, "DID document cannot be empty");

        _identityCounter.increment();
        uint256 identityId = _identityCounter.current();

        identities[identityId] = Identity({
            owner: msg.sender,
            didDocument: didDocument,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            isActive: true,
            credentials: new bytes32[](0)
        });

        addressToIdentityId[msg.sender] = identityId;

        emit IdentityCreated(identityId, msg.sender, didDocument);
    }

    /**
     * @dev Update an existing identity's DID document
     * @param identityId The identity ID
     * @param newDidDocument The new DID document
     */
    function updateIdentity(uint256 identityId, string memory newDidDocument)
        external
        whenNotPaused
        nonReentrant
        onlyIdentityOwner(identityId)
        identityExists(identityId)
    {
        require(bytes(newDidDocument).length > 0, "DID document cannot be empty");

        identities[identityId].didDocument = newDidDocument;
        identities[identityId].updatedAt = block.timestamp;

        emit IdentityUpdated(identityId, msg.sender, newDidDocument);
    }

    /**
     * @dev Issue a verifiable credential
     * @param subject The credential subject's address
     * @param credentialType The type of credential
     * @param credentialHash Hash of the credential data
     * @param expiresAt Expiration timestamp
     * @param zkProofHash Hash of the zero-knowledge proof
     */
    function issueCredential(
        address subject,
        string memory credentialType,
        bytes32 credentialHash,
        uint256 expiresAt,
        string memory zkProofHash
    ) 
        external 
        whenNotPaused 
        nonReentrant 
        onlyRole(ISSUER_ROLE) 
    {
        require(subject != address(0), "Invalid subject address");
        require(bytes(credentialType).length > 0, "Credential type cannot be empty");
        require(expiresAt > block.timestamp, "Expiration must be in the future");
        require(addressToIdentityId[subject] != 0, "Subject must have an identity");

        _credentialCounter.increment();
        uint256 credentialId = _credentialCounter.current();
        bytes32 credentialKey = keccak256(abi.encodePacked(msg.sender, subject, credentialId));

        credentials[credentialKey] = Credential({
            id: credentialId,
            issuer: msg.sender,
            subject: subject,
            credentialType: credentialType,
            credentialHash: credentialHash,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            isRevoked: false,
            zkProofHash: zkProofHash
        });

        // Add credential to subject's identity
        uint256 identityId = addressToIdentityId[subject];
        identities[identityId].credentials.push(credentialKey);

        emit CredentialIssued(credentialKey, msg.sender, subject, credentialType);
    }

    /**
     * @dev Revoke a credential
     * @param credentialId The credential ID to revoke
     */
    function revokeCredential(bytes32 credentialId)
        external
        whenNotPaused
        nonReentrant
        credentialExists(credentialId)
    {
        Credential storage credential = credentials[credentialId];
        require(
            credential.issuer == msg.sender || 
            hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized to revoke this credential"
        );
        require(!credential.isRevoked, "Credential already revoked");

        credential.isRevoked = true;
        revokedCredentials[credential.subject][credential.credentialType] = true;

        emit CredentialRevoked(credentialId, credential.issuer, credential.subject);
    }

    /**
     * @dev Request verification from a subject
     * @param subject The subject to verify
     * @param requiredAttributes The attributes required for verification
     */
    function requestVerification(
        address subject,
        string[] memory requiredAttributes
    ) 
        external 
        whenNotPaused 
        nonReentrant 
        onlyRole(VERIFIER_ROLE) 
    {
        require(subject != address(0), "Invalid subject address");
        require(requiredAttributes.length > 0, "Must specify required attributes");
        require(addressToIdentityId[subject] != 0, "Subject must have an identity");

        bytes32 requestId = keccak256(
            abi.encodePacked(msg.sender, subject, block.timestamp)
        );

        verificationRequests[requestId] = VerificationRequest({
            verifier: msg.sender,
            subject: subject,
            requiredAttributes: requiredAttributes,
            requestedAt: block.timestamp,
            isCompleted: false
        });

        emit VerificationRequested(requestId, msg.sender, subject);
    }

    /**
     * @dev Complete a verification request
     * @param requestId The verification request ID
     * @param success Whether the verification was successful
     */
    function completeVerification(bytes32 requestId, bool success)
        external
        whenNotPaused
        nonReentrant
    {
        VerificationRequest storage request = verificationRequests[requestId];
        require(
            request.subject == msg.sender || 
            request.verifier == msg.sender ||
            hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized to complete this verification"
        );
        require(!request.isCompleted, "Verification already completed");

        request.isCompleted = true;

        emit VerificationCompleted(requestId, request.verifier, request.subject, success);
    }

    /**
     * @dev Get identity by ID
     * @param identityId The identity ID
     */
    function getIdentity(uint256 identityId)
        external
        view
        identityExists(identityId)
        returns (Identity memory)
    {
        return identities[identityId];
    }

    /**
     * @dev Get credential by ID
     * @param credentialId The credential ID
     */
    function getCredential(bytes32 credentialId)
        external
        view
        credentialExists(credentialId)
        returns (Credential memory)
    {
        return credentials[credentialId];
    }

    /**
     * @dev Check if a credential is valid (not revoked and not expired)
     * @param credentialId The credential ID
     */
    function isCredentialValid(bytes32 credentialId)
        external
        view
        credentialExists(credentialId)
        returns (bool)
    {
        Credential memory credential = credentials[credentialId];
        return !credential.isRevoked && credential.expiresAt > block.timestamp;
    }

    /**
     * @dev Get the number of identities
     */
    function getIdentityCount() external view returns (uint256) {
        return _identityCounter.current();
    }

    /**
     * @dev Get the number of credentials
     */
    function getCredentialCount() external view returns (uint256) {
        return _credentialCounter.current();
    }

    /**
     * @dev Pause the contract (Admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract (Admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Grant issuer role
     * @param account The account to grant the role to
     */
    function grantIssuerRole(address account) external onlyRole(ADMIN_ROLE) {
        grantRole(ISSUER_ROLE, account);
    }

    /**
     * @dev Grant verifier role
     * @param account The account to grant the role to
     */
    function grantVerifierRole(address account) external onlyRole(ADMIN_ROLE) {
        grantRole(VERIFIER_ROLE, account);
    }
}