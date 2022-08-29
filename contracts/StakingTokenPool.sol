//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract StakingTokenPool is Ownable, ReentrancyGuard, ERC20 {
  event Deposit(address indexed depositor, uint256 amount);
  event Withdraw(address indexed receiver, uint256 amount);

  constructor() ERC20("sPOOL", "sPOOL") {}

  /// @notice Accepts native token like ETH/AVAX returns sPOOL tokens
  /// to the depositor.
  /// @dev Accepts native token (ETH/AVAX) and adds it into the pool.
  // Mints the equal amount of ERC20 tokens and transfer them to the
  // depositor. Later the depositor can redeem native tokens using their
  // sPOOL tokens
  function deposit() external payable {
    require(msg.value > 0, "Zero deposit is not allowed");

    // mints new sPOOL equal to the deposit value
    _mint(msg.sender, msg.value);

    emit Deposit(msg.sender, msg.value);
  }

  /// @notice Lets a user redeem native tokens for sPOOL tokens
  /// @return redeemed amount
  function withdraw(uint256 amount) external nonReentrant returns (uint256) {
    // check if sender is eligible for rewards
    uint256 sendersPoolbalance = this.balanceOf(msg.sender);

    require(
      sendersPoolbalance >= amount,
      "Given amount is greater than available rewards"
    );

    // Make sure that the pool is solvent
    require(address(this).balance >= amount, "Pool out of liquidity");

    // redeem native token for sPOOL
    payable(msg.sender).transfer(amount);

    // burn the sPOOL tokens
    _burn(msg.sender, amount);

    emit Withdraw(msg.sender, amount);

    return amount;
  }
}
