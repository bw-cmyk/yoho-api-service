const crypto = require('crypto');
const querystring = require('querystring');

// Function to generate HMAC SHA256 signature
function generateSignature(timestamp, httpMethod, requestPath, secretKey) {
  // Concatenate parameters for signature string
  const signatureString = timestamp + httpMethod + requestPath;
  console.log('signatureString:' + signatureString);

  // Generate HMAC SHA256 signature using the secret key
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(signatureString);
  const signature = hmac.digest('base64');

  return encodeURIComponent(signature);
}

// Function to sort parameters and return a string to sign
function getStringToSign(params) {
  const sortedKeys = Object.keys(params).sort();
  const s2s = sortedKeys
    .map((key) => {
      const value = params[key];
      if (Array.isArray(value) || value === '') {
        return null;
      }
      return `${key}=${value}`;
    })
    .filter(Boolean)
    .join('&');

  return s2s;
}

// Example for On Ramp
const onRampHttpMethod = 'GET';
const onRampRequestPath = '/index/rampPageBuy';
const timestamp = String(Date.now());

const onRampSecretKey = '5Zp9SmtLWQ4Fh2a1';
const appId = 'f83Is2y7L425rxl8';

// const paramsToSign = {
//   crypto: 'USDT',
//   fiat: 'USD',
//   fiatAmount: '30',
//   merchantOrderNo: 'test'+ timestamp,
//   network: 'TRX',
//   timestamp: timestamp,
//   appId: appId
// };

const paramsToSign = {
  appId: 'f83Is2y7L425rxl8',
  crypto: 'USDT',
  fiat: 'USD',
  fiatAmount: '10',
  network: 'BSC',
  timestamp: '1757319886244',
  merchantOrderNo: 'test1757319886244',
  address: '0x6FebE2c7757B52AbBaBD0BF862e5355CA9b97437',
  email: 'boelroy@live.com'
}

const rawDataToSign = getStringToSign(paramsToSign);
const requestPathWithParams = onRampRequestPath + '?' + rawDataToSign;
const onRampSignature = generateSignature(
  timestamp,
  onRampHttpMethod,
  requestPathWithParams,
  onRampSecretKey,
);

console.log('On Ramp Signature: ' + onRampSignature);
console.log(
  'Final link: ' +
    'https://ramptest.alchemypay.org?' +
    rawDataToSign +
    '&sign=' +
    onRampSignature,
);
