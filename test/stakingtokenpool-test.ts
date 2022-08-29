import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { StakingTokenPool } from "../typechain-types/contracts/StakingTokenPool";

describe("StakingTokenPool", function () {
  let users;
  let userA: SignerWithAddress;
  let userB: SignerWithAddress;
  let pool: StakingTokenPool;

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
    let Pool = await ethers.getContractFactory("StakingTokenPool");
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
});
