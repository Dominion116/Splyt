// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SplytSession {
    struct Member {
        address addr;
        uint256 amountDue;
        bool paid;
    }

    struct Session {
        bytes32 id;
        address host;
        uint256 total;
        uint256 createdAt;
        uint256 expiresAt;
        bool active;
        Member[] members;
    }

    mapping(bytes32 => Session) public sessions;
    mapping(bytes32 => mapping(address => uint256)) public memberIndex;

    event SessionCreated(bytes32 indexed sessionId, address indexed host, uint256 total);
    event MemberPaid(bytes32 indexed sessionId, address indexed member, uint256 amount);
    event SessionClosed(bytes32 indexed sessionId);

    error SessionNotFound();
    error SessionExpired();
    error SessionInactive();
    error MemberNotFound();
    error AlreadyPaid();
    error NotHost();
    error NotMember();

    /// @notice Creates a split session and stores due amounts for each member.
    /// @param id Unique session identifier.
    /// @param members Member wallet addresses.
    /// @param amounts Corresponding amount due for each member in base units.
    /// @param total Total amount expected for the session.
    /// @param expiresAt UNIX timestamp when the session expires.
    function createSession(
        bytes32 id,
        address[] calldata members,
        uint256[] calldata amounts,
        uint256 total,
        uint256 expiresAt
    ) external {
        if (members.length != amounts.length) revert("LENGTH_MISMATCH");
        if (expiresAt <= block.timestamp) revert("INVALID_EXPIRY");

        Session storage session = sessions[id];
        if (session.id != bytes32(0)) revert("SESSION_EXISTS");

        uint256 sum;
        for (uint256 i = 0; i < members.length; i++) {
            session.members.push(Member({addr: members[i], amountDue: amounts[i], paid: false}));
            memberIndex[id][members[i]] = i + 1;
            sum += amounts[i];
        }

        if (sum != total) revert("AMOUNT_MISMATCH");

        session.id = id;
        session.host = msg.sender;
        session.total = total;
        session.createdAt = block.timestamp;
        session.expiresAt = expiresAt;
        session.active = true;

        emit SessionCreated(id, msg.sender, total);
    }

    /// @notice Marks a specific member as paid for a session.
    /// @param sessionId Session identifier.
    /// @param member Member wallet address to mark as paid.
    function markPaid(bytes32 sessionId, address member) external {
        Session storage session = sessions[sessionId];
        if (session.id == bytes32(0)) revert SessionNotFound();
        if (block.timestamp > session.expiresAt) revert SessionExpired();
        if (!session.active) revert SessionInactive();
        if (msg.sender != member) revert NotMember();

        uint256 idx = memberIndex[sessionId][member];
        if (idx == 0) revert MemberNotFound();

        Member storage target = session.members[idx - 1];
        if (target.paid) revert AlreadyPaid();

        target.paid = true;
        emit MemberPaid(sessionId, member, target.amountDue);
    }

    /// @notice Closes an active session.
    /// @param sessionId Session identifier to close.
    function closeSession(bytes32 sessionId) external {
        Session storage session = sessions[sessionId];
        _ensureHost(session);
        if (!session.active) revert SessionInactive();
        session.active = false;
        emit SessionClosed(sessionId);
    }

    /// @notice Returns full session details.
    /// @param sessionId Session identifier.
    /// @return Full Session struct in memory.
    function getSession(bytes32 sessionId) external view returns (Session memory) {
        Session memory session = sessions[sessionId];
        if (session.id == bytes32(0)) revert SessionNotFound();
        return session;
    }

    /// @notice Returns status for a specific member in a session.
    /// @param sessionId Session identifier.
    /// @param member Member wallet address.
    /// @return amountDue Amount owed by member.
    /// @return paid Whether member has paid.
    function getMemberStatus(bytes32 sessionId, address member) external view returns (uint256 amountDue, bool paid) {
        Session storage session = sessions[sessionId];
        if (session.id == bytes32(0)) revert SessionNotFound();
        uint256 idx = memberIndex[sessionId][member];
        if (idx == 0) revert MemberNotFound();
        Member storage target = session.members[idx - 1];
        return (target.amountDue, target.paid);
    }

    /// @notice Returns true when all members in a session have paid.
    /// @param sessionId Session identifier.
    /// @return True if every member is marked paid.
    function allPaid(bytes32 sessionId) external view returns (bool) {
        Session storage session = sessions[sessionId];
        if (session.id == bytes32(0)) revert SessionNotFound();
        for (uint256 i = 0; i < session.members.length; i++) {
            if (!session.members[i].paid) return false;
        }
        return true;
    }

    function _ensureHost(Session storage session) internal view {
        if (session.id == bytes32(0)) revert SessionNotFound();
        if (session.host != msg.sender) revert NotHost();
    }
}
