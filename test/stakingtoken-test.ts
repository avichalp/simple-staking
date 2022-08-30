import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { StakingToken } from "../typechain-types/contracts/StakingToken";

describe("StakingToken", function () {
  let users;
  let userA: SignerWithAddress;
  let userB: SignerWithAddress;
  let pool: StakingToken;

  beforeEach(async function () {
    users = await ethers.getSigners();
    [userA, userB] = users;
    await ethers.provider.send("hardhat_setBalance", [
      userA.address,
      "0x4563918244F40000", // 5 ETH
    ]);
    await ethers.provider.send("hardhat_setBalance", [
      userB.address,
      "0x4563918244F40000", // 5 ETH
    ]);
    let Pool = await ethers.getContractFactory("StakingToken");
    pool = await Pool.connect(userA).deploy();
    await pool.deployed();
  });

  it("user deposits ETH in the pool, get back sPOOL tokens", async function () {
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

  it("user tries to deposit 0 ETH", async function () {
    let sPOOLBalanceBefore = await pool.balanceOf(userB.address);
    let userEthBalanceBefore = await userB.getBalance("latest");
    expect(sPOOLBalanceBefore).to.be.eq(ethers.BigNumber.from(0));
    expect(userEthBalanceBefore).to.be.eq(ethers.utils.parseEther("5"));

    await expect(
      pool.connect(userB).deposit({ value: ethers.utils.parseEther("0") })
    ).to.be.revertedWith("Zero deposit is not allowed");
  });

  it("user deposits and withdraws ETH", async function () {
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
    ).to.be.revertedWith("Given amount is greater than available rewards");
  });
});
