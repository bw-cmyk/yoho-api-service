import * as WebSocket from 'ws';

const BASE_URL = 'wss://nbstream.binance.com/eoptions';
const STREAMS = ['BTCUSDT@index']; // 支持多个，如 ["BTCUSDT@index", "ETHUSDT@index"]

let ws;
let lastMessageTime = 0;
let reconnectTimer = null;
let pingInterval = null;

// 建立连接
function connect() {
  const streamParam = STREAMS.join('/');
  const url = `${BASE_URL}/stream?streams=${streamParam}`;
  console.log(`\n🔌 Connecting to: ${url}`);
  ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('✅ Connected to Binance eOptions WebSocket');
    lastMessageTime = Date.now();
    startHealthCheck();
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      lastMessageTime = Date.now();

      // 判断是否为组合流格式 {"stream": "...", "data": {...}}
      const data = msg.data || msg;
      if (data.e === 'index') {
        // console.log(`📈 [${data.s}] Index Price: ${data.p}`);
      } else if (msg.result === null && msg.id) {
        console.log('✅ Subscription confirmed');
      }
    } catch (err) {
      console.error('⚠️ JSON parse error:', err.message);
    }
  });

  ws.on('ping', () => {
    console.log('↔️  Received ping, sending pong');
    ws.pong();
  });

  ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err.message);
    reconnect();
  });

  ws.on('close', () => {
    console.warn('⚠️ WebSocket closed');
    reconnect();
  });
}

// 健康检查 + 心跳机制
function startHealthCheck() {
  clearInterval(pingInterval);
  clearInterval(reconnectTimer);

  // 定期发送 pong 防止断开（每5分钟内至少1次）
  pingInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.pong();
      console.log('💓 Sent pong heartbeat');
    }
  }, 4 * 60 * 1000); // 每4分钟发送一次

  // 检查是否5秒内有新价格
  reconnectTimer = setInterval(() => {
    const diff = Date.now() - lastMessageTime;
    if (diff > 5000) {
      console.warn(`⏰ No new price for ${diff / 1000}s, reconnecting...`);
      reconnect();
    }
  }, 2000);
}

// 重连
function reconnect() {
  clearInterval(pingInterval);
  clearInterval(reconnectTimer);
  if (ws) {
    try {
      ws.terminate();
    } catch {}
  }
  console.log('🔁 Reconnecting in 2 seconds...');
  setTimeout(connect, 2000);
}

// 启动
connect();
