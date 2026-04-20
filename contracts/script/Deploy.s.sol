// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/console.sol";
import "forge-std/Script.sol";
import "../src/SplytSession.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address hostWallet = vm.envAddress("HOST_WALLET");
        require(hostWallet != address(0), "HOST_WALLET is required");

        vm.startBroadcast(deployerPrivateKey);
        SplytSession deployed = new SplytSession();
        vm.stopBroadcast();

        console.log("SplytSession deployed at:", address(deployed));
        console.log("Configured HOST_WALLET:", hostWallet);
    }
}
