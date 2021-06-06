module.exports = async function ({ ethers, deployments, getNamedAccounts }) {
  const { deploy } = deployments

  const { deployer, dev } = await getNamedAccounts()

  const goldnugget = await ethers.getContract("GoldNugget")
  
  const { address } = await deploy("GoldMiner", {
    from: deployer,
    args: [goldnugget.address, dev, "1000000000000000000000", "0", "1000000000000000000000"],
    log: true,
    deterministicDeployment: false
  })

  if (await goldnugget.owner() !== address) {
    // Transfer GoldNugget Ownership to Miner
    console.log("Transfer GoldNugget Ownership to Miner")
    await (await goldnugget.transferOwnership(address)).wait()
  }

  const goldMiner = await ethers.getContract("GoldMiner")
  if (await goldMiner.owner() !== dev) {
    // Transfer ownership of GoldMiner to dev
    console.log("Transfer ownership of GoldMiner to dev")
    await (await goldMiner.transferOwnership(dev)).wait()
  }
}

module.exports.tags = ["GoldMiner"]
module.exports.dependencies = ["UniswapV2Factory", "UniswapV2Router02", "GoldNugget"]
