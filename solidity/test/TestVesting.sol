pragma solidity ^0.4.18;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/KeepToken.sol";
import "../contracts/TokenVesting.sol";
import "./helpers/ThrowProxy.sol";

contract TestVesting {  
  
  // Create KEEP token
  KeepToken token = new KeepToken();

  // Create vesting contract with 30 days withdrawal delay
  TokenVesting vestingContract = new TokenVesting(token, 30 days);


  uint vestingId;
  address vestingBeneficiary = 0xf17f52151EbEF6C7334FAD080c5704D77216b732;
  uint vestingStart = now;
  uint vestingDuration = 10 days;
  uint vestingCliff = 0;

  // Token holder should be able to vest it's tokens to a beneficiary
  function testCanVest() {
    uint balance = token.balanceOf(address(this));

    token.approve(address(vestingContract), 100);
    vestingId = vestingContract.vest(100, vestingBeneficiary, vestingDuration, vestingStart, vestingCliff, false);
    Assert.equal(token.balanceOf(address(this)), balance - 100, "Vesting amount should be taken out from main balance");
    Assert.equal(vestingContract.vestingBalanceOf(vestingBeneficiary), 100, "Vesting amount should be added to beneficiary vesting balance");
  }

  function testCanGetVestingByID() {
    var (owner, beneficiary, locked, revoked, revocable, amount, duration, start, cliff, released) = vestingContract.vestings(vestingId);
    Assert.equal(owner, address(this), "Vesting schedule should keep record of the owner");
    Assert.equal(beneficiary, vestingBeneficiary, "Vesting schedule should keep record of the vesting beneficiary");
    Assert.equal(locked, false, "Vesting schedule should initially be unlocked");
    Assert.equal(revoked, false, "Vesting schedule should not be marked as revoked initially");
    Assert.equal(revocable, false, "Vesting schedule should have revocable parameter");
    Assert.equal(amount, 100, "Vesting schedule should keep record of vested amount");
    Assert.equal(duration, vestingDuration, "Vesting schedule should have duration");
    Assert.equal(start, vestingStart, "Vesting schedule should have start time");
    Assert.equal(cliff, vestingStart+vestingCliff, "Vesting schedule should have cliff duration.");
    Assert.equal(released, 0, "Vesting schedule should have 0 amount released initially");
  }

  function testCannotReleaseVestedAmmount() {
    Assert.equal(vestingContract.unreleasedVestedAmount(vestingId), 0, "Unreleased Vested Amount should be 0");

    // http://truffleframework.com/tutorials/testing-for-throws-in-solidity-tests
    ThrowProxy throwProxy = new ThrowProxy(address(vestingContract));

    // Prime the proxy
    TokenVesting(address(throwProxy)).releaseVesting(vestingId);

    // Execute the call that is supposed to throw.
    // r will be false if it threw and true if it didn't.
    bool r = throwProxy.execute.gas(200000)();
    Assert.isFalse(r, "Should throw when trying to release vesting");

    Assert.equal(token.balanceOf(vestingBeneficiary), 0, "Released balance should not be added to beneficiary main balance");
  }

  // Vesting with 0 duration, release available immediately
  function testCanReleaseVestedAmount() {
    
    token.approve(address(vestingContract), 100);
    vestingId = vestingContract.vest(100, vestingBeneficiary, 0, now, 0, false);

    vestingContract.releaseVesting(vestingId);
    Assert.equal(token.balanceOf(vestingBeneficiary), 100, "Released balance should be added to beneficiary main balance");
    Assert.equal(vestingContract.unreleasedVestedAmount(vestingId), 0, "Unreleased vested amount should be 0 after release");
  }
}
