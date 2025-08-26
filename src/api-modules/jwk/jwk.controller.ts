import { Controller, Get } from '@nestjs/common';

@Controller('/')
export class JwkController {
  @Get('.well-known/jwk.json')
  async jwk() {
    return {
      keys: [
        {
          kty: 'RSA',
          n: process.env.PARTICLE_WALLET_PUBLIC_KEY,
          e: 'AQAB',
          alg: 'RS256',
          use: 'sig',
          kid: 'R6GZ0AxCaRD5I-NRuraeMmr6mK3txtv1Ja9X-tp6QTM',
        },
      ],
    };
  }
}
