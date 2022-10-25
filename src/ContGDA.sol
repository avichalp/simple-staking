//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import { ERC20 } from "solmate/tokens/ERC20.sol";
import { PRBMathSD59x18 } from "lib/prb-math/contracts/PRBMathSD59x18.sol";

//@notice Implementation of Continuous GDA with exponential price decay for ERC20
abstract contract ContGDA is ERC20 {
  using PRBMathSD59x18 for int256;

  ///@notice initialPrice (k) stored as 59x18 fixed precision number
  int256 internal immutable initialPrice;
  ///@notice decayConstant (λ) stored as 59x18 fixed precision number
  int256 internal immutable decayConstant;
  ///@notice lastAuctionTime (T): when the previous auction was started stored as 59x18 fixed precision number
  int256 internal lastAuctionTime;
  ///@notice emissionRate (r) stored as 59x18 fixed precision number
  int256 internal immutable emissionRate;

  error InsufficientPayment();
  error UnableToRefund();
  error InsufficientAvailableTokens();

  constructor(
    string memory _name,
    string memory _symbol,
    int256 _initialPrice,
    int256 _emissionRate,
    int256 _decayConstant
  ) ERC20(_name, _symbol, 18) {
    initialPrice = _initialPrice;
    emissionRate = _emissionRate;
    decayConstant = _decayConstant;
    lastAuctionTime = int256(block.timestamp).fromInt();
  }

  function purchasePrice(uint256 numTokens) public view returns (uint256) {
    int256 quantity = int256(numTokens).fromInt();
    int256 timeSinceLastAuctionStart = int256(block.timestamp).fromInt() -
      lastAuctionTime;

    int256 num1 = initialPrice;
    int256 num2 = decayConstant.mul(quantity).div(emissionRate).exp() -
      PRBMathSD59x18.fromInt(1);
    int256 den1 = decayConstant;
    int256 den2 = decayConstant.mul(timeSinceLastAuctionStart).exp();

    int256 totalCost = num1.mul(num2).div(den1.mul(den2));
    return uint256(totalCost);
  }

  //@notice purchase a specific number of tokens from the GDA
  function purchaseTokens(uint256 numTokens, address to) public payable {
    int256 timeSinceLastAuction = int256(block.timestamp).fromInt() -
      lastAuctionTime;
    // r * (currentTime - lastAuctionTime) > numTokens --> cannot mint!
    if (int256(numTokens).fromInt() > timeSinceLastAuction.mul(emissionRate)) {
      revert InsufficientAvailableTokens();
    }

    uint256 cost = purchasePrice(numTokens);
    if (msg.value < cost) {
      revert InsufficientPayment();
    }

    //mint numTokens
    _mint(to, numTokens);
    // update last auction time
    lastAuctionTime += timeSinceLastAuction;

    //refund extra payment
    uint256 refund = msg.value - cost;
    (bool sent, ) = msg.sender.call{ value: refund }("");
    if (!sent) {
      revert UnableToRefund();
    }
  }
}
