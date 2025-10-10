import { OKXDEX } from '../src/api-modules/assets/dex/okx';

const okx = OKXDEX.fromEnv();

const main = async () => {
  const tokens = await okx.get(
    '/api/v6/dex/post-transaction/transactions-by-address',
    {
      address: '0x0830946b96F33C709aD88105bBF7e439641F0b71',
      chains: '56',
      limit: '100',
    },
  );
  console.log(JSON.stringify(tokens, null, 2));
};

main();
