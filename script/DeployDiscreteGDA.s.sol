// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/DiscreteGDA.sol";

contract MyDiscreteGDA is DiscreteGDA {
  constructor(
    string memory _name,
    string memory _symbol,
    int256 _initialPrice,
    int256 _scalerFactor,
    int256 _decayConstant
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
  using PRBMathSD59x18 for int256;

  DiscreteGDA public gda;

  int256 public initialPrice = PRBMathSD59x18.fromInt(1000);
  // lambda = 1/2
  int256 public decayConstant =
    PRBMathSD59x18.fromInt(1).div(PRBMathSD59x18.fromInt(2));
  // alpha = 1.1
  int256 public scaleFactor =
    PRBMathSD59x18.fromInt(11).div(PRBMathSD59x18.fromInt(10));

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
