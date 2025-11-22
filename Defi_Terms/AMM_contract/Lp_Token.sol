//SPDX-License-Identifier :MIT

pragma solidity ^0.8.26;

contract LPTOKEN {

  string public name = "LPTOKEN";
  string public symbol = "LPT";  
  uint256 public totalSupply;

mapping(address => uint256) public balanceOf;
mapping(address => mapping(address => uint256)) public allowance;

event Minted(address indexed to, uint256 amount);
event BurnedSuccessFully(address indexed to , uint256 amount);
event TransferSuccessFully(address indexed from , address indexed to , uint256 amount);
event Approval( address indexed from , address indexed to , uint256 amount);
event TransferedSuccessFully(address indexed from , address indexed to , uint256 amount);
constructor() {}
receive() external payable {}
fallback() external payable { }

modifier amountNotZero(uint256 _amount)  {
if(_amount <= 0) return ;
_; 
}

function _mint(address _to , uint256 _amount) internal amountNotZero(_amount) {
    balanceOf[_to] += _amount;
    totalSupply += _amount;
    emit Minted(_to, _amount);
}

function _burn( address _to , uint256 _amount) internal amountNotZero(_amount)  {
   balanceOf[_to] -= _amount;
   totalSupply -= _amount;
   emit BurnedSuccessFully(_to,_amount);
}

function transfer(address to , uint256 amount ) external  amountNotZero(amount) returns(bool) {
    balanceOf[msg.sender] -= amount;
    balanceOf[to] += amount ;
    emit TransferSuccessFully(msg.sender, to , amount );
    return true;
}

function approve( address spender , uint256 amount) external amountNotZero(amount) returns(bool)  {
   allowance[msg.sender][spender] = amount;
   emit Approval(msg.sender, spender, amount);
   return true;
}

function transferFrom(address from , address to , uint256 amount ) external amountNotZero(amount)  returns(bool) {
require(allowance[from][msg.sender] >= amount , "Insufficient allowance" ); // check allowance amount)
allowance[from][msg.sender] -= amount;
balanceOf[from] -= amount ;
balanceOf[to] += amount ;
emit TransferedSuccessFully(  from , to , amount  );
return true;
}



}