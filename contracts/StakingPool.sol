//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract StakingPool is Ownable, ReentrancyGuard {
  uint256 public unclaimedRewards;

  uint256 internal depositorIdx;

  mapping(address => uint256) public deposits;
  address[] internal depositors;

  mapping(address => uint256) public rewards;

  event Deposit(address indexed depositor, uint256 amount);
  event Reward(address indexed distributor, uint256 amount);
  event Withdraw(address indexed receiver, uint256 amount);

  /// @notice Accepts native token like ETH/AVAX to make it grow over time
  /// @dev Accepts native token (ETH/AVAX) and adds it into the pool. Saves the sender address.
  function deposit() external payable {
    require(msg.value > 0, "Zero deposit is not allowed");

    deposits[msg.sender] += msg.value;
    depositors.push(msg.sender);
    emit Deposit(msg.sender, msg.value);
  }

  /// @notice Lets a user withdraws funds plus rewards (if any)
  /// @return amount msg.sender's balance plus rewards acrued
  function withdraw(uint256 amount) external nonReentrant returns (uint256) {
    // check if sender is eligible for rewards
    require(deposits[msg.sender] > 0, "No deposits found");
    require(
      rewards[msg.sender] + deposits[msg.sender] >= amount,
      "Given amount is greater than available rewards"
    );
    require(address(this).balance >= amount, "Pool out of liquidity");

    if (rewards[msg.sender] >= amount) {
      // add leftover rewards to deposit to make them eligible
      // for next distribution
      deposits[msg.sender] += rewards[msg.sender] - amount;
    } else {
      // remove remaining from deposits
      deposits[msg.sender] -= amount - rewards[msg.sender];
    }
    rewards[msg.sender] = 0;

    // Remove from Depositor's Array
    if (deposits[msg.sender] <= 0) {
      uint256 d;
      for (d = 0; d < depositors.length; d++) {
        if (depositors[d] == msg.sender) {
          depositorIdx = d;
          break;
        }
      }
      removeDepositor(depositorIdx);
    }

    emit Withdraw(msg.sender, amount);

    payable(msg.sender).transfer(amount);
    return amount;
  }

  /// @notice Allows the 'team/admin' to send rewards
  function reward() external payable onlyOwner {
    // team members are allowed to deposit and anytime
    // if they depoist before there are any depositors,
    // these funds will be locked up in `unclaimedRewards`
    // the 'team' can re-claim them later
    uint256 currentReward = msg.value;
    if (depositors.length == 0) {
      unclaimedRewards += currentReward;
    } else {
      // distribute rewards
      uint256 d;
      for (d; d < depositors.length; d++) {
        rewards[depositors[d]] = calculateRewards(depositors[d], currentReward);
      }
    }

    emit Reward(msg.sender, msg.value);
  }

  /// @dev withdrawUnclaimedRewards can be used by the admin to drain stuck funds
  //  if the admin deposits rewards before anyone has staked their tokens
  // the the reward amount will be stuck in the contract. It can be removed
  // using this function
  function withdrawUnclaimedRewards() external onlyOwner nonReentrant {
    unclaimedRewards = 0;
    payable(msg.sender).transfer(unclaimedRewards);
  }

  /// @dev private function to delete an element from an un-ordered array
  /// @param index that is to be deleted
  function removeDepositor(uint index) private {
    require(index < depositors.length, "Invalid depositor index");
    depositors[index] = depositors[depositors.length - 1];
    depositors.pop();
  }

  /// @dev based on current balance, determine the `msg.sender`'s
  /// share and returns the their rewards
  /// @param depositor address whose rewards are to be calculated
  /// @return depositorReward based on their share of liquidity
  function calculateRewards(address depositor, uint256 rewardAmount)
    private
    view
    returns (uint256 depositorReward)
  {
    uint256 depositorBalance = deposits[depositor];
    uint256 numerator = depositorBalance *
      (address(this).balance - unclaimedRewards);
    uint256 denominator = address(this).balance -
      rewardAmount -
      unclaimedRewards;
    // rewards minus original balance
    depositorReward = (numerator / denominator) - depositorBalance;
  }
}
