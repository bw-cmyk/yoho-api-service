import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ApiKeyStrategy } from './api_key.strategy';
import { ApiKey } from './api_key.entity';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([ApiKey]),
    JwtModule.register({
      secret: 'w40Obx1sz0ynrEOAyLoYPX0ciU95uoN5Xu-7tARvKEE=',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [AuthService, ApiKeyStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
