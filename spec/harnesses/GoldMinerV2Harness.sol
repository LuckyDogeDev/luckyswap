pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../../contracts/GoldMinerV2.sol";

contract GoldMinerV2Harness is GoldMinerV2 {
    ////////////////////////////////////////////////////////////////////////////
    //                         Constructors and inits                         //
    ////////////////////////////////////////////////////////////////////////////
    constructor(IGoldMiner _GOLD_MINER, IERC20 _goldnugget, uint256 _GOLD_PID)
                    GoldMinerV2(_GOLD_MINER, _goldnugget, _GOLD_PID) public { }

    ////////////////////////////////////////////////////////////////////////////
    //                        Getters for The Internals                       //
    ////////////////////////////////////////////////////////////////////////////
    function userInfoAmount(uint256 pid, address user) public view returns (uint256) {
        return userInfo[pid][user].amount;
    }

    function userInfoRewardDebt(uint256 pid, address user) public view returns (int256) {
        return userInfo[pid][user].rewardDebt;
    }

    function userLpTokenBalanceOf(uint256 pid, address user) public view returns (uint256) {
        return lpToken[pid].balanceOf(user);
    }

    function poolInfoAccGoldNuggetPerShare(uint256 pid) public view returns (uint128) {
        return poolInfo[pid].accGoldNuggetPerShare;
    }

    function poolInfoLastRewardBlock(uint256 pid) public view returns (uint64) {
        return poolInfo[pid].lastRewardBlock;
    }

    function poolInfoAllocPoint(uint256 pid) public view returns (uint64) {
        return poolInfo[pid].allocPoint;
    }

    ////////////////////////////////////////////////////////////////////////////
    //                           Overrided Methods                            //
    ////////////////////////////////////////////////////////////////////////////
    function batch(bytes[] calldata calls, bool revertOnFail) override external
            payable returns(bool[] memory successes, bytes[] memory results) { }

    mapping(uint256 => uint256) symbolicGoldNuggetPerBlock; // random number
    function goldnuggetPerBlock() public view override returns (uint256 amount) {
        return symbolicGoldNuggetPerBlock[block.number];
    }

    ////////////////////////////////////////////////////////////////////////////
    //                            General Helpers                             //
    ////////////////////////////////////////////////////////////////////////////
    // helpers for int operations since in spec it is not possible
    function compare(int256 x, int256 y) external pure returns (bool) {
		return x <= y;
	}

    function compareUint128(uint128 x, uint128 y) external pure returns (bool) {
		return x >= y;
	}

    ////////////////////////////////////////////////////////////////////////////
    //                     Helper Functions for Invariants                    //
    ////////////////////////////////////////////////////////////////////////////
    // for invariants we need a function that simulate the constructor 
	function init_state() public { }

    function lpTokenLength() public view returns (uint256) {
        return lpToken.length;
    }

    function rewarderLength() public view returns (uint256) {
        return rewarder.length;
    }
}