import { expect, assert } from "chai";
import { advanceTime, advanceTimeAndBlock, advanceBlockTo, advanceBlock, prepare, deploy, getBigNumber, ADDRESS_ZERO } from "./utilities"
const { BigNumber } = require("ethers")
import {ethers} from "hardhat"

describe("MiniMinerV2", function () {
  before(async function () {
    await prepare(this, ['MiniMinerV2', 'GoldNugget', 'ERC20Mock', 'RewarderMock', 'RewarderBrokenMock'])
    await deploy(this, [
      ["brokenRewarder", this.RewarderBrokenMock]
    ])
  })

  beforeEach(async function () {
    await deploy(this, [
      ["goldnugget", this.GoldNugget],
    ])

    await deploy(this,
      [["lp", this.ERC20Mock, ["LP Token", "LPT", getBigNumber(10)]],
      ["dummy", this.ERC20Mock, ["Dummy", "DummyT", getBigNumber(10)]],
      ['miner', this.MiniMinerV2, [this.goldnugget.address]],
      ["rlp", this.ERC20Mock, ["LP", "rLPT", getBigNumber(10)]],
      ["r", this.ERC20Mock, ["Reward", "RewardT", getBigNumber(100000)]],
    ])
    await deploy(this, [["rewarder", this.RewarderMock, [getBigNumber(1), this.r.address, this.miner.address]]])

    await this.goldnugget.mint(this.miner.address, getBigNumber(10000))
    await this.lp.approve(this.miner.address, getBigNumber(10))
    await this.miner.setGoldNuggetPerSecond("10000000000000000")
    await this.rlp.transfer(this.bob.address, getBigNumber(1))
  })

  describe("PoolLength", function () {
    it("PoolLength should execute", async function () {
      await this.miner.add(10, this.rlp.address, this.rewarder.address)
      expect((await this.miner.poolLength())).to.be.equal(1);
    })
  })

  describe("Set", function() {
    it("Should emit event LogSetPool", async function () {
      await this.miner.add(10, this.rlp.address, this.rewarder.address)
      await expect(this.miner.set(0, 10, this.dummy.address, false))
            .to.emit(this.miner, "LogSetPool")
            .withArgs(0, 10, this.rewarder.address, false)
      await expect(this.miner.set(0, 10, this.dummy.address, true))
            .to.emit(this.miner, "LogSetPool")
            .withArgs(0, 10, this.dummy.address, true)
      })

    it("Should revert if invalid pool", async function () {
      let err;
      try {
        await this.miner.set(0, 10, this.rewarder.address, false)
      } catch (e) {
        err = e;
      }

      assert.equal(err.toString(), "Error: VM Exception while processing transaction: invalid opcode")
    })
  })

  describe("PendingGoldNugget", function() {
    it("PendingGoldNugget should equal ExpectedGoldNugget", async function () {
      await this.miner.add(10, this.rlp.address, this.rewarder.address)
      await this.rlp.approve(this.miner.address, getBigNumber(10))
      let log = await this.miner.deposit(0, getBigNumber(1), this.alice.address)
      await advanceTime(86400)
      let log2 = await this.miner.updatePool(0)
      let timestamp2 = (await ethers.provider.getBlock(log2.blockNumber)).timestamp
      let timestamp = (await ethers.provider.getBlock(log.blockNumber)).timestamp
      let expectedGoldNugget = BigNumber.from("10000000000000000").mul(timestamp2 - timestamp)
      let pendingGoldNugget = await this.miner.pendingGoldNugget(0, this.alice.address)
      expect(pendingGoldNugget).to.be.equal(expectedGoldNugget)
    })
    it("When time is lastRewardTime", async function () {
      await this.miner.add(10, this.rlp.address, this.rewarder.address)
      await this.rlp.approve(this.miner.address, getBigNumber(10))
      let log = await this.miner.deposit(0, getBigNumber(1), this.alice.address)
      await advanceBlockTo(3)
      let log2 = await this.miner.updatePool(0)
      let timestamp2 = (await ethers.provider.getBlock(log2.blockNumber)).timestamp
      let timestamp = (await ethers.provider.getBlock(log.blockNumber)).timestamp
      let expectedGoldNugget = BigNumber.from("10000000000000000").mul(timestamp2 - timestamp)
      let pendingGoldNugget = await this.miner.pendingGoldNugget(0, this.alice.address)
      expect(pendingGoldNugget).to.be.equal(expectedGoldNugget)
    })
  })

  describe("MassUpdatePools", function () {
    it("Should call updatePool", async function () {
      await this.miner.add(10, this.rlp.address, this.rewarder.address)
      await advanceBlockTo(1)
      await this.miner.massUpdatePools([0])
      //expect('updatePool').to.be.calledOnContract(); //not suported by heardhat
      //expect('updatePool').to.be.calledOnContractWith(0); //not suported by heardhat

    })

    it("Updating invalid pools should fail", async function () {
      let err;
      try {
        await this.miner.massUpdatePools([0, 10000, 100000])
      } catch (e) {
        err = e;
      }

      assert.equal(err.toString(), "Error: VM Exception while processing transaction: invalid opcode")
    })
})

  describe("Add", function () {
    it("Should add pool with reward token multiplier", async function () {
      await expect(this.miner.add(10, this.rlp.address, this.rewarder.address))
            .to.emit(this.miner, "LogPoolAddition")
            .withArgs(0, 10, this.rlp.address, this.rewarder.address)
      })
  })

  describe("UpdatePool", function () {
    it("Should emit event LogUpdatePool", async function () {
      await this.miner.add(10, this.rlp.address, this.rewarder.address)
      await advanceBlockTo(1)
      await expect(this.miner.updatePool(0))
            .to.emit(this.miner, "LogUpdatePool")
            .withArgs(0, (await this.miner.poolInfo(0)).lastRewardTime,
              (await this.rlp.balanceOf(this.miner.address)),
              (await this.miner.poolInfo(0)).accGoldNuggetPerShare)
    })

    it("Should take else path", async function () {
      await this.miner.add(10, this.rlp.address, this.rewarder.address)
      await advanceBlockTo(1)
      await this.miner.batch(
          [
              this.miner.interface.encodeFunctionData("updatePool", [0]),
              this.miner.interface.encodeFunctionData("updatePool", [0]),
          ],
          true
      )
    })
  })

  describe("Deposit", function () {
    it("Depositing 0 amount", async function () {
      await this.miner.add(10, this.rlp.address, this.rewarder.address)
      await this.rlp.approve(this.miner.address, getBigNumber(10))
      await expect(this.miner.deposit(0, getBigNumber(0), this.alice.address))
            .to.emit(this.miner, "Deposit")
            .withArgs(this.alice.address, 0, 0, this.alice.address)
    })

    it("Depositing into non-existent pool should fail", async function () {
      let err;
      try {
        await this.miner.deposit(1001, getBigNumber(0), this.alice.address)
      } catch (e) {
        err = e;
      }

      assert.equal(err.toString(), "Error: VM Exception while processing transaction: invalid opcode")
    })
  })

  describe("Withdraw", function () {
    it("Withdraw 0 amount", async function () {
      await this.miner.add(10, this.rlp.address, this.rewarder.address)
      await expect(this.miner.withdraw(0, getBigNumber(0), this.alice.address))
            .to.emit(this.miner, "Withdraw")
            .withArgs(this.alice.address, 0, 0, this.alice.address)
    })
  })

  describe("Harvest", function () {
    it("Should give back the correct amount of GOLN and reward", async function () {
        await this.r.transfer(this.rewarder.address, getBigNumber(100000))
        await this.miner.add(10, this.rlp.address, this.rewarder.address)
        await this.rlp.approve(this.miner.address, getBigNumber(10))
        expect(await this.miner.lpToken(0)).to.be.equal(this.rlp.address)
        let log = await this.miner.deposit(0, getBigNumber(1), this.alice.address)
        await advanceTime(86400)
        let log2 = await this.miner.withdraw(0, getBigNumber(1), this.alice.address)
        let timestamp2 = (await ethers.provider.getBlock(log2.blockNumber)).timestamp
        let timestamp = (await ethers.provider.getBlock(log.blockNumber)).timestamp
        let expectedGoldNugget = BigNumber.from("10000000000000000").mul(timestamp2 - timestamp)
        expect((await this.miner.userInfo(0, this.alice.address)).rewardDebt).to.be.equal("-"+expectedGoldNugget)
        await this.miner.harvest(0, this.alice.address)
        expect(await this.goldnugget.balanceOf(this.alice.address)).to.be.equal(await this.r.balanceOf(this.alice.address)).to.be.equal(expectedGoldNugget)
    })
    it("Harvest with empty user balance", async function () {
      await this.miner.add(10, this.rlp.address, this.rewarder.address)
      await this.miner.harvest(0, this.alice.address)
    })

    it("Harvest for GOLN-only pool", async function () {
      await this.miner.add(10, this.rlp.address, ADDRESS_ZERO)
      await this.rlp.approve(this.miner.address, getBigNumber(10))
      expect(await this.miner.lpToken(0)).to.be.equal(this.rlp.address)
      let log = await this.miner.deposit(0, getBigNumber(1), this.alice.address)
      await advanceBlock()
      let log2 = await this.miner.withdraw(0, getBigNumber(1), this.alice.address)
      let timestamp2 = (await ethers.provider.getBlock(log2.blockNumber)).timestamp
      let timestamp = (await ethers.provider.getBlock(log.blockNumber)).timestamp
      let expectedGoldNugget = BigNumber.from("10000000000000000").mul(timestamp2 - timestamp)
      expect((await this.miner.userInfo(0, this.alice.address)).rewardDebt).to.be.equal("-"+expectedGoldNugget)
      await this.miner.harvest(0, this.alice.address)
      expect(await this.goldnugget.balanceOf(this.alice.address)).to.be.equal(expectedGoldNugget)
    })
  })

  describe("EmergencyWithdraw", function() {
    it("Should emit event EmergencyWithdraw", async function () {
      await this.r.transfer(this.rewarder.address, getBigNumber(100000))
      await this.miner.add(10, this.rlp.address, this.rewarder.address)
      await this.rlp.approve(this.miner.address, getBigNumber(10))
      await this.miner.deposit(0, getBigNumber(1), this.bob.address)
      //await this.miner.emergencyWithdraw(0, this.alice.address)
      await expect(this.miner.connect(this.bob).emergencyWithdraw(0, this.bob.address))
      .to.emit(this.miner, "EmergencyWithdraw")
      .withArgs(this.bob.address, 0, getBigNumber(1), this.bob.address)
    })
  })
})
