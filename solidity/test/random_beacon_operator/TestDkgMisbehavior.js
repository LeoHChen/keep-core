const {contract, web3, accounts} = require("@openzeppelin/test-environment")
var assert = require('chai').assert
const initContracts = require('../helpers/initContracts')
const sign = require('../helpers/signature')
const mineBlocks = require('../helpers/mineBlocks')
const {increaseTime} = require('../helpers/increaseTime')
const stakeDelegate = require('../helpers/stakeDelegate')
const packTicket = require('../helpers/packTicket')
const generateTickets = require('../helpers/generateTickets')
const {createSnapshot, restoreSnapshot} = require("../helpers/snapshot.js")

describe('KeepRandomBeaconOperator/DkgMisbehavior', function() {
  let token, stakingContract, operatorContract,
    owner = accounts[0],
    operator1 = accounts[1],
    operator2 = accounts[2],
    operator3 = accounts[3],
    operator4 = accounts[4],
    operator5 = accounts[5],
    authorizer = owner,
    selectedParticipants, signatures, signingMemberIndices = [],
    misbehaved = '0x0305', // disqualified operator3, inactive operator5
    groupPubKey = '0x1000000000000000000000000000000000000000000000000000000000000000',
    resultHash = web3.utils.soliditySha3(groupPubKey, misbehaved)

  before(async () => {
    
    let contracts = await initContracts(
      contract.fromArtifact('KeepToken'),
      contract.fromArtifact('TokenStaking'),
      contract.fromArtifact('KeepRandomBeaconService'),
      contract.fromArtifact('KeepRandomBeaconServiceImplV1'),
      contract.fromArtifact('KeepRandomBeaconOperatorStub')
    )

    token = contracts.token
    stakingContract = contracts.stakingContract
    operatorContract = contracts.operatorContract
    operatorContract.setGroupSize(5, {from: owner})
    operatorContract.setGroupThreshold(3, {from: owner})

    let minimumStake = await stakingContract.minimumStake()
    await stakeDelegate(stakingContract, token, owner, operator1, owner, authorizer, minimumStake, {from: owner})
    await stakeDelegate(stakingContract, token, owner, operator2, owner, authorizer, minimumStake, {from: owner})
    await stakeDelegate(stakingContract, token, owner, operator3, owner, authorizer, minimumStake, {from: owner})
    await stakeDelegate(stakingContract, token, owner, operator4, owner, authorizer, minimumStake, {from: owner})
    await stakeDelegate(stakingContract, token, owner, operator5, owner, authorizer, minimumStake, {from: owner})

    await stakingContract.authorizeOperatorContract(operator1, operatorContract.address, {from: authorizer})
    await stakingContract.authorizeOperatorContract(operator2, operatorContract.address, {from: authorizer})
    await stakingContract.authorizeOperatorContract(operator3, operatorContract.address, {from: authorizer})
    await stakingContract.authorizeOperatorContract(operator4, operatorContract.address, {from: authorizer})
    await stakingContract.authorizeOperatorContract(operator5, operatorContract.address, {from: authorizer})

    increaseTime((await stakingContract.initializationPeriod()).toNumber() + 1);

    let tickets1 = generateTickets(await operatorContract.getGroupSelectionRelayEntry(), operator1, 1, {from: owner})
    let tickets2 = generateTickets(await operatorContract.getGroupSelectionRelayEntry(), operator2, 1, {from: owner})
    let tickets3 = generateTickets(await operatorContract.getGroupSelectionRelayEntry(), operator3, 1, {from: owner})
    let tickets4 = generateTickets(await operatorContract.getGroupSelectionRelayEntry(), operator4, 1, {from: owner})
    let tickets5 = generateTickets(await operatorContract.getGroupSelectionRelayEntry(), operator5, 1, {from: owner})

    await operatorContract.submitTicket(
      packTicket(tickets1[0].valueHex, tickets1[0].virtualStakerIndex, operator1),
      {from: operator1}
    )

    await operatorContract.submitTicket(
      packTicket(tickets2[0].valueHex, tickets2[0].virtualStakerIndex, operator2),
      {from: operator2}
    )

    await operatorContract.submitTicket(
      packTicket(tickets3[0].valueHex, tickets3[0].virtualStakerIndex, operator3),
      {from: operator3}
    )

    await operatorContract.submitTicket(
      packTicket(tickets4[0].valueHex, tickets4[0].virtualStakerIndex, operator4),
      {from: operator4}
    )

    await operatorContract.submitTicket(
      packTicket(tickets5[0].valueHex, tickets5[0].virtualStakerIndex, operator5),
      {from: operator5}
    )

    let ticketSubmissionStartBlock = (await operatorContract.getTicketSubmissionStartBlock()).toNumber()
    let timeoutChallenge = (await operatorContract.ticketSubmissionTimeout()).toNumber()
    let timeDKG = (await operatorContract.timeDKG()).toNumber()
    let resultPublicationTime = ticketSubmissionStartBlock + timeoutChallenge + timeDKG

    let currentBlock = await web3.eth.getBlockNumber()
    mineBlocks(resultPublicationTime - currentBlock)

    selectedParticipants = await operatorContract.selectedParticipants()

    signingMemberIndices = []
    signatures = undefined

    for(let i = 0; i < selectedParticipants.length; i++) {
      let signature = await sign(resultHash, selectedParticipants[i])
      signingMemberIndices.push(i+1)
      if (signatures == undefined) signatures = signature
      else signatures += signature.slice(2, signature.length)
    }
  })

  beforeEach(async () => {
    await createSnapshot()
  })

  afterEach(async () => {
    await restoreSnapshot()
  })

  it("should be able to save group members based on misbehaved data", async () => {
    await operatorContract.submitDkgResult(1, groupPubKey, misbehaved, signatures, signingMemberIndices, {from: operator1})
    let registeredMembers = await operatorContract.getGroupMembers(groupPubKey)
    assert.isTrue(registeredMembers.indexOf(operator1) != -1, "Member should be registered")
    assert.isTrue(registeredMembers.indexOf(operator2) != -1, "Member should be registered")
    assert.isTrue(registeredMembers.indexOf(operator3) == -1, "Member should not be registered")
    assert.isTrue(registeredMembers.indexOf(operator4) != -1, "Member should be registered")
    assert.isTrue(registeredMembers.indexOf(operator5) == -1, "Member should not be registered")
  })
})
