import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    /*
      {
        module: JwtModule,           // 第一句话告诉框架：我本质上还是 JwtModule
        imports: [ConfigModule],     // 告诉框架：我这个定制模块还需要依赖别人
        providers: [
          {
            provide: 'JWT_MODULE_OPTIONS',
            inject: [ConfigService],
            useFactory: (config) => ({ ... }) // 把你写的工厂函数偷偷塞在这里
          },
          JwtService                 // 把核心的 JwtService 也挂载上来
        ],
        exports: [JwtService]        // 把 JwtService 暴露给外面的 AuthModule 用
      }
    */
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule { }