module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  const goldnugget = await deployments.get("GoldNugget")

  await deploy("AlchemyBench", {
    from: deployer,
    args: [goldnugget.address],
    log: true,
    deterministicDeployment: false
  })
}

module.exports.tags = ["AlchemyBench"]
module.exports.dependencies = ["UniswapV2Factory", "UniswapV2Router02", "GoldNugget"]
