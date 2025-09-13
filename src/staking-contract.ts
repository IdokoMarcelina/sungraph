import {
  EmergencyWithdrawn as EmergencyWithdrawnEvent,
  RewardsClaimed as RewardsClaimedEvent,
  Staked as StakedEvent,
  Withdrawn as WithdrawnEvent
} from "../generated/StakingContract/StakingContract"
import {
  EmergencyWithdrawn,
  Protocol,
  RewardsClaimed,
  Staked,
  StakePosition,
  User,
  Withdrawn
} from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

// Helper function to load or create a User entity
function getOrCreateUser(address: string): User {
  let user = User.load(address);
  if (!user) {
    user = new User(address);
    user.stakedAmount = BigInt.fromI32(0);
    user.pendingRewards = BigInt.fromI32(0);
    user.lastStakeTimestamp = BigInt.fromI32(0);
    user.save();
  }
  return user;
}

// Helper function to load or create a Protocol entity
function getOrCreateProtocol(): Protocol {
  let protocol = Protocol.load("1");
  if (!protocol) {
    protocol = new Protocol("1");
    protocol.totalStaked = BigInt.fromI32(0);
    protocol.currentRewardRate = BigInt.fromI32(0);
    protocol.totalRewardsDistributed = BigInt.fromI32(0);
    protocol.minLockDuration = BigInt.fromI32(86400);
    protocol.save();
  }
  return protocol;
}



export function handleStaked(event: StakedEvent): void {
  // Get or create user
  let user = getOrCreateUser(event.params.user.toHex())
  user.stakedAmount = user.stakedAmount.plus(event.params.amount)
  user.lastStakeTimestamp = event.params.timestamp
  user.save()

  // Update protocol
  let protocol = getOrCreateProtocol()
  protocol.totalStaked = event.params.newTotalStaked
  protocol.currentRewardRate = event.params.currentRewardRate
  protocol.save()

  // Create stake position
  let stakePosition = new StakePosition(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  stakePosition.user = user.id
  stakePosition.amount = event.params.amount
  stakePosition.timestamp = event.params.timestamp
  stakePosition.unlockTime = event.params.timestamp.plus(protocol.minLockDuration)
  stakePosition.totalStaked = event.params.newTotalStaked
  stakePosition.currentRewardRate = event.params.currentRewardRate
  stakePosition.transactionHash = event.transaction.hash
  stakePosition.status = "Active"
  stakePosition.blockNumber = event.block.number
  stakePosition.blockTimestamp = event.block.timestamp
  stakePosition.save()

  // Create staked event entity
  let entity = new Staked(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.amount = event.params.amount
  entity.timestamp = event.params.timestamp
  entity.newTotalStaked = event.params.newTotalStaked
  entity.currentRewardRate = event.params.currentRewardRate

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWithdrawn(event: WithdrawnEvent): void {
  // Get or create user
  let user = getOrCreateUser(event.params.user.toHex())
  user.stakedAmount = user.stakedAmount.minus(event.params.amount)
  user.save()

  // Update protocol
  let protocol = getOrCreateProtocol()
  protocol.totalStaked = event.params.newTotalStaked
  protocol.currentRewardRate = event.params.currentRewardRate
  protocol.totalRewardsDistributed = protocol.totalRewardsDistributed.plus(event.params.rewardsAccrued)
  protocol.save()

  // Create withdrawn event entity
  let entity = new Withdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = user.id
  entity.amount = event.params.amount
  entity.timestamp = event.params.timestamp
  entity.newTotalStaked = event.params.newTotalStaked
  entity.currentRewardRate = event.params.currentRewardRate
  entity.rewardsAccrued = event.params.rewardsAccrued

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleEmergencyWithdrawn(event: EmergencyWithdrawnEvent): void {
  // Get or create user
  let user = getOrCreateUser(event.params.user.toHex())
  user.stakedAmount = user.stakedAmount.minus(event.params.amount.plus(event.params.penalty))
  user.save()

  // Update protocol
  let protocol = getOrCreateProtocol()
  protocol.totalStaked = event.params.newTotalStaked
  protocol.save()

  // Create emergency withdrawn event entity
  let entity = new EmergencyWithdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = user.id
  entity.amount = event.params.amount
  entity.penalty = event.params.penalty
  entity.timestamp = event.params.timestamp
  entity.newTotalStaked = event.params.newTotalStaked

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRewardsClaimed(event: RewardsClaimedEvent): void {
  // Get or create user
  let user = getOrCreateUser(event.params.user.toHex())
  user.pendingRewards = event.params.newPendingRewards
  user.save()

  // Update protocol
  let protocol = getOrCreateProtocol()
  protocol.totalRewardsDistributed = protocol.totalRewardsDistributed.plus(event.params.amount)
  protocol.save()

  // Create rewards claimed event entity
  let entity = new RewardsClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = user.id
  entity.amount = event.params.amount
  entity.timestamp = event.params.timestamp
  entity.newPendingRewards = event.params.newPendingRewards
  entity.totalStaked = event.params.totalStaked

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}