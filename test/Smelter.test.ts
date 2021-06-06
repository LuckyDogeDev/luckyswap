import { expect } from "chai";
import { prepare, deploy, getBigNumber, createSLP } from "./utilities"

describe("Smelter", function () {
  before(async function () {
    await prepare(this, ["Smelter", "AlchemyBench", "SmelterExploitMock", "ERC20Mock", "UniswapV2Factory", "UniswapV2Pair"])
  })

  beforeEach(async function () {
    await deploy(this, [
      ["goldnugget", this.ERC20Mock, ["GOLN", "GOLN", getBigNumber("10000000")]],
      ["dai", this.ERC20Mock, ["DAI", "DAI", getBigNumber("10000000")]],
      ["mic", this.ERC20Mock, ["MIC", "MIC", getBigNumber("10000000")]],
      ["usdc", this.ERC20Mock, ["USDC", "USDC", getBigNumber("10000000")]],
      ["weth", this.ERC20Mock, ["WETH", "ETH", getBigNumber("10000000")]],
      ["strudel", this.ERC20Mock, ["$TRDL", "$TRDL", getBigNumber("10000000")]],
      ["factory", this.UniswapV2Factory, [this.alice.address]],
    ])
    await deploy(this, [["bar", this.AlchemyBench, [this.goldnugget.address]]])
    await deploy(this, [["smelTer", this.Smelter, [this.factory.address, this.bar.address, this.goldnugget.address, this.weth.address]]])
    await deploy(this, [["exploiter", this.SmelterExploitMock, [this.smelTer.address]]])
    await createSLP(this, "goldnuggetEth", this.goldnugget, this.weth, getBigNumber(10))
    await createSLP(this, "strudelEth", this.strudel, this.weth, getBigNumber(10))
    await createSLP(this, "daiEth", this.dai, this.weth, getBigNumber(10))
    await createSLP(this, "usdcEth", this.usdc, this.weth, getBigNumber(10))
    await createSLP(this, "micUSDC", this.mic, this.usdc, getBigNumber(10))
    await createSLP(this, "goldnuggetUSDC", this.goldnugget, this.usdc, getBigNumber(10))
    await createSLP(this, "daiUSDC", this.dai, this.usdc, getBigNumber(10))
    await createSLP(this, "daiMIC", this.dai, this.mic, getBigNumber(10))
  })
  describe("setBridge", function () {
    it("does not allow to set bridge for GoldNugget", async function () {
      await expect(this.smelTer.setBridge(this.goldnugget.address, this.weth.address)).to.be.revertedWith("Smelter: Invalid bridge")
    })

    it("does not allow to set bridge for WETH", async function () {
      await expect(this.smelTer.setBridge(this.weth.address, this.goldnugget.address)).to.be.revertedWith("Smelter: Invalid bridge")
    })

    it("does not allow to set bridge to itself", async function () {
      await expect(this.smelTer.setBridge(this.dai.address, this.dai.address)).to.be.revertedWith("Smelter: Invalid bridge")
    })

    it("emits correct event on bridge", async function () {
      await expect(this.smelTer.setBridge(this.dai.address, this.goldnugget.address))
        .to.emit(this.smelTer, "LogBridgeSet")
        .withArgs(this.dai.address, this.goldnugget.address)
    })
  })
  describe("convert", function () {
    it("should convert GOLN - ETH", async function () {
      await this.goldnuggetEth.transfer(this.smelTer.address, getBigNumber(1))
      await this.smelTer.convert(this.goldnugget.address, this.weth.address)
      expect(await this.goldnugget.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.goldnuggetEth.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.goldnugget.balanceOf(this.bar.address)).to.equal("1897569270781234370")
    })

    it("should convert USDC - ETH", async function () {
      await this.usdcEth.transfer(this.smelTer.address, getBigNumber(1))
      await this.smelTer.convert(this.usdc.address, this.weth.address)
      expect(await this.goldnugget.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.usdcEth.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.goldnugget.balanceOf(this.bar.address)).to.equal("1590898251382934275")
    })

    it("should convert $TRDL - ETH", async function () {
      await this.strudelEth.transfer(this.smelTer.address, getBigNumber(1))
      await this.smelTer.convert(this.strudel.address, this.weth.address)
      expect(await this.goldnugget.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.strudelEth.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.goldnugget.balanceOf(this.bar.address)).to.equal("1590898251382934275")
    })

    it("should convert USDC - GOLN", async function () {
      await this.goldnuggetUSDC.transfer(this.smelTer.address, getBigNumber(1))
      await this.smelTer.convert(this.usdc.address, this.goldnugget.address)
      expect(await this.goldnugget.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.goldnuggetUSDC.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.goldnugget.balanceOf(this.bar.address)).to.equal("1897569270781234370")
    })

    it("should convert using standard ETH path", async function () {
      await this.daiEth.transfer(this.smelTer.address, getBigNumber(1))
      await this.smelTer.convert(this.dai.address, this.weth.address)
      expect(await this.goldnugget.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.daiEth.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.goldnugget.balanceOf(this.bar.address)).to.equal("1590898251382934275")
    })

    it("converts MIC/USDC using more complex path", async function () {
      await this.micUSDC.transfer(this.smelTer.address, getBigNumber(1))
      await this.smelTer.setBridge(this.usdc.address, this.goldnugget.address)
      await this.smelTer.setBridge(this.mic.address, this.usdc.address)
      await this.smelTer.convert(this.mic.address, this.usdc.address)
      expect(await this.goldnugget.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.micUSDC.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.goldnugget.balanceOf(this.bar.address)).to.equal("1590898251382934275")
    })

    it("converts DAI/USDC using more complex path", async function () {
      await this.daiUSDC.transfer(this.smelTer.address, getBigNumber(1))
      await this.smelTer.setBridge(this.usdc.address, this.goldnugget.address)
      await this.smelTer.setBridge(this.dai.address, this.usdc.address)
      await this.smelTer.convert(this.dai.address, this.usdc.address)
      expect(await this.goldnugget.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.daiUSDC.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.goldnugget.balanceOf(this.bar.address)).to.equal("1590898251382934275")
    })

    it("converts DAI/MIC using two step path", async function () {
      await this.daiMIC.transfer(this.smelTer.address, getBigNumber(1))
      await this.smelTer.setBridge(this.dai.address, this.usdc.address)
      await this.smelTer.setBridge(this.mic.address, this.dai.address)
      await this.smelTer.convert(this.dai.address, this.mic.address)
      expect(await this.goldnugget.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.daiMIC.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.goldnugget.balanceOf(this.bar.address)).to.equal("1200963016721363748")
    })

    it("reverts if it loops back", async function () {
      await this.daiMIC.transfer(this.smelTer.address, getBigNumber(1))
      await this.smelTer.setBridge(this.dai.address, this.mic.address)
      await this.smelTer.setBridge(this.mic.address, this.dai.address)
      await expect(this.smelTer.convert(this.dai.address, this.mic.address)).to.be.reverted
    })

    it("reverts if caller is not EOA", async function () {
      await this.goldnuggetEth.transfer(this.smelTer.address, getBigNumber(1))
      await expect(this.exploiter.convert(this.goldnugget.address, this.weth.address)).to.be.revertedWith("Smelter: must use EOA")
    })

    it("reverts if pair does not exist", async function () {
      await expect(this.smelTer.convert(this.mic.address, this.micUSDC.address)).to.be.revertedWith("Smelter: Invalid pair")
    })

    it("reverts if no path is available", async function () {
      await this.micUSDC.transfer(this.smelTer.address, getBigNumber(1))
      await expect(this.smelTer.convert(this.mic.address, this.usdc.address)).to.be.revertedWith("Smelter: Cannot convert")
      expect(await this.goldnugget.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.micUSDC.balanceOf(this.smelTer.address)).to.equal(getBigNumber(1))
      expect(await this.goldnugget.balanceOf(this.bar.address)).to.equal(0)
    })
  })

  describe("convertMultiple", function () {
    it("should allow to convert multiple", async function () {
      await this.daiEth.transfer(this.smelTer.address, getBigNumber(1))
      await this.goldnuggetEth.transfer(this.smelTer.address, getBigNumber(1))
      await this.smelTer.convertMultiple([this.dai.address, this.goldnugget.address], [this.weth.address, this.weth.address])
      expect(await this.goldnugget.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.daiEth.balanceOf(this.smelTer.address)).to.equal(0)
      expect(await this.goldnugget.balanceOf(this.bar.address)).to.equal("3186583558687783097")
    })
  })
})
