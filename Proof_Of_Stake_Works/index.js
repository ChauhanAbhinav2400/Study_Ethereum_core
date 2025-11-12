// we run loop  which publish block every 12 second
//for that we have function choose validator
const crypto = require("crypto");

let validators = [];
let genesisRandaoMix = "0x0000"; // Example randaoMix value
let randaoMix = genesisRandaoMix; // Initialize randaoMix with genesis value
let targetRandoaMix = [genesisRandaoMix, genesisRandaoMix];
let currentEpoch = 1;
let MAX_SLOTS = 8;
let MAX_EPOCH = 5;
console.log(targetRandoaMix, "Initial targetRandoaMix");

function hash(randao, slotNumber) {
  let hash = crypto
    .createHash("sha256")
    .update(randao + slotNumber)
    .digest("hex");
  console.log("Hash result:", hash);
  return hash;
}
function XOR(randao, secret) {
  console.log("XOR inputs:", randao, secret);
  if (!randao.startsWith("0x")) randao = "0x" + randao;
  if (!secret.startsWith("0x")) secret = "0x" + secret;
  randao = BigInt(randao);
  secret = BigInt(secret);
  let result = "";
  result = "0x" + (randao ^ secret).toString(16);
  console.log("XOR result:", result);
  return result;
}

function signEpoch(epochNumber, validator) {
  return hash(validator.secret, epochNumber.toString());
}

function addValidator(id, privateKey, stake) {
  validators.push({
    id: id,
    secret: privateKey,
    stake: stake,
  });
  console.log(`Added validator ${id} with stake ${stake}`);
}

function proposeBlock(epochNumber, slotNumber, validatorId) {
  let proposer = validators.find((v) => v.id === validatorId);
  console.log(
    `Validator ${proposer.id} is proposing block for epoch ${epochNumber}, slot ${slotNumber}`
  );
  let validator_secret = signEpoch(epochNumber, proposer);

  let updated_randao;

  updated_randao = XOR(randaoMix, validator_secret);
  randaoMix = updated_randao;
  console.log(`Updated randaoMix: ${randaoMix}`);
  return updated_randao;
}

function chooseValidator(epochNumber, slotNumber) {
  console.log(
    `For Epoch ${epochNumber} to select slot validator randao uses of Epoch ${targetRandoaMix[epochNumber]}`
  );
  let randao;
  if (epochNumber === 1 || epochNumber === 2) {
    randao = targetRandoaMix[epochNumber];
  } else {
    console.log(
      "Using randao from two epochs ago:",
      targetRandoaMix[epochNumber - 2]
    );
    randao = targetRandoaMix[epochNumber - 2];
  }
  const seed = hash(randaoMix, slotNumber.toString());
  console.log("Seed for validator selection:", seed);
  let result = BigInt("0x" + seed) % BigInt(validators.length);
  console.log("Chosen validator index:", result.toString());
  return validators[Number(result)];
}

for (let i = 1; i < 10; i++) {
  addValidator(i, `private_key_${i}`, 32);
}

while (currentEpoch <= MAX_EPOCH) {
  console.log(`\n--- Epoch ${currentEpoch} ---`);
  for (let epoch = 1; epoch <= MAX_EPOCH; epoch++) {
    for (let slot = 1; slot <= MAX_SLOTS; slot++) {
      console.log(`\n-- Slot ${slot} -- Of Epoch ${currentEpoch}`);
      let chossenValidator = chooseValidator(currentEpoch, slot);
      proposeBlock(currentEpoch, slot, chossenValidator.id);
    }
    if (currentEpoch >= 1) {
      targetRandoaMix[currentEpoch] = randaoMix;
      console.log(targetRandoaMix, "targetRandoaMix updated");
    }
    currentEpoch += 1;
  }
}
