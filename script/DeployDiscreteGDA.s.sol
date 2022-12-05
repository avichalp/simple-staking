// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/GDA/DiscreteGDA.sol";

contract MyDiscreteGDA is DiscreteGDA {
  constructor(
    string memory _name,
    string memory _symbol,
    int256 _initialPrice,
    int256 _scaleFactor,
    int256 _decayConstant
  ) DiscreteGDA(_name, _symbol, _initialPrice, _scaleFactor, _decayConstant) {}

  function tokenURI(uint256)
    public
    pure
    virtual
    override
    returns (string memory)
  {
    return "helloworld";
  }
}

contract DGDAScript is Script {
  DiscreteGDA public gda;

  int256 public initialPrice = 1000e18;
  // lambda = 1/2
  int256 public decayConstant = 5e17;

  // alpha = 1.1
  int256 public scaleFactor = 11e17;

  bytes insufficientPayment = abi.encodeWithSignature("InsufficientPayment()");

  function setUp() public {}

  function run() public {
    uint256 deployerPrivateKey = vm.envUint("GOERLI_PRIVATE_KEY");
    vm.startBroadcast(deployerPrivateKey);

    new MyDiscreteGDA(
      "MyDiscreteGDA",
      "MDGDA",
      initialPrice,
      scaleFactor,
      decayConstant
    );

    vm.stopBroadcast();
  }
}
