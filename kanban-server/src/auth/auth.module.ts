import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // ⚙️ 配置 JWT 模块
    JwtModule.register({
      secret: 'MY_SUPER_SECRET_KEY_123', // 必须和 Strategy 里的密钥一致
      signOptions: { expiresIn: '1d' },  // Token 1天后过期
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // 👈 别忘了注册 Strategy
  exports: [AuthService],
})
export class AuthModule { }