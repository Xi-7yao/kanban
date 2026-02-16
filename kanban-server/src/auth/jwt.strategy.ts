import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

// 🔐 JWT 策略
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            // 从请求头 Authorization: Bearer <token> 中获取 Token
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false, // 拒绝过期 Token
            // ⚠️ 真实项目中，这个密钥应该放在 .env 文件里
            secretOrKey: 'MY_SUPER_SECRET_KEY_123',
        });
    }

    // 验证通过后，Payload 会被解密并传给这个函数
    // 返回值会自动挂载到 request.user 上
    async validate(payload: any) {
        return { userId: payload.sub, email: payload.email };
    }
}