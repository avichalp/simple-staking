import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { StakingToken } from "../typechain-types/contracts/StakingToken";

describe("StakingToken", () => {
  let users;
  let userA: SignerWithAddress;
  let userB: SignerWithAddress;
  let userC: SignerWithAddress;
  let pool: StakingToken;

  beforeEach(async () => {
    users = await ethers.getSigners();
    [userA, userB, userC] = users;
    await ethers.provider.send("hardhat_setBalance", [
      userA.address,
      "0x4563918244F40000", // 5 ETH
    ]);
    await ethers.provider.send("hardhat_setBalance", [
      userB.address,
      "0x4563918244F40000", // 5 ETH
    ]);
    await ethers.provider.send("hardhat_setBalance", [
      userC.address,
      "0x4563918244F40000", // 5 ETH
    ]);
    let Pool = await ethers.getContractFactory("StakingToken");
    pool = await Pool.connect(userA).deploy();
    await pool.deployed();
  });

  it("user deposits ETH in the pool, get back sPOOL tokens", async () => {
    let sPOOLBalanceBefore = await pool.balanceOf(userB.address);
    let userEthBalanceBefore = await userB.getBalance("latest");
    expect(sPOOLBalanceBefore).to.be.eq(ethers.BigNumber.from(0));
    expect(userEthBalanceBefore).to.be.eq(ethers.utils.parseEther("5"));

    await pool.connect(userB).deposit({ value: ethers.utils.parseEther("1") });

    let sPOOLBalanceAfter = await pool.balanceOf(userB.address);
    expect(sPOOLBalanceAfter).to.be.eq(ethers.utils.parseEther("1"));

    let userEthBalanceAfter = await userB.getBalance("latest");
    expect(sPOOLBalanceAfter).to.be.eq(ethers.utils.parseEther("1"));
    expect(userEthBalanceAfter).to.be.lessThanOrEqual(
      ethers.utils.parseEther("4")
    );
  });

  it("user tries to deposit 0 ETH", async () => {
    let sPOOLBalanceBefore = await pool.balanceOf(userB.address);
    let userEthBalanceBefore = await userB.getBalance("latest");
    expect(sPOOLBalanceBefore).to.be.eq(ethers.BigNumber.from(0));
    expect(userEthBalanceBefore).to.be.eq(ethers.utils.parseEther("5"));

    await expect(
      pool.connect(userB).deposit({ value: ethers.utils.parseEther("0") })
    ).to.be.revertedWith("Zero deposit is not allowed");
  });

  it("user deposits and withdraws ETH", async () => {
    let sPOOLBalanceBefore = await pool.balanceOf(userB.address);
    let userEthBalanceBefore = await userB.getBalance("latest");
    expect(sPOOLBalanceBefore).to.be.eq(ethers.BigNumber.from(0));
    expect(userEthBalanceBefore).to.be.eq(ethers.utils.parseEther("5"));

    await pool.connect(userB).deposit({ value: ethers.utils.parseEther("1") });

    let sPOOLBalanceAfter = await pool.balanceOf(userB.address);
    expect(sPOOLBalanceAfter).to.be.eq(ethers.utils.parseEther("1"));

    let userEthBalanceAfter = await userB.getBalance("latest");
    expect(sPOOLBalanceAfter).to.be.eq(ethers.utils.parseEther("1"));
    expect(userEthBalanceAfter).to.be.lessThanOrEqual(
      ethers.utils.parseEther("4")
    );

    await pool.connect(userB).withdraw(ethers.utils.parseEther("1"));
    let userEthBalanceAfterWithdraw = await userB.getBalance("latest");
    let sPOOLBalanceAfterWithdraw = await pool.balanceOf(userB.address);
    expect(sPOOLBalanceAfterWithdraw).to.be.eq(ethers.utils.parseEther("0"));
    expect(userEthBalanceAfterWithdraw).to.be.lessThanOrEqual(
      ethers.utils.parseEther("5")
    );

    // User tries to withdraw more than they deposit
    await expect(
      pool.connect(userB).withdraw(ethers.utils.parseEther("1"))
    ).to.be.revertedWith("Contract out of liquidity");
  });

  it("admin can send funds to the contract", async () => {
    let poolETHBalanceBefore = await ethers.provider.getBalance(pool.address);

    await userA.sendTransaction({
      value: ethers.utils.parseEther("1"),
      to: pool.address,
    });

    let poolETHBalanceAfter = await ethers.provider.getBalance(pool.address);

    expect(poolETHBalanceBefore).to.be.eq(ethers.BigNumber.from(0));
    expect(poolETHBalanceAfter).to.be.eq(ethers.utils.parseEther("1"));
  });

  it("non admin user cannot send funds to the contract", async () => {
    await expect(
      userB.sendTransaction({
        value: ethers.utils.parseEther("1"),
        to: pool.address,
      })
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("admin and user deposits", async () => {
    // admin deposits 1
    await userA.sendTransaction({
      value: ethers.utils.parseEther("1"),
      to: pool.address,
    });

    // user deposits 2
    await pool.connect(userB).deposit({ value: ethers.utils.parseEther("2") });
    let userPoolTokens = await pool.balanceOf(userB.address);
    expect(userPoolTokens).to.be.eq(ethers.utils.parseEther("2"));

    // user is eligible for 2/2 * 3 = 3
    await pool.connect(userB).withdraw(ethers.utils.parseEther("3"));

    let userETHBalanceAfter = await userB.getBalance("latest");

    expect(userETHBalanceAfter).to.be.greaterThanOrEqual(
      ethers.utils.parseEther("5")
    );
    expect(userETHBalanceAfter).to.be.lessThanOrEqual(
      ethers.utils.parseEther("6")
    );
  });

  it("admin and two users deposit", async () => {
    // admin deposits 1
    await userA.sendTransaction({
      value: ethers.utils.parseEther("1"),
      to: pool.address,
    });

    // userB deposits 2
    await pool.connect(userB).deposit({ value: ethers.utils.parseEther("2") });
    let userBPoolTokens = await pool.balanceOf(userB.address);
    expect(userBPoolTokens).to.be.eq(ethers.utils.parseEther("2"));

    // userC deposits 1
    await pool.connect(userC).deposit({ value: ethers.utils.parseEther("1") });
    let userCPoolTokens = await pool.balanceOf(userC.address);
    expect(userCPoolTokens).to.be.eq(ethers.utils.parseEther("1"));

    // userB is eligible for 2/3 * 4 = 2.66
    await expect(
      pool.connect(userB).withdraw(ethers.utils.parseEther("3"))
    ).to.be.revertedWith("Given amount is greater than available rewards");

    await pool.connect(userB).withdraw(ethers.utils.parseEther("2.66"));

    let userBETHBalanceAfter = await userB.getBalance("latest");

    expect(userBETHBalanceAfter).to.be.greaterThanOrEqual(
      ethers.utils.parseEther("5")
    );
    expect(userBETHBalanceAfter).to.be.lessThanOrEqual(
      ethers.utils.parseEther("5.67")
    );

    // pool must not become insolvent
    await expect(
      pool.connect(userC).withdraw(ethers.utils.parseEther("2"))
    ).to.be.revertedWith("Contract out of liquidity");

    await pool.connect(userC).withdraw(ethers.utils.parseEther("1"));

    let userCETHBalanceAfter = await userC.getBalance("latest");

    expect(userCETHBalanceAfter).to.be.greaterThanOrEqual(
      ethers.utils.parseEther("4")
    );
    expect(userCETHBalanceAfter).to.be.lessThanOrEqual(
      ethers.utils.parseEther("5")
    );
  });

  it("no admin deposit, two users deposit", async () => {
    // userB deposits 2
    await pool.connect(userB).deposit({ value: ethers.utils.parseEther("1") });
    let userBPoolTokens = await pool.balanceOf(userB.address);
    expect(userBPoolTokens).to.be.eq(ethers.utils.parseEther("1"));

    // userC deposits 1
    await pool.connect(userC).deposit({ value: ethers.utils.parseEther("1") });
    let userCPoolTokens = await pool.balanceOf(userC.address);
    expect(userCPoolTokens).to.be.eq(ethers.utils.parseEther("1"));

    await pool.connect(userB).withdraw(ethers.utils.parseEther("1"));
    let userBETHBalanceAfter = await userB.getBalance("latest");
    expect(userBETHBalanceAfter).to.be.greaterThanOrEqual(
      ethers.utils.parseEther("4")
    );
    expect(userBETHBalanceAfter).to.be.lessThanOrEqual(
      ethers.utils.parseEther("5")
    );

    await pool.connect(userC).withdraw(ethers.utils.parseEther("1"));
    let userCETHBalanceAfter = await userC.getBalance("latest");
    expect(userCETHBalanceAfter).to.be.greaterThanOrEqual(
      ethers.utils.parseEther("4")
    );
    expect(userCETHBalanceAfter).to.be.lessThanOrEqual(
      ethers.utils.parseEther("5")
    );
  });
});
