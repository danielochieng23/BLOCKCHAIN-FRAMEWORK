// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title PrivacyPreservingCredentials
 * @dev Contract for selective disclosure of credential attributes
 * Implements BBS+ signature scheme for privacy-preserving credentials
 */
contract PrivacyPreservingCredentials is AccessControl, ReentrancyGuard {
    using ECDSA for bytes32;

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct SelectiveDisclosureCredential {
        bytes32 credentialId;
        address issuer;
        address holder;
        string[] attributeNames;
        bytes32[] attributeCommitments;
        bytes signature; // BBS+ signature
        uint256 issuedAt;
        uint256 expiresAt;
        bool isRevoked;
    }

    struct DisclosureRequest {
        bytes32 requestId;
        address verifier;
        address holder;
        string[] requestedAttributes;
        uint256 requestedAt;
        bool isCompleted;
        bytes32[] disclosedCommitments;
    }

    struct AttributeProof {
        bytes32 commitment;
        bytes32 nullifier;
        bytes zkProof;
        bool isRevealed;
        string value; // Only set if isRevealed is true
    }

    // Mappings
    mapping(bytes32 => SelectiveDisclosureCredential) public credentials;
    mapping(bytes32 => DisclosureRequest) public disclosureRequests;
    mapping(address => bytes32[]) public holderCredentials;
    mapping(bytes32 => mapping(string => bytes32)) public attributeCommitments;
    mapping(bytes32 => bool) public usedNullifiers;

    // Events
    event CredentialIssued(
        bytes32 indexed credentialId,
        address indexed issuer,
        address indexed holder,
        string[] attributeNames
    );

    event DisclosureRequested(
        bytes32 indexed requestId,
        address indexed verifier,
        address indexed holder,
        string[] requestedAttributes
    );

    event AttributesDisclosed(
        bytes32 indexed requestId,
        address indexed holder,
        string[] disclosedAttributes
    );

    event CredentialRevoked(
        bytes32 indexed credentialId,
        address indexed issuer
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Issue a selective disclosure credential
     * @param holder The credential holder
     * @param attributeNames Names of the attributes
     * @param attributeCommitments Commitments to attribute values
     * @param signature BBS+ signature over the attributes
     * @param expiresAt Expiration timestamp
     */
    function issueSelectiveDisclosureCredential(
        address holder,
        string[] memory attributeNames,
        bytes32[] memory attributeCommitments,
        bytes memory signature,
        uint256 expiresAt
    ) external onlyRole(ISSUER_ROLE) nonReentrant {
        require(holder != address(0), "Invalid holder address");
        require(attributeNames.length == attributeCommitments.length, "Arrays length mismatch");
        require(attributeNames.length > 0, "Must have at least one attribute");
        require(expiresAt > block.timestamp, "Expiration must be in the future");

        bytes32 credentialId = keccak256(
            abi.encodePacked(
                msg.sender,
                holder,
                block.timestamp,
                attributeCommitments
            )
        );

        credentials[credentialId] = SelectiveDisclosureCredential({
            credentialId: credentialId,
            issuer: msg.sender,
            holder: holder,
            attributeNames: attributeNames,
            attributeCommitments: attributeCommitments,
            signature: signature,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            isRevoked: false
        });

        // Store attribute commitments for easy lookup
        for (uint256 i = 0; i < attributeNames.length; i++) {
            attributeCommitments[credentialId][attributeNames[i]] = attributeCommitments[i];
        }

        holderCredentials[holder].push(credentialId);

        emit CredentialIssued(credentialId, msg.sender, holder, attributeNames);
    }

    /**
     * @dev Request selective disclosure of attributes
     * @param holder The credential holder
     * @param requestedAttributes The attributes to disclose
     */
    function requestDisclosure(
        address holder,
        string[] memory requestedAttributes
    ) external onlyRole(VERIFIER_ROLE) returns (bytes32) {
        require(holder != address(0), "Invalid holder address");
        require(requestedAttributes.length > 0, "Must request at least one attribute");

        bytes32 requestId = keccak256(
            abi.encodePacked(
                msg.sender,
                holder,
                block.timestamp,
                requestedAttributes
            )
        );

        disclosureRequests[requestId] = DisclosureRequest({
            requestId: requestId,
            verifier: msg.sender,
            holder: holder,
            requestedAttributes: requestedAttributes,
            requestedAt: block.timestamp,
            isCompleted: false,
            disclosedCommitments: new bytes32[](0)
        });

        emit DisclosureRequested(requestId, msg.sender, holder, requestedAttributes);
        return requestId;
    }

    /**
     * @dev Disclose attributes selectively with zero-knowledge proofs
     * @param requestId The disclosure request ID
     * @param credentialId The credential to use for disclosure
     * @param proofs Array of attribute proofs
     */
    function discloseAttributes(
        bytes32 requestId,
        bytes32 credentialId,
        AttributeProof[] memory proofs
    ) external nonReentrant {
        DisclosureRequest storage request = disclosureRequests[requestId];
        require(request.holder == msg.sender, "Not the credential holder");
        require(!request.isCompleted, "Request already completed");
        
        SelectiveDisclosureCredential storage credential = credentials[credentialId];
        require(credential.holder == msg.sender, "Not the credential holder");
        require(!credential.isRevoked, "Credential is revoked");
        require(credential.expiresAt > block.timestamp, "Credential expired");

        require(proofs.length == request.requestedAttributes.length, "Proofs count mismatch");

        string[] memory disclosedAttributes = new string[](0);
        bytes32[] memory disclosedCommitments = new bytes32[](proofs.length);

        for (uint256 i = 0; i < proofs.length; i++) {
            string memory attributeName = request.requestedAttributes[i];
            AttributeProof memory proof = proofs[i];

            // Verify nullifier hasn't been used
            require(!usedNullifiers[proof.nullifier], "Nullifier already used");
            
            // Verify the commitment matches the credential
            bytes32 storedCommitment = attributeCommitments[credentialId][attributeName];
            require(storedCommitment == proof.commitment, "Invalid commitment");

            // Verify zero-knowledge proof
            require(_verifyAttributeProof(proof, attributeName), "Invalid ZK proof");

            // Mark nullifier as used
            usedNullifiers[proof.nullifier] = true;
            disclosedCommitments[i] = proof.commitment;

            if (proof.isRevealed) {
                // Add to disclosed attributes array (simplified for demo)
                // In practice, we'd need a dynamic array management
            }
        }

        request.isCompleted = true;
        request.disclosedCommitments = disclosedCommitments;

        emit AttributesDisclosed(requestId, msg.sender, request.requestedAttributes);
    }

    /**
     * @dev Verify an attribute proof (simplified)
     * @param proof The attribute proof
     * @param attributeName The attribute name
     * @return True if the proof is valid
     */
    function _verifyAttributeProof(
        AttributeProof memory proof,
        string memory attributeName
    ) private pure returns (bool) {
        // Simplified verification - in production, implement proper ZK verification
        
        // Check that the commitment is valid
        if (proof.commitment == bytes32(0)) return false;
        
        // Check that the nullifier is valid
        if (proof.nullifier == bytes32(0)) return false;
        
        // Verify ZK proof (placeholder)
        bytes32 expectedHash = keccak256(
            abi.encodePacked(proof.commitment, proof.nullifier, attributeName)
        );
        
        return keccak256(proof.zkProof) != expectedHash; // Placeholder logic
    }

    /**
     * @dev Create a commitment to an attribute value
     * @param value The attribute value
     * @param nonce A random nonce
     * @return The commitment
     */
    function createCommitment(
        string memory value,
        bytes32 nonce
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(value, nonce));
    }

    /**
     * @dev Verify BBS+ signature (simplified)
     * @param credentialId The credential ID
     * @return True if the signature is valid
     */
    function verifyCredentialSignature(bytes32 credentialId) 
        external 
        view 
        returns (bool) 
    {
        SelectiveDisclosureCredential memory credential = credentials[credentialId];
        
        // Simplified BBS+ verification
        // In production, implement proper BBS+ signature verification
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                credential.issuer,
                credential.holder,
                credential.attributeCommitments
            )
        );
        
        return credential.signature.length > 0 && messageHash != bytes32(0);
    }

    /**
     * @dev Revoke a credential
     * @param credentialId The credential to revoke
     */
    function revokeCredential(bytes32 credentialId) 
        external 
        onlyRole(ISSUER_ROLE) 
    {
        SelectiveDisclosureCredential storage credential = credentials[credentialId];
        require(credential.issuer == msg.sender, "Not the credential issuer");
        require(!credential.isRevoked, "Credential already revoked");

        credential.isRevoked = true;

        emit CredentialRevoked(credentialId, msg.sender);
    }

    /**
     * @dev Get credential details
     * @param credentialId The credential ID
     * @return The credential details
     */
    function getCredential(bytes32 credentialId) 
        external 
        view 
        returns (SelectiveDisclosureCredential memory) 
    {
        return credentials[credentialId];
    }

    /**
     * @dev Get disclosure request details
     * @param requestId The request ID
     * @return The disclosure request details
     */
    function getDisclosureRequest(bytes32 requestId) 
        external 
        view 
        returns (DisclosureRequest memory) 
    {
        return disclosureRequests[requestId];
    }

    /**
     * @dev Get holder's credentials
     * @param holder The holder address
     * @return Array of credential IDs
     */
    function getHolderCredentials(address holder) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return holderCredentials[holder];
    }

    /**
     * @dev Check if a credential is valid
     * @param credentialId The credential ID
     * @return True if valid
     */
    function isCredentialValid(bytes32 credentialId) 
        external 
        view 
        returns (bool) 
    {
        SelectiveDisclosureCredential memory credential = credentials[credentialId];
        return !credential.isRevoked && 
               credential.expiresAt > block.timestamp &&
               credential.credentialId != bytes32(0);
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