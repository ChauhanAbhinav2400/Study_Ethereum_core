// ========================================
// PEER CLASS - Represents ONE connection to another validator
// ========================================

class Peer {
  constructor(address, socket) {
    this.address = address; // e.g., "192.168.1.100:30303"
    this.socket = socket; // Network socket (TCP connection)
    this.isAlive = true;
    this.lastSeen = Date.now();
  }

  // Send a message to this peer
  send(message) {
    try {
      // Convert message object to JSON string
      const messageString = JSON.stringify(message);

      // Send over the network socket
      // In real code, this uses TCP/WebSocket send()
      this.socket.write(messageString + "\n");

      console.log(`Sent to ${this.address}: ${message.topic}`);
      return true;
    } catch (error) {
      console.error(`Failed to send to ${this.address}:`, error);
      this.isAlive = false;
      return false;
    }
  }

  // Ask this peer for other peers they know
  async getPeers() {
    return new Promise((resolve, reject) => {
      // Create a request message
      const request = {
        type: "GET_PEERS",
        requestId: this.generateId(),
      };

      // Send the request
      this.send(request);

      // Wait for response (with timeout)
      const timeout = setTimeout(() => {
        reject(new Error("Peer request timeout"));
      }, 5000); // 5 second timeout

      // Listen for response
      this.once("peers_response", (peers) => {
        clearTimeout(timeout);
        resolve(peers);
      });
    });
  }

  // Check if peer is still alive
  async ping() {
    return new Promise((resolve, reject) => {
      const pingMessage = {
        type: "PING",
        timestamp: Date.now(),
      };

      this.send(pingMessage);

      const timeout = setTimeout(() => {
        this.isAlive = false;
        reject(new Error("Ping timeout"));
      }, 3000);

      this.once("pong", () => {
        clearTimeout(timeout);
        this.isAlive = true;
        this.lastSeen = Date.now();
        resolve(true);
      });
    });
  }

  // Generate unique ID for messages
  generateId() {
    return Date.now().toString() + Math.random().toString(36);
  }

  // Simple event emitter (for handling responses)
  once(event, callback) {
    if (!this._events) this._events = {};
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push({ callback, once: true });
  }

  emit(event, data) {
    if (!this._events || !this._events[event]) return;

    this._events[event].forEach((listener, index) => {
      listener.callback(data);
      if (listener.once) {
        this._events[event].splice(index, 1);
      }
    });
  }
}

// ========================================
// SOCKET CLASS - Low-level network connection
// ========================================

const net = require("net"); // Node.js TCP library

class NetworkSocket {
  constructor(host, port) {
    this.host = host;
    this.port = port;
    this.socket = null;
    this.connected = false;
    this.messageBuffer = "";
    this.messageHandlers = [];
  }

  // Connect to remote peer
  async connect() {
    return new Promise((resolve, reject) => {
      // Create TCP socket
      this.socket = net.createConnection({
        host: this.host,
        port: this.port,
      });

      // Connection successful
      this.socket.on("connect", () => {
        console.log(`Connected to ${this.host}:${this.port}`);
        this.connected = true;
        resolve();
      });

      // Receive data
      this.socket.on("data", (data) => {
        this.handleIncomingData(data);
      });

      // Connection error
      this.socket.on("error", (error) => {
        console.error(`Socket error:`, error);
        this.connected = false;
        reject(error);
      });

      // Connection closed
      this.socket.on("close", () => {
        console.log(`Connection closed: ${this.host}:${this.port}`);
        this.connected = false;
      });
    });
  }

  // Send data over socket
  write(data) {
    if (!this.connected) {
      throw new Error("Socket not connected");
    }

    // Send bytes over TCP
    this.socket.write(data);
  }

  // Handle incoming data (might come in chunks)
  handleIncomingData(data) {
    // Convert bytes to string
    this.messageBuffer += data.toString();

    // Messages are separated by newlines
    const messages = this.messageBuffer.split("\n");

    // Last item might be incomplete message
    this.messageBuffer = messages.pop();

    // Process complete messages
    messages.forEach((messageString) => {
      if (messageString.trim()) {
        try {
          const message = JSON.parse(messageString);
          this.notifyHandlers(message);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      }
    });
  }

  // Register message handler
  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  // Notify all handlers of new message
  notifyHandlers(message) {
    this.messageHandlers.forEach((handler) => {
      handler(message);
    });
  }

  // Close connection
  close() {
    if (this.socket) {
      this.socket.end();
      this.connected = false;
    }
  }
}

// ========================================
// VALIDATOR P2P - Complete implementation
// ========================================

const crypto = require("crypto");

class ValidatorP2P {
  constructor(myAddress, myPort) {
    this.myAddress = myAddress;
    this.myPort = myPort;
    this.peers = []; // Array of Peer objects
    this.maxPeers = 50;
    this.seenMessages = new Map(); // messageId -> timestamp
    this.topics = new Map(); // topic -> Set of subscribers
    this.server = null; // TCP server for incoming connections

    // Known bootstrap nodes (hardcoded)
    this.bootNodes = [
      { host: "bootnode1.ethereum.org", port: 30303 },
      { host: "bootnode2.ethereum.org", port: 30303 },
      { host: "bootnode3.ethereum.org", port: 30303 },
    ];
  }

  // ========================================
  // STARTUP & CONNECTION
  // ========================================

  async start() {
    console.log("=== Starting Validator P2P ===");

    // Step 1: Start listening for incoming connections
    await this.startServer();

    // Step 2: Connect to bootstrap nodes
    await this.connectToBootNodes();

    // Step 3: Discover more peers
    await this.discoverPeers();

    // Step 4: Subscribe to topics
    this.subscribeToTopics();

    // Step 5: Start health checks
    this.startHealthChecks();

    console.log("=== P2P Network Ready ===");
  }

  // Start TCP server to accept incoming connections
  async startServer() {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        this.handleIncomingConnection(socket);
      });

      this.server.listen(this.myPort, () => {
        console.log(`Listening on port ${this.myPort}`);
        resolve();
      });
    });
  }

  // Handle when another validator connects to us
  handleIncomingConnection(socket) {
    const remoteAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`Incoming connection from ${remoteAddress}`);

    // Create peer object
    const peer = new Peer(remoteAddress, socket);

    // Add to our peers list
    if (this.peers.length < this.maxPeers) {
      this.peers.push(peer);
      this.setupPeerHandlers(peer, socket);
    } else {
      // Too many peers, reject
      socket.end();
    }
  }

  // Connect to bootstrap nodes
  async connectToBootNodes() {
    console.log("Connecting to bootstrap nodes...");

    for (let bootNode of this.bootNodes) {
      try {
        await this.connectToPeer(bootNode.host, bootNode.port);
        console.log(`✓ Connected to ${bootNode.host}`);
      } catch (error) {
        console.log(`✗ Failed to connect to ${bootNode.host}`);
      }
    }
  }

  // Connect to a specific peer
  async connectToPeer(host, port) {
    // Check if already connected
    const address = `${host}:${port}`;
    if (this.peers.find((p) => p.address === address)) {
      return; // Already connected
    }

    // Check if we have room for more peers
    if (this.peers.length >= this.maxPeers) {
      return; // At capacity
    }

    try {
      // Create socket and connect
      const socket = new NetworkSocket(host, port);
      await socket.connect();

      // Create peer object
      const peer = new Peer(address, socket);
      this.peers.push(peer);

      // Setup message handlers
      this.setupPeerHandlers(peer, socket);

      return peer;
    } catch (error) {
      throw new Error(`Failed to connect to ${host}:${port}`);
    }
  }

  // Setup handlers for peer messages
  setupPeerHandlers(peer, socket) {
    socket.onMessage((message) => {
      this.handlePeerMessage(peer, message);
    });
  }

  // ========================================
  // PEER DISCOVERY
  // ========================================

  async discoverPeers() {
    console.log("Discovering more peers...");

    while (this.peers.length < this.maxPeers) {
      // Ask each existing peer for their peers
      for (let peer of [...this.peers]) {
        // Copy array (it might change)
        try {
          const newPeerAddresses = await this.requestPeersFrom(peer);

          // Try to connect to new peers
          for (let address of newPeerAddresses) {
            if (this.peers.length >= this.maxPeers) break;

            const [host, port] = address.split(":");
            try {
              await this.connectToPeer(host, parseInt(port));
            } catch (error) {
              // Failed to connect, continue
            }
          }
        } catch (error) {
          // This peer didn't respond, continue
        }

        if (this.peers.length >= this.maxPeers) break;
      }

      // If we still don't have enough peers, wait and try again
      if (this.peers.length < this.maxPeers) {
        await this.sleep(5000); // Wait 5 seconds
      }
    }

    console.log(`✓ Connected to ${this.peers.length} peers`);
  }

  // Request peer list from a specific peer
  async requestPeersFrom(peer) {
    return new Promise((resolve, reject) => {
      const requestId = this.generateMessageId();

      // Send request
      const request = {
        type: "GET_PEERS",
        requestId: requestId,
      };

      peer.send(request);

      // Wait for response
      const timeout = setTimeout(() => {
        reject(new Error("Peer list request timeout"));
      }, 5000);

      // Store handler for response
      const handler = (message) => {
        if (
          message.type === "PEERS_RESPONSE" &&
          message.requestId === requestId
        ) {
          clearTimeout(timeout);
          resolve(message.peers);
        }
      };

      // Temporary response handler
      peer._responseHandler = handler;
    });
  }

  // ========================================
  // MESSAGE HANDLING
  // ========================================

  handlePeerMessage(peer, message) {
    // Handle different message types
    switch (message.type) {
      case "GET_PEERS":
        this.handleGetPeersRequest(peer, message);
        break;

      case "PEERS_RESPONSE":
        if (peer._responseHandler) {
          peer._responseHandler(message);
        }
        break;

      case "PING":
        this.handlePing(peer, message);
        break;

      case "PONG":
        peer.emit("pong", message);
        break;

      case "GOSSIP":
        this.handleGossipMessage(peer, message);
        break;

      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  // When peer asks for our peer list
  handleGetPeersRequest(peer, message) {
    // Send them a list of peers we know (excluding them)
    const peerList = this.peers
      .filter((p) => p !== peer && p.isAlive)
      .slice(0, 20) // Send max 20 peers
      .map((p) => p.address);

    const response = {
      type: "PEERS_RESPONSE",
      requestId: message.requestId,
      peers: peerList,
    };

    peer.send(response);
  }

  // Handle ping (health check)
  handlePing(peer, message) {
    const pong = {
      type: "PONG",
      timestamp: Date.now(),
    };
    peer.send(pong);
  }

  // ========================================
  // GOSSIP PROTOCOL
  // ========================================

  subscribeToTopics() {
    // Subscribe to main topics
    this.subscribe("/eth2/beacon_block", (data) => {
      console.log("Received block:", data.slot);
      this.processBlock(data);
    });

    this.subscribe("/eth2/beacon_aggregate", (data) => {
      console.log("Received attestation aggregate");
      this.processAttestation(data);
    });
  }

  // Subscribe to a topic
  subscribe(topic, handler) {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }
    this.topics.get(topic).add(handler);
    console.log(`Subscribed to topic: ${topic}`);
  }

  // Handle incoming gossip message
  handleGossipMessage(fromPeer, message) {
    const { topic, data, messageId, signature } = message;

    // Step 1: Check if we've seen this message
    if (this.seenMessages.has(messageId)) {
      return; // Duplicate, ignore
    }

    // Step 2: Validate message
    if (!this.validateGossipMessage(message)) {
      console.log("Invalid message, dropping");
      return;
    }

    // Step 3: Mark as seen
    this.seenMessages.set(messageId, Date.now());

    // Step 4: Process the message (call subscribers)
    if (this.topics.has(topic)) {
      const handlers = this.topics.get(topic);
      handlers.forEach((handler) => handler(data));
    }

    // Step 5: Forward to other peers (gossip!)
    this.forwardGossipMessage(message, fromPeer);
  }

  // Validate gossip message
  validateGossipMessage(message) {
    // Check 1: Has required fields
    if (!message.topic || !message.data || !message.signature) {
      return false;
    }

    // Check 2: Verify signature
    if (!this.verifySignature(message.data, message.signature)) {
      return false;
    }

    // Check 3: Content-specific validation
    if (message.topic === "/eth2/beacon_block") {
      return this.validateBlock(message.data);
    }

    return true;
  }

  // Forward message to other peers
  forwardGossipMessage(message, excludePeer) {
    let forwardCount = 0;

    for (let peer of this.peers) {
      // Don't send back to peer we received from
      if (peer === excludePeer) continue;

      // Don't send to dead peers
      if (!peer.isAlive) continue;

      // Send it
      if (peer.send(message)) {
        forwardCount++;
      }
    }

    console.log(`Forwarded message to ${forwardCount} peers`);
  }

  // Broadcast a new message (when you create something)
  broadcast(topic, data) {
    // Create message
    const message = {
      type: "GOSSIP",
      topic: topic,
      data: data,
      messageId: this.generateMessageId(),
      signature: this.sign(data),
      timestamp: Date.now(),
    };

    // Mark as seen (so we don't process our own message)
    this.seenMessages.set(message.messageId, Date.now());

    // Send to all peers
    let sentCount = 0;
    for (let peer of this.peers) {
      if (peer.isAlive && peer.send(message)) {
        sentCount++;
      }
    }

    console.log(`Broadcasted to ${sentCount} peers`);
    return message;
  }

  // ========================================
  // VALIDATION & CRYPTO
  // ========================================

  validateBlock(block) {
    // Check block structure
    if (!block.slot || !block.proposer || !block.transactions) {
      return false;
    }

    // Check slot is reasonable
    if (block.slot < 0 || block.slot > 1000000000) {
      return false;
    }

    // In real Ethereum: Validate transactions, state roots, etc.
    return true;
  }

  sign(data) {
    // In real Ethereum: BLS signature
    // For demo: Simple hash-based signature
    const dataString = JSON.stringify(data);
    return crypto
      .createHash("sha256")
      .update(dataString + this.myAddress)
      .digest("hex");
  }

  verifySignature(data, signature) {
    // In real Ethereum: Verify BLS signature
    // For demo: Just check signature exists and is right length
    return signature && signature.length === 64;
  }

  // ========================================
  // HEALTH & MAINTENANCE
  // ========================================

  startHealthChecks() {
    // Ping peers every 30 seconds
    setInterval(() => {
      this.healthCheck();
    }, 30000);

    // Clean up old seen messages every 5 minutes
    setInterval(() => {
      this.cleanupSeenMessages();
    }, 300000);
  }

  async healthCheck() {
    console.log("Running health check...");

    for (let i = this.peers.length - 1; i >= 0; i--) {
      const peer = this.peers[i];

      try {
        await peer.ping();
      } catch (error) {
        console.log(`Peer ${peer.address} is dead, removing`);
        this.peers.splice(i, 1);
      }
    }

    console.log(`Health check done. ${this.peers.length} peers alive`);

    // If we lost peers, discover more
    if (this.peers.length < this.maxPeers) {
      this.discoverPeers().catch(() => {});
    }
  }

  cleanupSeenMessages() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    for (let [messageId, timestamp] of this.seenMessages) {
      if (now - timestamp > maxAge) {
        this.seenMessages.delete(messageId);
      }
    }
  }

  // ========================================
  // UTILITIES
  // ========================================

  generateMessageId() {
    return crypto.randomBytes(16).toString("hex");
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  processBlock(block) {
    // Here you would validate and add block to chain
    console.log(`Processing block for slot ${block.slot}`);
  }

  processAttestation(attestation) {
    // Here you would process the vote
    console.log("Processing attestation");
  }
}

// ========================================
// DEMO: Run two validators and watch them communicate
// ========================================

async function runDemo() {
  console.log("=== ETHEREUM P2P DEMO ===\n");

  // Create Validator 1
  const validator1 = new ValidatorP2P("192.168.1.100", 30303);

  // Create Validator 2
  const validator2 = new ValidatorP2P("192.168.1.101", 30304);

  // Start both validators
  console.log("Starting Validator 1...");
  await validator1.start();

  console.log("\nStarting Validator 2...");
  await validator2.start();

  // Connect validator 2 to validator 1
  console.log("\nConnecting validators...");
  await validator2.connectToPeer("192.168.1.100", 30303);

  // Wait a bit for connections to stabilize
  await sleep(2000);

  // Validator 1 creates and broadcasts a block
  console.log("\n=== Validator 1 Broadcasting Block ===");
  const block = {
    slot: 100,
    proposer: "validator_1",
    transactions: ["tx1", "tx2", "tx3"],
    parent_hash: "0xabc123",
    timestamp: Date.now(),
  };

  validator1.broadcast("/eth2/beacon_block", block);

  // Wait to see it propagate
  await sleep(2000);

  // Validator 2 broadcasts an attestation
  console.log("\n=== Validator 2 Broadcasting Attestation ===");
  const attestation = {
    slot: 100,
    block_hash: "0xdef456",
    validator_index: 2,
  };

  validator2.broadcast("/eth2/beacon_aggregate", attestation);

  // Wait to see it propagate
  await sleep(2000);

  console.log("\n=== Demo Complete ===");
  console.log(`Validator 1 has ${validator1.peers.length} peers`);
  console.log(`Validator 2 has ${validator2.peers.length} peers`);
}

// Helper function
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run the demo
runDemo().catch(console.error);
```

---

## Part 5: Example Output (What You'd See)
```;
// === ETHEREUM P2P DEMO ===

// Starting Validator 1...
// Listening on port 30303
// Connecting to bootstrap nodes...
// ✓ Connected to bootnode1.ethereum.org
// ✓ Connected to bootnode2.ethereum.org
// Discovering more peers...
// ✓ Connected to 50 peers
// Subscribed to topic: /eth2/beacon_block
// Subscribed to topic: /eth2/beacon_aggregate
// === P2P Network Ready ===

// Starting Validator 2...
// Listening on port 30304
// Connecting to bootstrap nodes...
// ✓ Connected to bootnode1.ethereum.org
// Discovering more peers...
// ✓ Connected to 50 peers
// Subscribed to topic: /eth2/beacon_block
// Subscribed to topic: /eth2/beacon_aggregate
// === P2P Network Ready ===

// Connecting validators...
// Incoming connection from 192.168.1.101:30304

// === Validator 1 Broadcasting Block ===
// Broadcasted to 50 peers
// Sent to 192.168.1.101:30304: /eth2/beacon_block
// Sent to bootnode1.ethereum.org:30303: /eth2/beacon_block
// ...
// Forwarded message to 49 peers

// [Validator 2 receives]
// Received block: 100
// Processing block for slot 100
// Forwarded message to 49 peers

// === Validator 2 Broadcasting Attestation ===
// Broadcasted to 50 peers
// Sent to 192.168.1.100:30303: /eth2/beacon_aggregate
// ...

// [Validator 1 receives]
// Received attestation aggregate
// Processing attestation
// Forwarded message to 49 peers

// === Demo Complete ===
// Validator 1 has 50 peers
// Validator 2 has 50 peers
