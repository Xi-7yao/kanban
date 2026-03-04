import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Request } from 'express'; // 新增引入

interface JwtTokenPayload {
    sub: number;
    email: string;
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            // ⬇️ 修改这里：自定义提取器，从 Cookie 中获取 access_token
            jwtFromRequest: (req: Request) => {
                return req?.cookies?.['access_token'] || null;
            },
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
        });
    }

    // 保留你原本的验证逻辑
    async validate(payload: JwtTokenPayload): Promise<JwtPayload> {
        return { userId: payload.sub, email: payload.email };
    }
}