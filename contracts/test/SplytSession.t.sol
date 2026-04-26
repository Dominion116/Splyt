// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SplytSession.sol";

contract SplytSessionTest is Test {
    SplytSession internal splyt;
    address internal host;
    address internal alice;
    address internal bob;
    bytes32 internal sessionId;

    function setUp() public {
        host = makeAddr("host");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        sessionId = keccak256("session-1");
    }

    function _deployAndCreate() internal {
        vm.prank(host);
        splyt = new SplytSession();
        address[] memory members = new address[](2);
        members[0] = alice;
        members[1] = bob;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10;
        amounts[1] = 20;
        vm.prank(host);
        splyt.createSession(sessionId, members, amounts, 30, block.timestamp + 1 hours);
    }

    function test_CreateSession_success() public {
        vm.prank(host);
        splyt = new SplytSession();

        address[] memory members = new address[](2);
        members[0] = alice;
        members[1] = bob;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10;
        amounts[1] = 20;

        vm.prank(host);
        splyt.createSession(sessionId, members, amounts, 30, block.timestamp + 1 hours);

        SplytSession.Session memory session = splyt.getSession(sessionId);
        assertEq(session.id, sessionId);
        assertEq(session.host, host);
        assertEq(session.total, 30);
        assertEq(session.members.length, 2);
    }

    function test_CreateSession_revertsMismatchedArrays() public {
        vm.prank(host);
        splyt = new SplytSession();
        address[] memory members = new address[](2);
        members[0] = alice;
        members[1] = bob;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 10;

        vm.expectRevert(bytes("LENGTH_MISMATCH"));
        vm.prank(host);
        splyt.createSession(sessionId, members, amounts, 10, block.timestamp + 1 hours);
    }

    function test_CreateSession_revertsAmountMismatch() public {
        vm.prank(host);
        splyt = new SplytSession();
        address[] memory members = new address[](2);
        members[0] = alice;
        members[1] = bob;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10;
        amounts[1] = 20;

        vm.expectRevert(bytes("AMOUNT_MISMATCH"));
        vm.prank(host);
        splyt.createSession(sessionId, members, amounts, 100, block.timestamp + 1 hours);
    }

    function test_MarkPaid_success() public {
        _deployAndCreate();
        vm.prank(alice);
        splyt.markPaid(sessionId, alice);
        (, bool paid) = splyt.getMemberStatus(sessionId, alice);
        assertTrue(paid);
    }

    function test_MarkPaid_revertsNotMember() public {
        _deployAndCreate();
        vm.expectRevert(SplytSession.NotMember.selector);
        splyt.markPaid(sessionId, alice);
    }

    function test_MarkPaid_revertsAlreadyPaid() public {
        _deployAndCreate();
        vm.prank(alice);
        splyt.markPaid(sessionId, alice);
        vm.expectRevert(SplytSession.AlreadyPaid.selector);
        vm.prank(alice);
        splyt.markPaid(sessionId, alice);
    }

    function test_MarkPaid_revertsSessionExpired() public {
        _deployAndCreate();
        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert(SplytSession.SessionExpired.selector);
        vm.prank(alice);
        splyt.markPaid(sessionId, alice);
    }

    function test_AllPaid_returnsTrueWhenAllPaid() public {
        _deployAndCreate();
        vm.prank(alice);
        splyt.markPaid(sessionId, alice);
        vm.prank(bob);
        splyt.markPaid(sessionId, bob);
        assertTrue(splyt.allPaid(sessionId));
    }

    function test_CloseSession_success() public {
        _deployAndCreate();
        vm.prank(host);
        splyt.closeSession(sessionId);
        SplytSession.Session memory session = splyt.getSession(sessionId);
        assertFalse(session.active);
    }

    function test_CloseSession_revertsNotHost() public {
        _deployAndCreate();
        vm.expectRevert(SplytSession.NotHost.selector);
        splyt.closeSession(sessionId);
    }
}
