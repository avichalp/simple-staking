// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/GDA/ContGDA.sol";

contract MyContGDA is ContGDA {
  constructor(
    string memory _name,
    string memory _symbol,
    SD59x18 _initialPrice,
    SD59x18 _scalerFactor,
    SD59x18 _decayConstant
  ) ContGDA(_name, _symbol, _initialPrice, _scalerFactor, _decayConstant) {}
}

contract CGDAScript is Script {
  ContGDA public gda;

  // k = 10
  SD59x18 public initialPrice = SD59x18.wrap(10);
  // lambda = 1/2
  SD59x18 public decayConstant = div(SD59x18.wrap(1), SD59x18.wrap(2));
  // r = 1
  SD59x18 public emissionRate = SD59x18.wrap(1);

  function setUp() public {}

  function run() public {
    uint256 deployerPrivateKey = vm.envUint("GOERLI_PRIVATE_KEY");
    vm.startBroadcast(deployerPrivateKey);

    new MyContGDA("MyCGDA", "MCGDA", initialPrice, emissionRate, decayConstant);

    vm.stopBroadcast();
  }
}
