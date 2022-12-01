//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import { ERC20 } from "solmate/tokens/ERC20.sol";
import { SD59x18, add, sub, mul, div, exp } from "lib/prb-math/src/SD59x18.sol";

//@notice Implementation of Continuous GDA with exponential price decay for ERC20
abstract contract ContGDA is ERC20 {
  ///@notice initialPrice (k) stored as 59x18 fixed precision number
  SD59x18 internal immutable initialPrice;
  ///@notice decayConstant (λ) stored as 59x18 fixed precision number
  SD59x18 internal immutable decayConstant;
  ///@notice lastAuctionTime (T): when the previous auction was started stored as 59x18 fixed precision number
  SD59x18 internal lastAuctionTime;
  ///@notice emissionRate (r) stored as 59x18 fixed precision number
  SD59x18 internal immutable emissionRate;

  error InsufficientPayment();
  error UnableToRefund();
  error InsufficientAvailableTokens();

  constructor(
    string memory _name,
    string memory _symbol,
    SD59x18 _initialPrice,
    SD59x18 _emissionRate,
    SD59x18 _decayConstant
  ) ERC20(_name, _symbol, 18) {
    initialPrice = _initialPrice;
    emissionRate = _emissionRate;
    decayConstant = _decayConstant;
    lastAuctionTime = SD59x18.wrap(int256(block.timestamp * 1e18));
  }

  function purchasePrice(uint256 numTokens) public view returns (uint256) {
    SD59x18 quantity = SD59x18.wrap(int256(numTokens));
    SD59x18 timeSinceLastAuctionStart = sub(
      SD59x18.wrap(int256(block.timestamp * 1e18)),
      lastAuctionTime
    );

    SD59x18 num1 = initialPrice;
    SD59x18 num2 = sub(
      exp(div(mul(decayConstant, quantity), emissionRate)),
      SD59x18.wrap(1e18)
    );
    SD59x18 den1 = decayConstant;
    SD59x18 den2 = exp(mul(decayConstant, timeSinceLastAuctionStart));

    SD59x18 totalCost = div(mul(num1, num2), mul(den1, den2));
    return uint256(SD59x18.unwrap(totalCost));
  }

  //@notice purchase a specific number of tokens from the GDA
  function purchaseTokens(uint256 numTokens, address to) public payable {
    SD59x18 timeSinceLastAuction = sub(
      SD59x18.wrap(int256(block.timestamp * 1e18)),
      lastAuctionTime
    );
    // r * (currentTime - lastAuctionTime) > numTokens --> cannot mint!
    if (
      int256(numTokens) >
      SD59x18.unwrap(mul(timeSinceLastAuction, emissionRate))
    ) {
      revert InsufficientAvailableTokens();
    }

    uint256 cost = purchasePrice(numTokens);
    if (msg.value < cost) {
      revert InsufficientPayment();
    }

    //mint numTokens
    _mint(to, numTokens / 1e18);
    // update last auction time
    lastAuctionTime = add(lastAuctionTime, timeSinceLastAuction);

    //refund extra payment
    uint256 refund = msg.value - cost;
    (bool sent, ) = msg.sender.call{ value: refund }("");
    if (!sent) {
      revert UnableToRefund();
    }
  }
}
