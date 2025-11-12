// slot: 100
// ```

// **Why it exists**:
// - Tells us WHICH block they're voting on
// - Block 100 is in Slot 100

// **Why we need it**:
// ```
// Without slot:
// ├─ "I vote YES" → But for which block?
// └─ ❌ Ambiguous

// With slot:
// ├─ "I vote YES for Slot 100"
// └─ ✅ Clear what they're voting on

// beacon_block_root: "0xabc123def456..."
// ```

// **Why it exists**:
// - The HASH of the block they're voting on
// - Cryptographically identifies the exact block

// **Why we need it**:
// ```
// Scenario: Two validators propose for Slot 100 (fork!)

// Validator A proposes Block 100a (hash: 0xaaa111)
// Validator B proposes Block 100b (hash: 0xbbb222)

// Validators vote:
// ├─ Vote for 0xaaa111 → Supporting Block 100a
// ├─ Vote for 0xbbb222 → Supporting Block 100b
// └─ Majority wins!

// Without block hash:
// ├─ "I vote for Slot 100" → Which one?
// └─ ❌ Can't distinguish between forks

// With block hash:
// ├─ "I vote for 0xaaa111"
// └─ ✅ Clear which fork they support

// index: 0
// ```

// **Why it exists**:
// - Validators are divided into committees
// - Each committee votes independently
// - This says which committee this vote is from

// **Committee System** (Important!):
// ```
// Problem: 1,000,000 validators all voting

// If everyone votes individually:
// ├─ 1,000,000 separate messages
// ├─ Network explodes! 💥
// └─ ❌ Too much traffic

// Solution: Divide into committees

// Epoch 1, Slot 1:
// ├─ Committee 0: 15,625 validators → Vote on Block 1
// ├─ Committee 1: 15,625 validators → Vote on Block 1
// ├─ Committee 2: 15,625 validators → Vote on Block 1
// ├─ ...
// └─ 64 committees total

// Each committee creates ONE aggregated vote
// ├─ 64 messages instead of 1,000,000!
// └─ ✅ Network can handle it
// ```

// **Why we need it**:
// ```
// Without committee index:
// ├─ Don't know which group voted
// ├─ Can't organize attestations
// └─ ❌ Chaos

// With committee index:
// ├─ "Committee 0 voted"
// ├─ "Committee 1 voted"
// ├─ Can track which committees have voted
// └─ ✅ Organized consensus

// aggregation_bits: "0b111101011110..."
// ```

// **Why it exists**:
// - Shows WHICH validators in the committee voted
// - Each bit = one validator

// **How it works**:
// ```
// Committee 0 has 100 validators (simplified):

// Position:  0  1  2  3  4  5  6  7  8  9
// Validator: V0 V1 V2 V3 V4 V5 V6 V7 V8 V9
// Voted?     1  1  1  1  0  1  0  1  1  1

// Bitfield: "0b1111010111"

// Translation:
// ├─ Validator 0: Voted ✓
// ├─ Validator 1: Voted ✓
// ├─ Validator 2: Voted ✓
// ├─ Validator 3: Voted ✓
// ├─ Validator 4: Didn't vote ✗
// ├─ Validator 5: Voted ✓
// ├─ Validator 6: Didn't vote ✗
// ├─ Validator 7: Voted ✓
// ├─ Validator 8: Voted ✓
// └─ Validator 9: Voted ✓

// Participation: 8/10 = 80%
// ```

// **Why we need it**:
// ```
// Without aggregation bits:
// ├─ Don't know who participated
// ├─ Can't reward active validators
// ├─ Can't punish lazy ones
// └─ ❌ No accountability

// With aggregation bits:
// ├─ Know exactly who voted
// ├─ Reward active validators
// ├─ Penalize non-voters (inactivity leak)
// └─ ✅ Individual accountability

// signature: "0xBLSSignature..."
// ```

// **Why it exists**:
// - Cryptographic proof the validators actually voted
// - Can't forge without private keys

// **Special property - BLS Signatures**:
// ```
// Normal signatures:
// ├─ Alice signs: sig_A
// ├─ Bob signs: sig_B
// ├─ Carol signs: sig_C
// └─ Must send 3 separate signatures

// BLS signatures (Ethereum uses):
// ├─ Alice signs: sig_A
// ├─ Bob signs: sig_B
// ├─ Carol signs: sig_C
// ├─ Can COMBINE: sig_A + sig_B + sig_C = sig_ABC
// └─ Only send 1 aggregated signature!

// Magic of BLS:
// ├─ Verify sig_ABC against pubkey_A + pubkey_B + pubkey_C
// ├─ Proves all three signed
// └─ But only ONE signature in the block!
// ```

// **Why we need it**:
// ```
// Without signature:
// ├─ Anyone could claim validators voted
// ├─ No proof
// └─ ❌ No security

// With BLS signature:
// ├─ Cryptographic proof
// ├─ Aggregated (1 sig for many validators)
// └─ ✅ Secure and efficient
// ```

// ---

// ## 📖 CHAPTER 4: The Voting Timeline (Step by Step)

// Let's trace exactly what happens:

// ### The Complete Flow
// ```
// SLOT 100 BEGINS (12 seconds)
// ═══════════════════════════════════════

// Second 0: Block Proposed
// ├─ Validator #42 proposes Block 100
// ├─ Broadcasts to network
// └─ Block spreading (gossip)...

// Second 1-2: Block Arrives
// ├─ All validators receive Block 100
// ├─ Block has hash: 0xabc123
// └─ Validators start checking...

// Second 2-4: Validators Vote (Attest)
// ├─ Each validator in committees for Slot 100:
// │
// ├─ Committee 0 (15,625 validators):
// │   ├─ Validator #1: Checks block → Valid! → Creates attestation
// │   ├─ Validator #2: Checks block → Valid! → Creates attestation
// │   ├─ Validator #3: Checks block → Valid! → Creates attestation
// │   └─ ... all 15,625 validators attest
// │
// ├─ Committee 1 (15,625 validators):
// │   └─ ... all attest
// │
// └─ ... all 64 committees attest

// Second 4: Attestations Spread
// ├─ Each attestation broadcasts via gossip
// ├─ Network organized by subnets (64 subnets)
// └─ Attestations spreading...

// Second 4-8: Aggregation
// ├─ Special validators called "aggregators" collect attestations
// ├─ For each committee, aggregator combines individual votes:
// │
// │   Committee 0 individual votes:
// │   ├─ Validator #1 attestation
// │   ├─ Validator #2 attestation
// │   ├─ Validator #3 attestation
// │   └─ ... 15,625 attestations
// │
// │   Aggregator combines:
// │   ├─ Bitfield: 0b111111... (who voted)
// │   ├─ Signature: BLS aggregate of all sigs
// │   └─ Result: ONE aggregated attestation!
// │
// └─ 64 aggregated attestations (one per committee)

// Second 8-10: Aggregates Broadcast
// ├─ Aggregators broadcast aggregated attestations
// ├─ These spread via gossip
// └─ All validators receive them

// Second 10-12: Next Block Includes Them
// ├─ Slot 101 begins
// ├─ Validator #1847 proposes Block 101
// ├─ Includes in Block 101: The aggregated attestations for Block 100
// └─ Attestations now permanently recorded!

// RESULT:
// ✓ Block 100 has been voted on
// ✓ Votes are recorded in Block 101
// ✓ If 66%+ voted YES → Block 100 is justified
// ```

// ---

// ## 📖 CHAPTER 5: Committees - How They Work

// ### Why Committees?

// **The Problem**:
// ```
// 1,000,000 validators
// Each creates attestation per slot
// Each attestation = 200 bytes
// Total: 1,000,000 × 200 = 200 MB per slot!
// Every 12 seconds = 200 MB!
// Per day = 1.44 TB!

// ❌ Impossible to handle!
// ```

// **The Solution**:
// ```
// Divide validators into 64 committees
// Each committee: ~15,625 validators
// Each committee creates 1 aggregated attestation

// Total: 64 × 200 bytes = 12.8 KB per slot
// Every 12 seconds = 12.8 KB
// Per day = 92 MB

// ✅ Totally manageable!

// At the start of each epoch:

// function assignCommittees(epoch) {
//     // Get all active validators
//     const validators = getAllActiveValidators();
//     // Example: 1,000,000 validators

//     // Get RANDAO for this epoch (from 2 epochs ago)
//     const seed = getRANDAO(epoch - 2);

//     // Shuffle validators using seed
//     const shuffled = shuffle(validators, seed);

//     // Divide into 32 slots (one epoch)
//     const slotsPerEpoch = 32;
//     const validatorsPerSlot = validators.length / slotsPerEpoch;
//     // 1,000,000 / 32 = 31,250 validators per slot

//     // Divide each slot into 64 committees
//     const committeesPerSlot = 64;
//     const validatorsPerCommittee = validatorsPerSlot / committeesPerSlot;
//     // 31,250 / 64 = ~488 validators per committee

//     // Assign!
//     const assignments = {};
//     let index = 0;

//     for (let slot = 0; slot < 32; slot++) {
//         for (let committee = 0; committee < 64; committee++) {
//             assignments[`slot_${slot}_committee_${committee}`] =
//                 shuffled.slice(index, index + validatorsPerCommittee);
//             index += validatorsPerCommittee;
//         }
//     }

//     return assignments;
// }
// ```

// **Example Assignment**:
// ```
// Epoch 10:

// Slot 320, Committee 0:
// ├─ Validator #42
// ├─ Validator #1847
// ├─ Validator #9234
// └─ ... 485 more validators

// Slot 320, Committee 1:
// ├─ Validator #771
// ├─ Validator #5551
// └─ ... 486 more validators

// ...

// Slot 351, Committee 63:
// └─ ... last 488 validators
// ```

// ### Properties of Committees
// ```
// ✅ Random: RANDAO ensures unpredictable assignment
// ✅ Deterministic: Everyone computes same committees
// ✅ Equal: Each validator gets equal duty
// ✅ Distributed: Each slot has different committees
// ```

// ---

// ## 📖 CHAPTER 6: Aggregation - Combining Votes

// ### The Problem
// ```
// Committee 0 for Slot 100:
// ├─ Has 488 validators
// ├─ Each creates attestation
// ├─ 488 individual messages
// └─ Too many!
// ```

// ### The Solution: Aggregators

// **Aggregators** are special validators chosen to combine attestations.

// ### How Aggregation Works
// ```
// Step 1: Individual Attestations Created
// ════════════════════════════════════════

// Validator #1 in Committee 0:
// {
//     data: { slot: 100, index: 0, beacon_block_root: "0xabc123" },
//     signature: sig_1
// }

// Validator #2 in Committee 0:
// {
//     data: { slot: 100, index: 0, beacon_block_root: "0xabc123" },
//     signature: sig_2
// }

// Validator #3 in Committee 0:
// {
//     data: { slot: 100, index: 0, beacon_block_root: "0xabc123" },
//     signature: sig_3
// }

// ... 485 more

// Step 2: Aggregator Collects
// ════════════════════════════════════════

// Aggregator (one validator from committee):
// ├─ Listens on subnet for Committee 0 attestations
// ├─ Collects all 488 attestations
// └─ Combines them!

// Step 3: Aggregation Process
// ════════════════════════════════════════

// Create aggregation_bits:
// ├─ Validator #1 (position 0): voted → bit 0 = 1
// ├─ Validator #2 (position 1): voted → bit 1 = 1
// ├─ Validator #3 (position 2): voted → bit 2 = 1
// ├─ ...
// └─ Result: "0b111111111..." (488 bits)

// Aggregate signatures (BLS magic):
// ├─ sig_1 + sig_2 + sig_3 + ... + sig_488
// └─ Result: ONE signature (same size as individual!)

// Step 4: Aggregated Attestation
// ════════════════════════════════════════

// {
//     aggregation_bits: "0b11111111...",  // 488 bits
//     data: {
//         slot: 100,
//         index: 0,
//         beacon_block_root: "0xabc123",
//         source: {...},
//         target: {...}
//     },
//     signature: aggregated_sig  // ONE signature for 488 validators!
// }

// Reduction: 488 messages → 1 message (488× improvement!)
