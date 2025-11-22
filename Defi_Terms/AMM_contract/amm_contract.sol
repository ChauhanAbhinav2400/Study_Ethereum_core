//SPDX-License-Identifier :MIT

pragma solidity ^0.8.26;
import {LPTOKEN} from "./Lp_token.sol";

interface IERC20 {
    function totalSupply() external view returns (uint);
    function balanceOf(address account) external view returns (uint);
    function transfer(address recipient, uint amount) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint amount
    ) external returns (bool);
    function approve(address spender, uint amount) external returns (bool);
}

contract AMMContract is LPTOKEN {
    IERC20 public tokenA;
    IERC20 public tokenB;

    uint256 reserveA;
    uint256 reserveB;

    event LiquidityRemoved(
        address Lp,
        uint256 tokenA_amount,
        uint256 tokenB_amount,
        uint256 liquidity
    );

    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function addLiquidity(
        uint256 amountADesired,
        uint256 amountBDesired
    ) external {
        tokenA.transferFrom(msg.sender, address(this), amountADesired);
        tokenB.transferFrom(msg.sender, address(this), amountBDesired);
        uint256 amountA;
        uint256 amountB;
        uint256 liquidity;
        if (totalSupply == 0) {
            amountA = amountADesired;
            amountB = amountBDesired;
            liquidity = sqrt(amountA * amountB);
        } else {
            uint256 amountAOptimal = (amountBDesired * reserveA) / reserveB;
            if (amountAOptimal <= amountADesired) {
                amountA = amountAOptimal;
                amountB = amountBDesired;
            } else {
                uint256 amountBOptimal = (amountADesired * reserveB) / reserveA;
                require(amountBOptimal <= amountBDesired, "Ratio Mismatch");
                amountB = amountBOptimal;
                amountA = amountADesired;
            }

            liquidity = min(
                (amountA * totalSupply) / reserveA,
                (amountB * totalSupply) / reserveB
            );
            require(liquidity > 0, "Liquidity more than zero ");

            _mint(msg.sender, liquidity);

            reserveA += amountA;
            reserveB += amountB;

            if (amountADesired > amountA) {
                tokenA.transfer(msg.sender, amountADesired - amountA);
            }

            if (amountBDesired > amountB) {
                tokenB.transfer(msg.sender, amountBDesired - amountB);
            }
        }
    }

    function removeLiquidity(
        uint256 liquidity
    ) external returns (uint256 amountA, uint256 amountB) {
        require(balanceOf[msg.sender] >= liquidity, "Not Enough Tokens");

        amountA = (liquidity * reserveA) / totalSupply;
        amountB = (liquidity * reserveB) / totalSupply;

        _burn(msg.sender, liquidity);
        reserveA -= amountA;
        reserveB -= amountB;

        tokenA.transfer(msg.sender, amountA);
        tokenB.transfer(msg.sender, amountB);
        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidity);
        return (amountA, amountB);
    }

    function swap(
        uint256 amountIn,
        address tokenIn
    ) external returns (uint256 amountOut) {
        bool isTokenA = tokenIn == address(tokenA);
        require(isTokenA || tokenIn == address(tokenB), "Invalid Token");

        uint256 amountInWithFee = (amountIn * 997) / 1000;
        if (isTokenA) {
            tokenA.transferFrom(msg.sender, address(this), amountIn);
             amountOut = getAmountOut(
                amountInWithFee,
                reserveA,
                reserveB
            );
            reserveA += amountIn;
            reserveB -= amountOut;
            tokenB.transfer(msg.sender, amountOut);
        } else {
            tokenB.transferFrom(msg.sender, address(this), amountIn);
             amountOut = getAmountOut(
                amountInWithFee,
                reserveB,
                reserveA
            );
            reserveA -= amountOut;
            reserveB += amountIn;
            tokenA.transfer(msg.sender, amountOut);
        }
    }

    /* ------------------------------------------------------------
       INTERNAL MATH HELPERS
    -------------------------------------------------------------*/

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256) {
        require(reserveIn > 0 && reserveOut > 0, "Empty reserves");
        uint numerator = amountIn * reserveOut;
        uint denominator = reserveIn + amountIn;
        return numerator / denominator;
    }

    function sqrt(uint y) private pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function min(uint a, uint b) private pure returns (uint) {
        return a < b ? a : b;
    }
}
