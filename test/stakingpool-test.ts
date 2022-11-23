import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { StakingPool, StakingPool__factory } from "../typechain-types";

describe("StakingPool", function () {
  let users;
  let userA: SignerWithAddress,
    userB: SignerWithAddress,
    team: SignerWithAddress;
  let tx;
  let Pool: StakingPool__factory;
  let stakingPool: StakingPool;

  async function expectUserState(
    addr: string,
    expectedBalance: string,
    expectedRewards: string
  ) {
    const userBalance = await stakingPool.deposits(addr);
    const userRewards = await stakingPool.rewards(addr);
    expect(userBalance).to.be.eq(ethers.utils.parseEther(expectedBalance));
    expect(userRewards).to.be.eq(ethers.utils.parseEther(expectedRewards));
  }

  // asserts that rewards are in a ratio a:b
  async function expectRewardsInRatio(
    addr1: string,
    addr2: string,
    a: number,
    b: number
  ) {
    const user1Rewards = await stakingPool.rewards(addr1);
    const user2Rewards = await stakingPool.rewards(addr2);
    expect(user1Rewards.div(user2Rewards)).to.be.eq(a / b);
  }

  describe("With one user and team", function () {
    beforeEach(async function () {
      users = await ethers.getSigners();
      [team, userA] = users;
      await ethers.provider.send("hardhat_setBalance", [
        userA.address,
        "0x4563918244F40000", // 5 ETH
      ]);
      Pool = await ethers.getContractFactory("StakingPool");
      stakingPool = await Pool.connect(team).deploy();
      await stakingPool.deployed();
    });

    it("team deposits before any user deposits", async function () {
      // No increase in rewards
      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("1") });
      let unclaimedRewards = await stakingPool.connect(team).unclaimedRewards();
      const userABalance = await stakingPool.deposits(userA.address);
      const userARewards = await stakingPool.rewards(userA.address);

      expect(unclaimedRewards).to.be.eq(ethers.utils.parseEther("1"));
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));

      // team could reclaim unclaim rewards back
      await stakingPool.connect(team).withdrawUnclaimedRewards();
      unclaimedRewards = await stakingPool.connect(team).unclaimedRewards();
      expect(unclaimedRewards).to.be.eq(ethers.utils.parseEther("0"));
    });

    it("team deposits after user A deposits", async function () {
      let userABalance = await stakingPool.deposits(userA.address);
      let userARewards = await stakingPool.rewards(userA.address);
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));

      // A deposits
      await stakingPool
        .connect(userA)
        .deposit({ value: ethers.utils.parseEther("1") });
      await expectUserState(userA.address, "1", "0");

      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("1") });
      await expectUserState(userA.address, "1", "1");
    });

    it("A tries to withdraw before depositing", async function () {
      const withdrawAmount = ethers.utils.parseEther("1");
      await expect(
        stakingPool.connect(userA).withdraw(withdrawAmount)
      ).to.be.revertedWith("No deposits found");
    });

    it("A tries to deposit 0 value", async function () {
      await expect(stakingPool.connect(userA).deposit()).to.be.revertedWith(
        "Zero deposit is not allowed"
      );
    });

    it("A deposits then withdraws before team deposits", async function () {
      let userAEthBalanceBefore = await userA.getBalance("latest");

      await expectUserState(userA.address, "0", "0");

      // A deposits
      await stakingPool
        .connect(userA)
        .deposit({ value: ethers.utils.parseEther("1") });
      await expectUserState(userA.address, "1", "0");

      // A withdraws
      const withdrawAmount = ethers.utils.parseEther("1");
      await stakingPool.connect(userA).withdraw(withdrawAmount);
      await expectUserState(userA.address, "0", "0");
      let userAEthBalanceAfter = await userA.getBalance("latest");
      expect(userAEthBalanceBefore).to.be.gte(userAEthBalanceAfter);
    });

    it("A deposits, team deposits, A withdraws", async function () {
      let userABalance = await stakingPool.deposits(userA.address);
      let userARewards = await stakingPool.rewards(userA.address);
      let userAEthBalanceBefore = await userA.getBalance("latest");
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));

      // A deposits
      await stakingPool
        .connect(userA)
        .deposit({ value: ethers.utils.parseEther("1") });
      await expectUserState(userA.address, "1", "0");

      // Team deposits
      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("1") });
      await expectUserState(userA.address, "1", "1");

      const withdrawAmount = ethers.utils.parseEther("2");
      await stakingPool.connect(userA).withdraw(withdrawAmount);
      await expectUserState(userA.address, "0", "0");

      let userAEthBalanceAfter = await userA.getBalance("latest");
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });

    it("A deposits, team deposits, A partially withdraws, team deposits, A withdraws", async function () {
      let userABalance = await stakingPool.deposits(userA.address);
      let userARewards = await stakingPool.rewards(userA.address);
      let userAEthBalanceBefore = await userA.getBalance("latest");
      expect(userABalance).to.be.eq(ethers.BigNumber.from(0));
      expect(userARewards).to.be.eq(ethers.BigNumber.from(0));

      // A depostis
      await stakingPool
        .connect(userA)
        .deposit({ value: ethers.utils.parseEther("1") });
      await expectUserState(userA.address, "1", "0");

      // Team depostis
      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("1") });
      await expectUserState(userA.address, "1", "1");

      // A partially Withdraws (1 ETH, Available rewards: 2 ETH)
      const withdrawAmount = ethers.utils.parseEther("1");
      await stakingPool.connect(userA).withdraw(withdrawAmount);
      // UserA's rewards should increase to 2
      await expectUserState(userA.address, "1", "0");
      let userAEthBalanceAfter = await userA.getBalance("latest");
      // A Deposits 1 ETH, Withdraws 1 ETH minus Gas for both transactions
      expect(userAEthBalanceAfter).to.be.lte(userAEthBalanceBefore);

      // Team deposits
      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("1") });
      await expectUserState(userA.address, "1", "1");

      // A withdraws
      const withdrawAmount2 = ethers.utils.parseEther("2");
      await stakingPool.connect(userA).withdraw(withdrawAmount2);
      await expectUserState(userA.address, "0", "0");

      userAEthBalanceAfter = await userA.getBalance("latest");
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });

    it("A tries to call reward function", async function () {
      await expect(stakingPool.connect(userA).reward()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("With two users and team", function () {
    beforeEach(async function () {
      users = await ethers.getSigners();
      [team, userA, userB] = users;
      await ethers.provider.send("hardhat_setBalance", [
        userA.address,
        "0x4563918244F40000", // 5 ETH
      ]);
      await ethers.provider.send("hardhat_setBalance", [
        userB.address,
        "0x4563918244F40000", // 5 ETH
      ]);
      Pool = await ethers.getContractFactory("StakingPool");
      stakingPool = await Pool.connect(team).deploy();
      await stakingPool.deployed();
    });

    it("A deposits, B deposits same as A, team deposits, A withdraws, B withdraws", async function () {
      await expectUserState(userA.address, "0", "0");
      await expectUserState(userB.address, "0", "0");

      // A deposits
      await stakingPool
        .connect(userA)
        .deposit({ value: ethers.utils.parseEther("1") });
      let userAEthBalanceBefore = await userA.getBalance("latest");
      await expectUserState(userA.address, "1", "0");
      await expectUserState(userB.address, "0", "0");

      // B deposits
      await stakingPool
        .connect(userB)
        .deposit({ value: ethers.utils.parseEther("1") });
      let userBEthBalanceBefore = await userB.getBalance("latest");
      await expectUserState(userA.address, "1", "0");
      await expectUserState(userB.address, "1", "0");

      // Team deoposits
      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("2") });

      await expectRewardsInRatio(userA.address, userB.address, 1, 1);

      // A and B both have 50% share of the pool, they should accrue
      // same amount of rewards
      await expectUserState(userA.address, "1", "1");
      await expectUserState(userB.address, "1", "1");

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther("2");
      await stakingPool.connect(userB).withdraw(withdrawAmountB);
      await expectUserState(userB.address, "0", "0");
      let userBEthBalanceAfter = await userB.getBalance("latest");
      expect(userBEthBalanceAfter).to.be.gte(userBEthBalanceBefore);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther("2");
      await stakingPool.connect(userA).withdraw(withdrawAmountA);
      await expectUserState(userA.address, "0", "0");
      let userAEthBalanceAfter = await userA.getBalance("latest");
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });

    it("A deposits, B deposits same as A, team deposits, B withdraws, A withdraws", async function () {
      await expectUserState(userA.address, "0", "0");
      await expectUserState(userB.address, "0", "0");

      // UserA deposits
      await stakingPool
        .connect(userA)
        .deposit({ value: ethers.utils.parseEther("1") });
      let userAEthBalanceBefore = await userA.getBalance("latest");
      await expectUserState(userA.address, "1", "0");
      await expectUserState(userB.address, "0", "0");

      // User B deposits
      await stakingPool
        .connect(userB)
        .deposit({ value: ethers.utils.parseEther("1") });
      let userBEthBalanceBefore = await userB.getBalance("latest");
      await expectUserState(userA.address, "1", "0");
      await expectUserState(userB.address, "1", "0");

      // Team deposits
      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("2") });
      await expectUserState(userA.address, "1", "1");
      await expectUserState(userB.address, "1", "1");
      // A and B both have 50% share of the pool, they should accrue
      // same amount of rewards
      await expectRewardsInRatio(userA.address, userB.address, 1, 1);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther("2");
      await stakingPool.connect(userA).withdraw(withdrawAmountA);
      await expectUserState(userA.address, "0", "0");
      let userAEthBalanceAfter = await userA.getBalance("latest");
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther("2");
      await stakingPool.connect(userB).withdraw(withdrawAmountB);
      await expectUserState(userB.address, "0", "0");

      let userBEthBalanceAfter = await userB.getBalance("latest");
      expect(userBEthBalanceAfter).to.be.gte(userBEthBalanceBefore);
    });

    it("A deposits, B deposits more than A, team deposits, A withdraws, B withdraws", async function () {
      await expectUserState(userA.address, "0", "0");
      await expectUserState(userB.address, "0", "0");

      // UserA deposits
      await stakingPool
        .connect(userA)
        .deposit({ value: ethers.utils.parseEther("1") });
      let userAEthBalanceBefore = await userA.getBalance("latest");

      await expectUserState(userA.address, "1", "0");
      await expectUserState(userB.address, "0", "0");

      // User B deposits
      await stakingPool
        .connect(userB)
        .deposit({ value: ethers.utils.parseEther("2") });
      let userBEthBalanceBefore = await userB.getBalance("latest");
      await expectUserState(userA.address, "1", "0");
      await expectUserState(userB.address, "2", "0");

      // Team deposits
      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("3") });
      await expectUserState(userA.address, "1", "1");
      await expectUserState(userB.address, "2", "2");

      // A should get 1/3 of the pool and B should get 2/3
      // A deposited 1, B deposited 2 and team deposited 3
      // on withdrawl, A will get 2, B will get 4
      await expectRewardsInRatio(userB.address, userA.address, 2, 1);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther("2");
      await stakingPool.connect(userA).withdraw(withdrawAmountA);
      await expectUserState(userA.address, "0", "0");
      let userAEthBalanceAfter = await userA.getBalance("latest");
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther("4");
      await stakingPool.connect(userB).withdraw(withdrawAmountB);
      await expectUserState(userB.address, "0", "0");

      let userBEthBalanceAfter = await userB.getBalance("latest");
      expect(userBEthBalanceAfter).to.be.gte(userBEthBalanceBefore);
    });

    it("A deposits, B deposits more than A, team deposits, B withdraws, A withdraws", async function () {
      await expectUserState(userA.address, "0", "0");
      await expectUserState(userB.address, "0", "0");

      // UserA deposits
      await stakingPool
        .connect(userA)
        .deposit({ value: ethers.utils.parseEther("1") });
      let userAEthBalanceBefore = await userA.getBalance("latest");
      await expectUserState(userA.address, "1", "0");
      await expectUserState(userB.address, "0", "0");

      // User B deposits
      await stakingPool
        .connect(userB)
        .deposit({ value: ethers.utils.parseEther("2") });
      let userBEthBalanceBefore = await userB.getBalance("latest");
      await expectUserState(userA.address, "1", "0");
      await expectUserState(userB.address, "2", "0");

      // Team deposits
      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("3") });
      await expectUserState(userA.address, "1", "1");
      await expectUserState(userB.address, "2", "2");

      // A should get 1/3 of the pool and B should get 2/3
      // A deposited 1, B deposited 2 and team deposited 3
      // on withdrawl, A will get 2, B will get 4
      await expectRewardsInRatio(userB.address, userA.address, 2, 1);

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther("4");
      await stakingPool.connect(userB).withdraw(withdrawAmountB);
      await expectUserState(userB.address, "0", "0");
      let userBEthBalanceAfter = await userB.getBalance("latest");
      expect(userBEthBalanceAfter).to.be.gte(userBEthBalanceBefore);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther("2");
      await stakingPool.connect(userA).withdraw(withdrawAmountA);
      await expectUserState(userA.address, "0", "0");
      let userAEthBalanceAfter = await userA.getBalance("latest");
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });

    it("A deposits, B deposits less than A, team deposits, A withdraws, B withdraws", async function () {
      await expectUserState(userA.address, "0", "0");
      await expectUserState(userB.address, "0", "0");

      // UserA deposits
      await stakingPool
        .connect(userA)
        .deposit({ value: ethers.utils.parseEther("2") });
      let userAEthBalanceBefore = await userA.getBalance("latest");
      await expectUserState(userA.address, "2", "0");
      await expectUserState(userB.address, "0", "0");

      // User B deposits
      await stakingPool
        .connect(userB)
        .deposit({ value: ethers.utils.parseEther("1") });
      let userBEthBalanceBefore = await userB.getBalance("latest");
      await expectUserState(userA.address, "2", "0");
      await expectUserState(userB.address, "1", "0");

      // Team deposits
      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("3") });
      await expectUserState(userA.address, "2", "2");
      await expectUserState(userB.address, "1", "1");

      // A should get 1/3 of the pool and B should get 2/3
      // A deposited 1, B deposited 2 and team deposited 3
      // on withdrawl, A will get 2, B will get 4
      await expectRewardsInRatio(userA.address, userB.address, 2, 1);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther("4");
      await stakingPool.connect(userA).withdraw(withdrawAmountA);
      await expectUserState(userA.address, "0", "0");

      let userAEthBalanceAfter = await userA.getBalance("latest");
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther("2");
      await stakingPool.connect(userB).withdraw(withdrawAmountB);
      await expectUserState(userB.address, "0", "0");
      let userBEthBalanceAfter = await userB.getBalance("latest");
      expect(userBEthBalanceAfter).to.be.gte(userBEthBalanceBefore);
    });

    it("A deposits, B deposits less than A, team deposits, B withdraws, A withdraws", async function () {
      await expectUserState(userA.address, "0", "0");
      await expectUserState(userB.address, "0", "0");

      // UserA deposits
      await stakingPool
        .connect(userA)
        .deposit({ value: ethers.utils.parseEther("2") });
      let userAEthBalanceBefore = await userA.getBalance("latest");
      await expectUserState(userA.address, "2", "0");
      await expectUserState(userB.address, "0", "0");

      // User B deposits
      await stakingPool
        .connect(userB)
        .deposit({ value: ethers.utils.parseEther("1") });
      let userBEthBalanceBefore = await userB.getBalance("latest");
      await expectUserState(userA.address, "2", "0");
      await expectUserState(userB.address, "1", "0");

      // Team deposits
      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("3") });
      await expectUserState(userA.address, "2", "2");
      await expectUserState(userB.address, "1", "1");

      // A should get 1/3 of the pool and B should get 2/3
      // A deposited 1, B deposited 2 and team deposited 3
      // on withdrawl, A will get 2, B will get 4
      await expectRewardsInRatio(userA.address, userB.address, 2, 1);

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther("2");
      await stakingPool.connect(userB).withdraw(withdrawAmountB);
      await expectUserState(userB.address, "0", "0");

      let userBEthBalanceAfter = await userB.getBalance("latest");
      expect(userBEthBalanceAfter).to.be.gte(userBEthBalanceBefore);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther("4");
      await stakingPool.connect(userA).withdraw(withdrawAmountA);
      await expectUserState(userA.address, "0", "0");
      let userAEthBalanceAfter = await userA.getBalance("latest");
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });

    it("A deposits, team deposits, B deposits, A withdraws, B withdraws", async function () {
      await expectUserState(userA.address, "0", "0");
      await expectUserState(userB.address, "0", "0");

      // UserA deposits
      await stakingPool
        .connect(userA)
        .deposit({ value: ethers.utils.parseEther("1") });
      // Check state after A deposits
      let userAEthBalanceBefore = await userA.getBalance("latest");
      await expectUserState(userA.address, "1", "0");
      await expectUserState(userB.address, "0", "0");
      // Team deposits
      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("2") });
      // check state after Team deposits
      await expectUserState(userA.address, "1", "2");
      await expectUserState(userB.address, "0", "0");

      // User B deposits
      let userBEthBalanceBefore = await userB.getBalance("latest");
      await stakingPool
        .connect(userB)
        .deposit({ value: ethers.utils.parseEther("1") });
      await expectUserState(userA.address, "1", "2");
      await expectUserState(userB.address, "1", "0");

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther("3");
      await stakingPool.connect(userA).withdraw(withdrawAmountA);
      await expectUserState(userA.address, "0", "0");

      let userAEthBalanceAfter = await userA.getBalance("latest");
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther("1");
      await stakingPool.connect(userB).withdraw(withdrawAmountB);
      await expectUserState(userB.address, "0", "0");
      let userBEthBalanceAfter = await userB.getBalance("latest");
      expect(userBEthBalanceAfter).to.be.lte(userBEthBalanceBefore);
    });

    it("A deposits, team deposits, B deposits, B withdraws, A withdraws", async function () {
      await expectUserState(userA.address, "0", "0");
      await expectUserState(userB.address, "0", "0");

      // UserA deposits
      let userAEthBalanceBefore = await userA.getBalance("latest");
      await stakingPool
        .connect(userA)
        .deposit({ value: ethers.utils.parseEther("1") });
      await expectUserState(userA.address, "1", "0");
      await expectUserState(userB.address, "0", "0");

      // Team deposits
      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("2") });
      // check state after Team deposits
      await expectUserState(userA.address, "1", "2");
      await expectUserState(userB.address, "0", "0");

      // User B deposits
      let userBEthBalanceBefore = await userB.getBalance("latest");
      await stakingPool
        .connect(userB)
        .deposit({ value: ethers.utils.parseEther("1") });
      await expectUserState(userA.address, "1", "2");
      await expectUserState(userB.address, "1", "0");

      // B withdraws
      // todo: revert if B withdraw more than 1
      const withdrawAmountB = ethers.utils.parseEther("1");
      await stakingPool.connect(userB).withdraw(withdrawAmountB);
      await expectUserState(userB.address, "0", "0");
      let userBEthBalanceAfter = await userB.getBalance("latest");
      expect(userBEthBalanceAfter).to.be.lte(userBEthBalanceBefore);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther("3");
      await stakingPool.connect(userA).withdraw(withdrawAmountA);
      await expectUserState(userA.address, "0", "0");
      let userAEthBalanceAfter = await userA.getBalance("latest");
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });

    it("A deposits, team deposits, B deposits, B tries to withdraw more, A withdraws", async function () {
      await expectUserState(userA.address, "0", "0");
      await expectUserState(userB.address, "0", "0");

      // UserA deposits
      let userAEthBalanceBefore = await userA.getBalance("latest");
      await stakingPool
        .connect(userA)
        .deposit({ value: ethers.utils.parseEther("1") });
      await expectUserState(userA.address, "1", "0");
      await expectUserState(userB.address, "0", "0");

      // Team deposits
      await stakingPool
        .connect(team)
        .reward({ value: ethers.utils.parseEther("2") });
      // check state after Team deposits
      await expectUserState(userA.address, "1", "2");
      await expectUserState(userB.address, "0", "0");

      // User B deposits
      let userBEthBalanceBefore = await userB.getBalance("latest");
      await stakingPool
        .connect(userB)
        .deposit({ value: ethers.utils.parseEther("1") });
      await expectUserState(userA.address, "1", "2");
      await expectUserState(userB.address, "1", "0");

      // B withdraws
      const withdrawAmountB = ethers.utils.parseEther("2");
      await expect(
        stakingPool.connect(userB).withdraw(withdrawAmountB)
      ).to.be.revertedWith("Given amount is greater than available rewards");
      await expectUserState(userB.address, "1", "0");
      let userBEthBalanceAfter = await userB.getBalance("latest");
      expect(userBEthBalanceAfter).to.be.lte(userBEthBalanceBefore);

      // A withdraws
      const withdrawAmountA = ethers.utils.parseEther("3");
      await stakingPool.connect(userA).withdraw(withdrawAmountA);
      await expectUserState(userA.address, "0", "0");
      let userAEthBalanceAfter = await userA.getBalance("latest");
      expect(userAEthBalanceAfter).to.be.gte(userAEthBalanceBefore);
    });
  });
});
