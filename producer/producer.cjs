// producer.cjs
require('dotenv').config({ path: '../.env' });
const { Kafka } = require('kafkajs');
const fetch = require('node-fetch');

const TOKEN = process.env.ESKOMSEPUSH_TOKEN;
const TOPIC = 'loadshedding-updates';

const kafka = new Kafka({
  clientId: 'sa-loadshedding-producer',
  brokers: ['kafka.railway.internal:29092'],
});

const producer = kafka.producer();

const PROVINCES = [
  'Limpopo', 'Mpumalanga', 'Gauteng', 'North West', 'Free State',
  'KwaZulu-Natal', 'Northern Cape', 'Eastern Cape', 'Western Cape',
];

let provinceStages = Object.fromEntries(PROVINCES.map(p => [p, 2]));

let cachedNationalStage = null;
let lastFetch = 0;
const FETCH_INTERVAL_MS = 30 * 60 * 1000;

async function getNationalStage() {
  const now = Date.now();
  if (cachedNationalStage !== null && (now - lastFetch) < FETCH_INTERVAL_MS) {
    return cachedNationalStage;
  }
  try {
    const res = await fetch('https://developer.sepush.co.za/business/3.1/status', {
      headers: { token: TOKEN },
    });
    const data = await res.json();
    const stage = parseInt(data.status?.eskom?.stage, 10);
    if (!isNaN(stage)) {
      cachedNationalStage = stage;
      lastFetch = now;
      console.log(`[producer] Refreshed real national stage: ${stage}`);
    }
  } catch (err) {
    console.error('[producer] Failed to fetch real stage, using cached/default:', err.message);
  }
  return cachedNationalStage ?? 2;
}

function simulateProvinceTick() {
  const province = PROVINCES[Math.floor(Math.random() * PROVINCES.length)];
  const delta = Math.random() > 0.5 ? 1 : -1;
  provinceStages[province] = Math.max(0, Math.min(6, provinceStages[province] + delta));
  return { province, stage: provinceStages[province] };
}

async function run() {
  await producer.connect();
  console.log(`[producer] Connected to Kafka. Publishing to topic "${TOPIC}" every 5 seconds...`);

  setInterval(async () => {
    const nationalStage = await getNationalStage();
    const change = simulateProvinceTick();

    const message = {
      timestamp: new Date().toISOString(),
      nationalStage,
      provinces: provinceStages,
      lastChange: change,
    };

    await producer.send({
      topic: TOPIC,
      messages: [{ value: JSON.stringify(message) }],
    });

    console.log(`[producer] Sent update: ${change.province} -> Stage ${change.stage} | National: Stage ${nationalStage}`);
  }, 5000);
}

run().catch(err => {
  console.error('[producer] Fatal error:', err);
  process.exit(1);
});
