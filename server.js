const mqtt = require("mqtt");
const WebSocket = require("ws");

// Connect to the MQTT broker over WebSockets with options
const mqttClient = mqtt.connect("mqtt://13.126.132.166:1883", {
  connectTimeout: 4000, // 4 seconds
  reconnectPeriod: 1000, // 1 second
  clientId: "mqttjs_" + Math.random().toString(16).substr(2, 8),
  clean: true,
  keepalive: 60,
  protocolId: "MQTT",
  protocolVersion: 4,
  rejectUnauthorized: false, // Allow self-signed certificates
});

// WebSocket server for clients to connect
const wss = new WebSocket.Server({ port: 9002 }); // Changed port to 9002
const wsClients = new Set();

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  wsClients.add(ws);

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
    wsClients.delete(ws);
  });

  ws.on("error", (err) => {
    console.error("WebSocket client error:", err);
  });
});

mqttClient.on("connect", function () {
  console.log("Connected to MQTT broker");

  // Subscribe to the topic "Honda"
  const TOPIC = "Honda";
  mqttClient.subscribe(TOPIC, function (err) {
    if (!err) {
      console.log("Subscribed to topic: ", TOPIC);
    } else {
      console.error("Failed to subscribe to topic:", TOPIC, err);
    }
  });
});

mqttClient.on("error", function (err) {
  console.error("MQTT client error:", err);
});

// Handle incoming messages from MQTT and broadcast to WebSocket clients
mqttClient.on("message", function (topic, message) {
  if (topic === "Honda") {
    try {
      const data = JSON.parse(message.toString());
      // Broadcast the message to all connected WebSocket clients
      const payload = JSON.stringify({ topic, message: data });
      wsClients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      });
    } catch (err) {
      console.error("Error parsing MQTT message:", err);
    }
  }
});
