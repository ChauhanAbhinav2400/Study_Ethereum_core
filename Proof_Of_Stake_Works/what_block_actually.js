// // ┌─────────────────────────────────────────┐
// // │           ETHEREUM BLOCK                │
// // ├─────────────────────────────────────────┤
// // │  1. HEADER (Metadata)                   │
// // │     - Slot number                       │
// // │     - Proposer info                     │
// // │     - Parent block hash                 │
// // │     - State root                        │
// // │                                         │
// // │  2. BODY (The actual content)           │
// // │     - Transactions                      │
// // │     - Attestations (votes)              │
// // │     - Deposits (new validators)         │
// // │     - Exits (validators leaving)        │
// // │     - RANDAO reveal                     │
// // │                                         │
// // │  3. SIGNATURE                           │
// // │     - Proposer's signature              │
// // └─────────────────────────────────────────┘

// {
//     // ============ HEADER ============
//     slot: 100,
//     proposer_index: 42,
//     parent_root: "0xabc123def456789...",
//     state_root: "0x789def456abc123...",
//     body_root: "0xdef789abc456123...",

//     // ============ BODY ============
//     body: {
//         // User transactions
//         execution_payload: {
//             transactions: [
//                 // Transaction 1: Alice → Bob (1 ETH)
//                 "0x02f876821234567890abcdef...",

//                 // Transaction 2: Carol calls smart contract
//                 "0x02f877829876543210fedcba...",

//                 // ... ~148 more transactions
//             ],
//             timestamp: 1699999999,
//             gas_limit: 30000000,
//             gas_used: 21000000,
//             fee_recipient: "0xValidator42Address...",
//             block_hash: "0xexecution_block_hash..."
//         },

//         // Votes from previous slot
//         attestations: [
//             {
//                 aggregation_bits: "0b111101011110...",  // 100 validators voted
//                 data: {
//                     slot: 99,
//                     index: 0,
//                     beacon_block_root: "0xblock99hash...",
//                     source: { epoch: 3, root: "0x..." },
//                     target: { epoch: 3, root: "0x..." }
//                 },
//                 signature: "0xAggregatedBLSSignature..."
//             },
//             // ... more aggregated attestations
//         ],

//         // Validator #42's RANDAO contribution
//         randao_reveal: "0x9a8b7c6d5e4f3a2b1c0d...",

//         // New validators joining
//         deposits: [
//             {
//                 pubkey: "0x8e3c9d2b1a0f7e6d5c4b3a...",
//                 withdrawal_credentials: "0x010000000000000000000000...",
//                 amount: 32000000000,  // 32 ETH
//                 signature: "0xdeposit_signature..."
//             }
//         ],

//         // Validators leaving
//         voluntary_exits: [
//             {
//                 epoch: 100,
//                 validator_index: 777,
//                 signature: "0xexit_signature..."
//             }
//         ],

//         // Caught cheaters
//         proposer_slashings: [],  // None this block
//         attester_slashings: [
//             {
//                 attestation_1: {
//                     data: { slot: 98, ... },
//                     signature: "0x..."
//                 },
//                 attestation_2: {
//                     data: { slot: 98, ... },  // Same slot, different block!
//                     signature: "0x..."
//                 }
//             }
//         ],

//         // Sync committee (for light clients)
//         sync_aggregate: {
//             sync_committee_bits: "0b111111...",
//             sync_committee_signature: "0x..."
//         },

//         // Execution layer changes
//         execution_payload_header: {
//             parent_hash: "0x...",
//             fee_recipient: "0x...",
//             state_root: "0x...",
//             receipts_root: "0x...",
//             logs_bloom: "0x...",
//             block_number: 18000000,
//             gas_limit: 30000000,
//             gas_used: 21000000,
//             timestamp: 1699999999,
//             base_fee_per_gas: 15000000000,
//             transactions_root: "0x..."
//         }
//     },

//     // ============ SIGNATURE ============
//     signature: "0xBLSSignatureByValidator42..."
// }

// // ## 📖 CHAPTER 7: Block Size and Limits

// // ### Why Blocks Have Limits
// ```
// // Problem: What if validator includes 10,000 transactions?
// // ├─ Block becomes huge (100 MB+)
// // ├─ Takes forever to download
// // ├─ Takes forever to process
// // ├─ Small validators can't keep up
// // └─ ❌ Centralization!

// // Solution: Limits!
// // ├─ Max transactions: ~150
// // ├─ Max gas: 30,000,000
// // ├─ Max block size: ~128 KB
// // └─ ✅ Everyone can participate

// ========================================
// BLOCK BUILDER - How validator creates a block
// ========================================

class BlockBuilder {
  constructor(validatorIndex, privateKey) {
    this.validatorIndex = validatorIndex;
    this.privateKey = privateKey;
    this.mempool = []; // Pending transactions
    this.attestationPool = []; // Pending votes
  }

  // Main function: Build a complete block
  async buildBlock(slot, parentBlock, currentState) {
    console.log(`\n=== Building block for slot ${slot} ===`);

    // Step 1: Create block header
    const header = this.createHeader(slot, parentBlock, currentState);

    // Step 2: Create block body
    const body = await this.createBody(slot);

    // Step 3: Calculate body root (hash of body)
    header.body_root = this.calculateBodyRoot(body);

    // Step 4: Sign the block
    const signature = this.signBlock(header, body);

    // Step 5: Assemble complete block
    const block = {
      slot: header.slot,
      proposer_index: header.proposer_index,
      parent_root: header.parent_root,
      state_root: header.state_root,
      body_root: header.body_root,
      body: body,
      signature: signature,
    };

    console.log("✓ Block built successfully");
    return block;
  }

  // ========================================
  // STEP 1: Create Block Header
  // ========================================

  createHeader(slot, parentBlock, currentState) {
    console.log("Creating header...");

    // Calculate parent hash
    const parentRoot = this.calculateBlockHash(parentBlock);

    // Calculate state root (after applying this block)
    const stateRoot = this.calculateStateRoot(currentState);

    const header = {
      slot: slot,
      proposer_index: this.validatorIndex,
      parent_root: parentRoot,
      state_root: stateRoot,
      body_root: null, // Will calculate after body is created
    };

    console.log(`  Slot: ${slot}`);
    console.log(`  Proposer: ${this.validatorIndex}`);
    console.log(`  Parent: ${parentRoot.substring(0, 10)}...`);

    return header;
  }

  // ========================================
  // STEP 2: Create Block Body
  // ========================================

  async createBody(slot) {
    console.log("Creating body...");

    const body = {
      // 1. Include user transactions (execution payload)
      execution_payload: this.selectTransactions(),

      // 2. Include attestations from previous slots
      attestations: this.selectAttestations(),

      // 3. Add RANDAO reveal
      randao_reveal: this.createRandaoReveal(slot),

      // 4. Include deposits (new validators)
      deposits: this.selectDeposits(),

      // 5. Include voluntary exits
      voluntary_exits: this.selectExits(),

      // 6. Include slashings (caught cheaters)
      proposer_slashings: this.selectProposerSlashings(),
      attester_slashings: this.selectAttesterSlashings(),

      // 7. Sync aggregate (for light clients)
      sync_aggregate: this.createSyncAggregate(),
    };

    console.log(
      `  Transactions: ${body.execution_payload.transactions.length}`
    );
    console.log(`  Attestations: ${body.attestations.length}`);
    console.log(`  Deposits: ${body.deposits.length}`);

    return body;
  }

  // ========================================
  // SELECT TRANSACTIONS
  // ========================================

  selectTransactions() {
    console.log("  Selecting transactions...");

    // Sort by gas price (highest first)
    const sorted = this.mempool.sort((a, b) => {
      return b.gasPrice - a.gasPrice;
    });

    // Select transactions that fit in block
    const selected = [];
    let gasUsed = 0;
    const GAS_LIMIT = 30_000_000;

    for (let tx of sorted) {
      if (gasUsed + tx.gas <= GAS_LIMIT) {
        // Validate transaction
        if (this.validateTransaction(tx)) {
          selected.push(tx);
          gasUsed += tx.gas;
        }
      }

      // Stop if block is full
      if (gasUsed >= GAS_LIMIT * 0.95) break; // 95% full
    }

    console.log(`    Selected ${selected.length} transactions`);
    console.log(`    Total gas: ${gasUsed.toLocaleString()}`);

    return {
      transactions: selected.map((tx) => this.serializeTransaction(tx)),
      timestamp: Math.floor(Date.now() / 1000),
      gas_limit: GAS_LIMIT,
      gas_used: gasUsed,
      fee_recipient: this.getValidatorAddress(),
      // ... other execution payload fields
    };
  }

  validateTransaction(tx) {
    // Check 1: Valid signature
    if (!this.verifyTransactionSignature(tx)) {
      return false;
    }

    // Check 2: Sender has enough balance
    if (tx.value + tx.gas * tx.gasPrice > this.getBalance(tx.from)) {
      return false;
    }

    // Check 3: Correct nonce
    if (tx.nonce !== this.getNonce(tx.from)) {
      return false;
    }

    return true;
  }

  serializeTransaction(tx) {
    // Convert transaction to bytes (RLP encoding)
    // In real Ethereum: Uses RLP (Recursive Length Prefix)
    return JSON.stringify(tx); // Simplified
  }

  // ========================================
  // SELECT ATTESTATIONS
  // ========================================

  selectAttestations() {
    console.log("  Selecting attestations...");

    const MAX_ATTESTATIONS = 128;

    // Filter: Only include recent attestations
    const recent = this.attestationPool.filter((att) => {
      const age = this.currentSlot - att.data.slot;
      return age >= 0 && age <= 32; // Within 1 epoch
    });

    // Sort by number of validators (most votes first)
    const sorted = recent.sort((a, b) => {
      return (
        this.countBits(b.aggregation_bits) - this.countBits(a.aggregation_bits)
      );
    });

    // Take top attestations
    const selected = sorted.slice(0, MAX_ATTESTATIONS);

    console.log(`    Selected ${selected.length} attestations`);

    return selected;
  }

  countBits(bitfield) {
    // Count how many validators voted
    return bitfield.split("").filter((bit) => bit === "1").length;
  }

  // ========================================
  // CREATE RANDAO REVEAL
  // ========================================

  createRandaoReveal(slot) {
    console.log("  Creating RANDAO reveal...");

    // Calculate current epoch
    const epoch = Math.floor(slot / 32);

    // Sign the epoch number
    const message = `epoch_${epoch}`;
    const signature = this.sign(message, this.privateKey);
    console.log(`    Epoch: ${epoch}`);
    console.log(`    Signature: ${signature.substring(0, 10)}...`);

    return signature;
  }

  // ========================================
  // SELECT DEPOSITS
  // ========================================

  selectDeposits() {
    console.log("  Selecting deposits...");

    const MAX_DEPOSITS = 16;

    // Get pending deposits from deposit contract
    const pendingDeposits = this.getPendingDeposits();

    // Validate each deposit
    const validDeposits = pendingDeposits.filter((deposit) => {
      // Check 1: Correct amount (32 ETH)
      if (deposit.amount !== 32_000_000_000) return false; // 32 ETH in gwei

      // Check 2: Valid BLS public key
      if (!this.isValidBLSKey(deposit.pubkey)) return false;

      // Check 3: Valid signature
      if (!this.verifyDepositSignature(deposit)) return false;

      return true;
    });

    // Take first MAX_DEPOSITS
    const selected = validDeposits.slice(0, MAX_DEPOSITS);

    console.log(`    Selected ${selected.length} deposits`);

    return selected;
  }

  getPendingDeposits() {
    // In real Ethereum: Read from execution layer deposit contract
    // Returns deposits that haven't been processed yet
    return this.depositQueue || [];
  }

  // ========================================
  // SELECT VOLUNTARY EXITS
  // ========================================

  selectExits() {
    console.log("  Selecting voluntary exits...");

    const MAX_EXITS = 16;

    // Get pending exit requests
    const pendingExits = this.exitPool || [];

    // Validate each exit
    const validExits = pendingExits.filter((exit) => {
      // Check 1: Validator exists
      if (!this.validatorExists(exit.validator_index)) return false;

      // Check 2: Validator is active
      if (!this.isValidatorActive(exit.validator_index)) return false;

      // Check 3: Valid signature from that validator
      if (!this.verifyExitSignature(exit)) return false;

      // Check 4: Validator has been active long enough
      if (!this.hasMinimumActiveTime(exit.validator_index)) return false;

      return true;
    });

    // Take first MAX_EXITS
    const selected = validExits.slice(0, MAX_EXITS);

    console.log(`    Selected ${selected.length} exits`);

    return selected;
  }

  // ========================================
  // SELECT SLASHINGS
  // ========================================

  selectProposerSlashings() {
    console.log("  Selecting proposer slashings...");

    const MAX_SLASHINGS = 16;

    // Get reported slashings
    const reported = this.proposerSlashingPool || [];

    // Validate each slashing
    const valid = reported.filter((slashing) => {
      // Must have two conflicting block proposals
      const header1 = slashing.signed_header_1;
      const header2 = slashing.signed_header_2;

      // Check 1: Same slot, different blocks
      if (header1.message.slot !== header2.message.slot) return false;
      if (header1.message.body_root === header2.message.body_root) return false;

      // Check 2: Same proposer
      if (header1.message.proposer_index !== header2.message.proposer_index)
        return false;

      // Check 3: Valid signatures
      if (!this.verifyBlockSignature(header1)) return false;
      if (!this.verifyBlockSignature(header2)) return false;

      // Check 4: Validator not already slashed
      if (this.isAlreadySlashed(header1.message.proposer_index)) return false;

      return true;
    });

    const selected = valid.slice(0, MAX_SLASHINGS);

    console.log(`    Selected ${selected.length} proposer slashings`);

    return selected;
  }

  selectAttesterSlashings() {
    console.log("  Selecting attester slashings...");

    const MAX_SLASHINGS = 2;

    // Get reported slashings
    const reported = this.attesterSlashingPool || [];

    // Validate each slashing
    const valid = reported.filter((slashing) => {
      const att1 = slashing.attestation_1;
      const att2 = slashing.attestation_2;

      // Must be one of two violations:
      // 1. Double vote: Same target epoch, different blocks
      // 2. Surround vote: att1 surrounds att2 or vice versa

      const isDoubleVote =
        att1.data.target.epoch === att2.data.target.epoch &&
        att1.data.beacon_block_root !== att2.data.beacon_block_root;

      const isSurroundVote =
        (att1.data.source.epoch < att2.data.source.epoch &&
          att1.data.target.epoch > att2.data.target.epoch) ||
        (att2.data.source.epoch < att1.data.source.epoch &&
          att2.data.target.epoch > att1.data.target.epoch);

      if (!isDoubleVote && !isSurroundVote) return false;

      // Check signatures
      if (!this.verifyAttestationSignature(att1)) return false;
      if (!this.verifyAttestationSignature(att2)) return false;

      return true;
    });

    const selected = valid.slice(0, MAX_SLASHINGS);

    console.log(`    Selected ${selected.length} attester slashings`);

    return selected;
  }

  // ========================================
  // CREATE SYNC AGGREGATE
  // ========================================

  createSyncAggregate() {
    // Sync committee helps light clients
    // 512 validators sign each block

    const SYNC_COMMITTEE_SIZE = 512;

    // Get signatures from sync committee members
    const signatures = this.collectSyncCommitteeSignatures();

    // Create bitfield (which validators signed)
    const bits = this.createBitfield(signatures, SYNC_COMMITTEE_SIZE);

    // Aggregate all signatures into one
    const aggregatedSignature = this.aggregateBLSSignatures(
      signatures.map((s) => s.signature)
    );

    return {
      sync_committee_bits: bits,
      sync_committee_signature: aggregatedSignature,
    };
  }

  // ========================================
  // STEP 3: Calculate Roots (Hashes)
  // ========================================

  calculateBodyRoot(body) {
    // In real Ethereum: Uses Merkle tree (SSZ hash_tree_root)
    // For simplicity: Hash the JSON

    const bodyString = JSON.stringify(body);
    const hash = this.hash(bodyString);

    return hash;
  }

  calculateStateRoot(state) {
    // State root is complex - represents entire Ethereum state
    // In real Ethereum: Merkle Patricia Trie

    // Simplified: Hash all account balances and data
    const stateString = JSON.stringify({
      validators: state.validators,
      balances: state.balances,
      // ... all state fields
    });

    const hash = this.hash(stateString);

    return hash;
  }

  calculateBlockHash(block) {
    // Hash of entire block
    const blockString = JSON.stringify({
      slot: block.slot,
      proposer: block.proposer_index,
      parent: block.parent_root,
      state: block.state_root,
      body: block.body_root,
    });

    return this.hash(blockString);
  }

  // ========================================
  // STEP 4: Sign the Block
  // ========================================

  signBlock(header, body) {
    console.log("Signing block...");

    // Create signing root (what we actually sign)
    const signingRoot = this.calculateSigningRoot(header, body);

    // Sign with validator's private key
    const signature = this.sign(signingRoot, this.privateKey);

    console.log(`  Signature: ${signature.substring(0, 10)}...`);

    return signature;
  }

  calculateSigningRoot(header, body) {
    // Combine header and body for signing
    const combined = {
      ...header,
      body_summary: this.calculateBodyRoot(body),
    };

    return this.hash(JSON.stringify(combined));
  }

  // ========================================
  // CRYPTOGRAPHIC UTILITIES
  // ========================================

  hash(data) {
    // In real Ethereum: SHA-256 or Keccak-256
    const crypto = require("crypto");
    return "0x" + crypto.createHash("sha256").update(data).digest("hex");
  }

  sign(message, privateKey) {
    // In real Ethereum: BLS signature
    // BLS allows signature aggregation (multiple signatures → one signature)

    // Simplified: Hash-based signature
    const crypto = require("crypto");
    const signature = crypto
      .createHash("sha256")
      .update(message + privateKey)
      .digest("hex");

    return "0x" + signature;
  }

  verifySignature(message, signature, publicKey) {
    // In real Ethereum: BLS signature verification
    // Verify using public key

    // Simplified: Check signature format
    return signature && signature.startsWith("0x") && signature.length === 66;
  }

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  getValidatorAddress() {
    return `0xValidator${this.validatorIndex}Address`;
  }

  getBalance(address) {
    // Get account balance from state
    return this.state?.balances?.[address] || 0;
  }

  getNonce(address) {
    // Get transaction count for account
    return this.state?.nonces?.[address] || 0;
  }

  validatorExists(index) {
    return this.state?.validators?.[index] !== undefined;
  }

  isValidatorActive(index) {
    const validator = this.state?.validators?.[index];
    return validator && validator.activation_epoch <= this.currentEpoch;
  }

  hasMinimumActiveTime(index) {
    const validator = this.state?.validators?.[index];
    const MIN_EPOCHS = 256; // ~27 hours
    return this.currentEpoch - validator.activation_epoch >= MIN_EPOCHS;
  }

  isAlreadySlashed(index) {
    const validator = this.state?.validators?.[index];
    return validator && validator.slashed === true;
  }

  isValidBLSKey(pubkey) {
    // BLS public key should be 48 bytes (96 hex chars)
    return pubkey && pubkey.length === 98; // 0x + 96 chars
  }

  verifyTransactionSignature(tx) {
    // Verify ECDSA signature on transaction
    return true; // Simplified
  }

  verifyDepositSignature(deposit) {
    // Verify BLS signature on deposit
    return true; // Simplified
  }

  verifyExitSignature(exit) {
    // Verify BLS signature on exit
    return true; // Simplified
  }

  verifyBlockSignature(signedHeader) {
    // Verify BLS signature on block header
    return true; // Simplified
  }

  verifyAttestationSignature(attestation) {
    // Verify BLS signature on attestation
    return true; // Simplified
  }

  collectSyncCommitteeSignatures() {
    // Collect signatures from sync committee
    return []; // Simplified
  }

  createBitfield(signatures, size) {
    // Create bitfield showing which validators participated
    const bits = new Array(size).fill("0");
    signatures.forEach((sig) => {
      bits[sig.index] = "1";
    });
    return "0b" + bits.join("");
  }

  aggregateBLSSignatures(signatures) {
    // Aggregate multiple BLS signatures into one
    // This is BLS signature magic - multiple sigs combine into one!
    return "0xAggregatedSignature"; // Simplified
  }
}

async function demoBlockCreation() {
  console.log("=== ETHEREUM BLOCK CREATION DEMO ===\n");
  // Setup: Create a validator
  const validator = new BlockBuilder(
    42, // Validator index
    "validator_42_private_key"
  );

  // Add some transactions to mempool
  validator.mempool = [
    {
      from: "0xAlice",
      to: "0xBob",
      value: 1_000_000_000_000_000_000, // 1 ETH
      gas: 21_000,
      gasPrice: 50_000_000_000, // 50 gwei
      nonce: 5,
      signature: "0xAliceSignature",
    },
    {
      from: "0xCarol",
      to: "0xContractX",
      value: 0,
      data: "0xcontractCall",
      gas: 200_000,
      gasPrice: 100_000_000_000, // 100 gwei (higher!)
      nonce: 12,
      signature: "0xCarolSignature",
    },
    {
      from: "0xDave",
      to: "0xEve",
      value: 500_000_000_000_000_000, // 0.5 ETH
      gas: 21_000,
      gasPrice: 30_000_000_000, // 30 gwei
      nonce: 3,
      signature: "0xDaveSignature",
    },
  ];

  // Add some attestations
  validator.attestationPool = [
    {
      aggregation_bits: "0b111101011110",
      data: {
        slot: 99,
        index: 0,
        beacon_block_root: "0xblock99hash",
        source: { epoch: 3, root: "0xsource" },
        target: { epoch: 3, root: "0xtarget" },
      },
      signature: "0xAggregatedSig1",
    },
  ];

  // Add a deposit
  validator.depositQueue = [
    {
      pubkey: "0x8e3c9d2b1a0f7e6d5c4b3a2918f6e5d4c3b2a19087f6e5d4c3b2a1",
      withdrawal_credentials:
        "0x010000000000000000000000NewValidatorWithdrawal",
      amount: 32_000_000_000, // 32 ETH
      signature: "0xDepositSignature",
    },
  ];

  // Previous block (parent)
  const parentBlock = {
    slot: 99,
    proposer_index: 1847,
    parent_root: "0xblock98hash",
    state_root: "0xstate99",
    body_root: "0xbody99",
  };

  // Current state
  const currentState = {
    slot: 100,
    validators: {
      42: { activation_epoch: 0, slashed: false },
      777: { activation_epoch: 50, slashed: false },
    },
    balances: {
      "0xAlice": 10_000_000_000_000_000_000, // 10 ETH
      "0xCarol": 5_000_000_000_000_000_000, // 5 ETH
      "0xDave": 2_000_000_000_000_000_000, // 2 ETH
    },
    nonces: {
      "0xAlice": 5,
      "0xCarol": 12,
      "0xDave": 3,
    },
  };

  // Set current slot/epoch
  validator.currentSlot = 100;
  validator.currentEpoch = Math.floor(100 / 32);
  validator.state = currentState;

  // BUILD THE BLOCK!
  const block = await validator.buildBlock(100, parentBlock, currentState);

  // Display the complete block
  console.log("\n=== COMPLETE BLOCK ===");
  console.log(JSON.stringify(block, null, 2));

  // Calculate block size
  const blockSize = JSON.stringify(block).length;
  console.log(`\n=== BLOCK STATS ===`);
  console.log(`Size: ${blockSize.toLocaleString()} bytes`);
  console.log(
    `Transactions: ${block.body.execution_payload.transactions.length}`
  );
  console.log(`Attestations: ${block.body.attestations.length}`);
  console.log(`Deposits: ${block.body.deposits.length}`);
  console.log(`Exits: ${block.body.voluntary_exits.length}`);

  // Now broadcast it!
  console.log(`\n=== BROADCASTING ===`);
  console.log("Block would now be broadcast to P2P network...");
  console.log("Other validators would receive and validate it...");
  console.log("If 66%+ vote YES, block is finalized!");

  return block;
}
