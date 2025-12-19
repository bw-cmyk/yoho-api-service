import * as WebSocket from 'ws';
const main = async () => {
  const ws = new WebSocket(
    'wss://fstream.binance.com/stream?streams=btcusdt@markPrice@1s',
  );

  ws.on('open', () => {
    console.log('✅ Connected to Binance eOptions WebSocket');
    // ws.send(JSON.stringify({
    //   method: 'SUBSCRIBE',
    //   params: ['btcusdt@markPrice'],
    //   id: 1,
    // }));
  });

  ws.on('message', (raw: Buffer) => {
    console.log('raw', raw);
    const data = JSON.parse(raw.toString());
    console.log('data', data);
  });

  ws.on('ping', () => {
    console.log('↔️ Received ping, sending pong');
    ws?.pong();
  });
};

main();
