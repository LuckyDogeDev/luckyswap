import { ethers } from "hardhat";
import { expect } from "chai";

describe("AlchemyBench", function () {
  before(async function () {
    this.GoldNugget = await ethers.getContractFactory("GoldNugget")
    this.AlchemyBench = await ethers.getContractFactory("AlchemyBench")

    this.signers = await ethers.getSigners()
    this.alice = this.signers[0]
    this.bob = this.signers[1]
    this.carol = this.signers[2]
  })

  beforeEach(async function () {
    this.goldnugget = await this.GoldNugget.deploy()
    this.alchemybench = await this.AlchemyBench.deploy(this.goldnugget.address)
    this.goldnugget.mint(this.alice.address, "100")
    this.goldnugget.mint(this.bob.address, "100")
    this.goldnugget.mint(this.carol.address, "100")
  })

  it("should not allow enter if not enough approve", async function () {
    await expect(this.alchemybench.enter("100")).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    await this.goldnugget.approve(this.alchemybench.address, "50")
    await expect(this.alchemybench.enter("100")).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    await this.goldnugget.approve(this.alchemybench.address, "100")
    await this.alchemybench.enter("100")
    expect(await this.alchemybench.balanceOf(this.alice.address)).to.equal("100")
  })

  it("should not allow withraw more than what you have", async function () {
    await this.goldnugget.approve(this.alchemybench.address, "100")
    await this.alchemybench.enter("100")
    await expect(this.alchemybench.leave("200")).to.be.revertedWith("ERC20: burn amount exceeds balance")
  })

  it("should work with more than one participant", async function () {
    await this.goldnugget.approve(this.alchemybench.address, "100")
    await this.goldnugget.connect(this.bob).approve(this.alchemybench.address, "100", { from: this.bob.address })
    // Alice enters and gets 20 shares. Bob enters and gets 10 shares.
    await this.alchemybench.enter("20")
    await this.alchemybench.connect(this.bob).enter("10", { from: this.bob.address })
    expect(await this.alchemybench.balanceOf(this.alice.address)).to.equal("20")
    expect(await this.alchemybench.balanceOf(this.bob.address)).to.equal("10")
    expect(await this.goldnugget.balanceOf(this.alchemybench.address)).to.equal("30")
    // AlchemyBench get 20 more GOLNs from an external source.
    await this.goldnugget.connect(this.carol).transfer(this.alchemybench.address, "20", { from: this.carol.address })
    // Alice deposits 10 more GOLNs. She should receive 10*30/50 = 6 shares.
    await this.alchemybench.enter("10")
    expect(await this.alchemybench.balanceOf(this.alice.address)).to.equal("26")
    expect(await this.alchemybench.balanceOf(this.bob.address)).to.equal("10")
    // Bob withdraws 5 shares. He should receive 5*60/36 = 8 shares
    await this.alchemybench.connect(this.bob).leave("5", { from: this.bob.address })
    expect(await this.alchemybench.balanceOf(this.alice.address)).to.equal("26")
    expect(await this.alchemybench.balanceOf(this.bob.address)).to.equal("5")
    expect(await this.goldnugget.balanceOf(this.alchemybench.address)).to.equal("52")
    expect(await this.goldnugget.balanceOf(this.alice.address)).to.equal("70")
    expect(await this.goldnugget.balanceOf(this.bob.address)).to.equal("98")
  })
})
