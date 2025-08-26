import {
  generateKeyPair,
  exportJWK,
  exportPKCS8,
  calculateJwkThumbprint,
} from 'jose';

// 用法：node gen-jwk-and-pem.mjs [EdDSA|ES256|RS256]
const inputAlg = (process.argv[2] || 'EdDSA').toUpperCase();
const alg = ['EDDSA', 'ES256', 'RS256'].includes(inputAlg) ? inputAlg : 'EDDSA';

const kpOpts = (() => {
  if (alg === 'RS256') return { modulusLength: 2048 }; // 可改 3072/4096
  // EdDSA/ES256 无需特别参数
  return {};
})();

const { publicKey, privateKey } = await generateKeyPair(alg, kpOpts);

// 导出 Public JWK（带 kid/alg/use）
const publicJwk = await exportJWK(publicKey);
publicJwk.alg = alg;
publicJwk.use = 'sig';
publicJwk.kid = await calculateJwkThumbprint(publicJwk);

// 导出私钥 PEM（PKCS#8）
const privateKeyPem = await exportPKCS8(privateKey);

// 打印一个 JSON，包含 publicJwk 与 privateKeyPem
const out = {
  alg,
  publicJwk,
  privateKeyPem: Buffer.from(privateKeyPem).toString('base64'),
};
console.log(JSON.stringify(out, null, 2));
