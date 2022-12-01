//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import { ERC721 } from "solmate/tokens/ERC721.sol";
import { SD59x18, add, sub, mul, div, exp, pow } from "lib/prb-math/src/SD59x18.sol";

//@notice Implementation of Discrete GDA with exponential price decay for ERC721
abstract contract DiscreteGDA is ERC721 {
  ///@notice id of current ERC721
  uint256 public currentId = 0;

  // stored as 59x18 fixed precision number
  // initialPrice (k)
  SD59x18 internal immutable initialPrice;
  // scaleFactor (α)
  SD59x18 internal immutable scaleFactor;
  // decayConstant (λ)
  SD59x18 internal immutable decayConstant;
  // auctionStartTime (T)
  SD59x18 internal immutable auctionStartTime;

  error InsufficientPayment();
  error UnableToRefund();

  constructor(
    string memory _name,
    string memory _symbol,
    SD59x18 _initialPrice,
    SD59x18 _scaleFactor,
    SD59x18 _decayConstant
  ) ERC721(_name, _symbol) {
    initialPrice = _initialPrice;
    scaleFactor = _scaleFactor;
    decayConstant = _decayConstant;
    auctionStartTime = SD59x18.wrap(int256(block.timestamp * 1e18));
  }

  function purchasePrice(uint256 numTokensToBuy) public view returns (uint256) {
    SD59x18 numTokensToBuy = SD59x18.wrap(int256(numTokensToBuy));
    SD59x18 timeSinceStart = sub(
      SD59x18.wrap(int256(block.timestamp * 1e18)),
      auctionStartTime
    );
    SD59x18 num1 = mul(
      initialPrice,
      pow(scaleFactor, SD59x18.wrap(int256(currentId * 1e18)))
    );

    SD59x18 num2 = sub(pow(scaleFactor, numTokensToBuy), SD59x18.wrap(1e18));

    SD59x18 den1 = exp(mul(decayConstant, timeSinceStart));

    SD59x18 den2 = sub(scaleFactor, SD59x18.wrap(1e18));

    SD59x18 totalCost = div(mul(num1, num2), mul(den1, den2));

    return uint256(SD59x18.unwrap(totalCost));
  }

  //@notice purchase a specific number of tokens from the GDA
  function purchaseTokens(uint256 numTokens, address to) public payable {
    uint256 cost = purchasePrice(numTokens);
    if (msg.value < cost) {
      revert InsufficientPayment();
    }

    //mint numTokens
    for (uint256 i = 0; i < numTokens / 1e18; i++) {
      _mint(to, ++currentId);
    }

    //refund extra payment
    uint256 refund = msg.value - cost;
    (bool sent, ) = msg.sender.call{ value: refund }("");
    if (!sent) {
      revert UnableToRefund();
    }
  }
}
