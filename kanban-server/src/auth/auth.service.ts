import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    // ✅ 登录逻辑：验证邮箱和密码
    async login(email: string, pass: string) {
        // 1. 找用户
        const user = await this.usersService.findOne(email);
        if (!user) {
            throw new UnauthorizedException('账号或密码错误');
        }

        // 2. 验证密码 (比对明文和哈希)
        const isMatch = await bcrypt.compare(pass, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('账号或密码错误');
        }

        // 3. 签发 JWT Token
        const payload = { sub: user.id, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    // ✅ 注册逻辑
    async register(email: string, pass: string, name?: string) {
        // 1. 密码加密 (哈希)
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(pass, salt);

        // 2. 创建用户
        const user = await this.usersService.create({
            email,
            password: hashedPassword,
            name,
        });

        // 3. 注册成功后直接返回 Token，方便前端直接登录
        return this.login(email, pass);
    }
}