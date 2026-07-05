// consumer.cjs
const { Kafka } = require('kafkajs');
const { WebSocketServer } = require('ws');

const TOPIC = 'loadshedding-updates-v2';
const WS_PORT = 4001;

const kafka = new Kafka({
  clientId: 'sa-loadshedding-consumer',
  brokers: ['kafka.railway.internal:29092'],
});

const consumer = kafka.consumer({ groupId: 'dashboard-consumer-group' });

const wss = new WebSocketServer({ port: WS_PORT });
console.log(`[consumer] WebSocket server listening on ws://localhost:${WS_PORT}`);

wss.on('connection', (ws) => {
  console.log('[consumer] Dashboard connected via WebSocket');
  ws.on('close', () => console.log('[consumer] Dashboard disconnected'));
});

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

  console.log(`[consumer] Connected to Kafka, subscribed to "${TOPIC}"`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value.toString());
      console.log(`[consumer] Received: ${data.lastChange.province} -> Stage ${data.lastChange.stage}`);
      broadcast(data);
    },
  });
}

run().catch(err => {
  console.error('[consumer] Fatal error:', err);
  process.exit(1);
});
