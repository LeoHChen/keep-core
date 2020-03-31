
const {contract, web3} = require("@openzeppelin/test-environment")
const { duration, increaseTime } = require('../helpers/increaseTime');
const latestTime = require('../helpers/latestTime');
const { createSnapshot, restoreSnapshot } = require('../helpers/snapshot');

const BN = web3.utils.BN
const chai = require('chai')
chai.use(require('bn-chai')(BN))
const expect = chai.expect

const KeepToken = contract.fromArtifact('KeepToken');
const TokenStaking = contract.fromArtifact('TokenStaking');
const Registry = contract.fromArtifact("Registry");

describe('TokenStaking', function() {
  let token, registry, stakingContract,
    minimumStakeSteps, minimumStakeSchedule, keepDecimals;
  const initializationPeriod = 10;
  const undelegationPeriod = 30;

  before(async () => {
    token = await KeepToken.new();
    registry = await Registry.new();
    stakingContract = await TokenStaking.new(
      token.address, registry.address, initializationPeriod, undelegationPeriod
    );

    minimumStakeSteps = await stakingContract.minimumStakeSteps();
    minimumStakeSchedule = await stakingContract.minimumStakeSchedule();
    keepDecimals = web3.utils.toBN(10).pow(web3.utils.toBN(18));
  });

  beforeEach(async () => {
    await createSnapshot()
  })

  afterEach(async () => {
    await restoreSnapshot()
  })

  describe("minimumStake", async () => {
    it("returns max value when the schedule starts", async () => {
      expect(await stakingContract.minimumStake()).to.eq.BN(
        web3.utils.toBN(100000).mul(keepDecimals),
        "Unexpected minimum stake amount"
      );
    })

    it("returns max value right before the next schedule step", async () => {
      let minimumStakeScheduleStart = await stakingContract.minimumStakeScheduleStart();
      let stepDuration = minimumStakeSchedule.div(minimumStakeSteps)
      let timeForStepOne = minimumStakeScheduleStart.add(stepDuration)
      // Rounding timestamp jump to 1 minute less (looks like increaseTime() can occasionally add extra seconds)
      await increaseTime(timeForStepOne.toNumber() - await latestTime() - duration.minutes(1))
      expect(await stakingContract.minimumStake()).to.eq.BN(
        web3.utils.toBN(100000).mul(keepDecimals),
        "Unexpected minimum stake amount"
      );
    })

    it("returns correct value right after the first schedule step", async () => {
      let minimumStakeScheduleStart = await stakingContract.minimumStakeScheduleStart();
      let stepDuration = minimumStakeSchedule.div(minimumStakeSteps)
      let timeForStepOne = minimumStakeScheduleStart.add(stepDuration)
      await increaseTime(timeForStepOne.toNumber() - await latestTime())
      expect(await stakingContract.minimumStake()).to.eq.BN(
        web3.utils.toBN(90000).mul(keepDecimals),
        "Unexpected minimum stake amount"
      );
    })

    it("returns half value in the middle of the schedule", async () => {
      await increaseTime(minimumStakeSchedule.divn(2).toNumber());
      expect(await stakingContract.minimumStake()).to.eq.BN(
        web3.utils.toBN(50000).mul(keepDecimals),
        "Unexpected minimum stake amount"
      );
    })

    it("returns min value when the schedule ends", async () => {
      await increaseTime(minimumStakeSchedule.toNumber());
      expect(await stakingContract.minimumStake()).to.eq.BN(
        web3.utils.toBN(10000).mul(keepDecimals),
        "Unexpected minimum stake amount"
      );
    })
  })
});
