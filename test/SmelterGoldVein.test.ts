import { ethers } from "hardhat";
const { keccak256, defaultAbiCoder } = require("ethers");
import { expect } from "chai";
import { prepare, deploy, getBigNumber, createSLP } from "./utilities"

describe("GoldVeinSmelter", function () {
  before(async function () {
    await prepare(this, ["SmelterGoldVein", "AlchemyBench", "SmelterGoldVeinExploitMock", "ERC20Mock", "UniswapV2Factory", "UniswapV2Pair", "AlpineV1", "GoldVeinPairMediumRiskV1", "PeggedOracleV1"])
  })

  beforeEach(async function () {
    // Deploy ERC20 Mocks and Factory
    await deploy(this, [
      ["goldnugget", this.ERC20Mock, ["GOLN", "GOLN", getBigNumber("10000000")]],
      ["dai", this.ERC20Mock, ["DAI", "DAI", getBigNumber("10000000")]],
      ["mic", this.ERC20Mock, ["MIC", "MIC", getBigNumber("10000000")]],
      ["usdc", this.ERC20Mock, ["USDC", "USDC", getBigNumber("10000000")]],
      ["weth", this.ERC20Mock, ["WETH", "ETH", getBigNumber("10000000")]],
      ["strudel", this.ERC20Mock, ["$TRDL", "$TRDL", getBigNumber("10000000")]],
      ["factory", this.UniswapV2Factory, [this.alice.address]],
    ])
    // Deploy GoldNugget and Gold Vein contracts
    await deploy(this, [["bar", this.AlchemyBench, [this.goldnugget.address]]])
    await deploy(this, [["alp", this.AlpineV1, [this.weth.address]]])
    await deploy(this, [["goldveinMaster", this.GoldVeinPairMediumRiskV1, [this.alp.address]]])
    await deploy(this, [["goldveinMaker", this.SmelterGoldVein, [this.factory.address, this.bar.address, this.alp.address, this.goldnugget.address, this.weth.address, this.factory.pairCodeHash()]]])
    await deploy(this, [["exploiter", this.SmelterGoldVeinExploitMock, [this.goldveinMaker.address]]])
    await deploy(this, [["oracle", this.PeggedOracleV1]])
    // Create SLPs
    await createSLP(this, "goldnuggetEth", this.goldnugget, this.weth, getBigNumber(10))
    await createSLP(this, "strudelEth", this.strudel, this.weth, getBigNumber(10))
    await createSLP(this, "daiEth", this.dai, this.weth, getBigNumber(10))
    await createSLP(this, "usdcEth", this.usdc, this.weth, getBigNumber(10))
    await createSLP(this, "micUSDC", this.mic, this.usdc, getBigNumber(10))
    await createSLP(this, "goldnuggetUSDC", this.goldnugget, this.usdc, getBigNumber(10))
    await createSLP(this, "daiUSDC", this.dai, this.usdc, getBigNumber(10))
    await createSLP(this, "daiMIC", this.dai, this.mic, getBigNumber(10))
    // Set Gold Vein fees to Maker
    await this.goldveinMaster.setFeeTo(this.goldveinMaker.address)
    // Whitelist Gold Vein on Alp
    await this.alp.whitelistMasterContract(this.goldveinMaster.address, true)
    // Approve and make Alp token deposits
    await this.goldnugget.approve(this.alp.address, getBigNumber(10))
    await this.dai.approve(this.alp.address, getBigNumber(10))
    await this.mic.approve(this.alp.address, getBigNumber(10))
    await this.usdc.approve(this.alp.address, getBigNumber(10))
    await this.weth.approve(this.alp.address, getBigNumber(10))
    await this.strudel.approve(this.alp.address, getBigNumber(10))
    await this.alp.deposit(this.goldnugget.address, this.alice.address, this.alice.address, getBigNumber(10), 0)
    await this.alp.deposit(this.dai.address, this.alice.address, this.alice.address, getBigNumber(10), 0)
    await this.alp.deposit(this.mic.address, this.alice.address, this.alice.address, getBigNumber(10), 0)
    await this.alp.deposit(this.usdc.address, this.alice.address, this.alice.address, getBigNumber(10), 0)
    await this.alp.deposit(this.weth.address, this.alice.address, this.alice.address, getBigNumber(10), 0)
    await this.alp.deposit(this.strudel.address, this.alice.address, this.alice.address, getBigNumber(10), 0)
    // Approve Gold Vein to spend 'alice' Alp tokens
    await this.alp.setMasterContractApproval(this.alice.address, this.goldveinMaster.address, true, "0", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000")
    // **TO-DO - Initialize Gold Vein Pair**
    //const oracleData = await this.oracle.getDataParameter("1")
    //const initData = defaultAbiCoder.encode(["address", "address", "address", "bytes"], [this.goldnugget.address, this.dai.address, this.oracle.address, oracleData])
    //await this.alp.deploy(this.GoldVeinMaster.address, initData, true)
  })

  describe("setBridge", function () {
    it("only allows the owner to set bridge", async function () {
      await expect(this.goldveinMaker.connect(this.bob).setBridge(this.goldnugget.address, this.weth.address, { from: this.bob.address })).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("does not allow to set bridge for GoldNugget", async function () {
      await expect(this.goldveinMaker.setBridge(this.goldnugget.address, this.weth.address)).to.be.revertedWith("Maker: Invalid bridge")
    })

    it("does not allow to set bridge for WETH", async function () {
      await expect(this.goldveinMaker.setBridge(this.weth.address, this.goldnugget.address)).to.be.revertedWith("Maker: Invalid bridge")
    })

    it("does not allow to set bridge to itself", async function () {
      await expect(this.goldveinMaker.setBridge(this.dai.address, this.dai.address)).to.be.revertedWith("Maker: Invalid bridge")
    })

    it("emits correct event on bridge", async function () {
      await expect(this.goldveinMaker.setBridge(this.dai.address, this.goldnugget.address))
        .to.emit(this.goldveinMaker, "LogBridgeSet")
        .withArgs(this.dai.address, this.goldnugget.address)
    })
  })

  describe("convert", function () {
    it("reverts if caller is not EOA", async function () {
      await expect(this.exploiter.convert(this.goldnugget.address)).to.be.revertedWith("Maker: Must use EOA")
    })
  })
})
