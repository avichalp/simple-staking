// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/GDA/DiscreteGDA.sol";

contract MyDiscreteGDA is DiscreteGDA {
  constructor(
    string memory _name,
    string memory _symbol,
    SD59x18 _initialPrice,
    SD59x18 _scalerFactor,
    SD59x18 _decayConstant
  ) DiscreteGDA(_name, _symbol, _initialPrice, _scalerFactor, _decayConstant) {}

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

  SD59x18 public initialPrice = SD59x18.wrap(1000);
  // lambda = 1/2
  //int256 public decayConstant = SD59x18.wrap(1).div(SD59x18.wrap(2));
  SD59x18 public decayConstant = div(SD59x18.wrap(1), SD59x18.wrap(2));
  // alpha = 1.1
  //int256 public scaleFactor = SD59x18.wrap(11).div(SD59x18.wrap(10));
  SD59x18 public scaleFactor = div(SD59x18.wrap(11), SD59x18.wrap(10));

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
