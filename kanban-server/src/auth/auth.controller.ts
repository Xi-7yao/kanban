import { Body, Controller, Post, Res, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @ApiOperation({ summary: '用户登录' })
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        // 1. 获取原有的登录结果（包含 token）
        const result = await this.authService.login(dto.email, dto.password);

        // 2. 将 JWT 放入 HttpOnly Cookie
        res.cookie('access_token', result.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 1天
            path: '/',
        });

        // 3. 将 CSRF Token 放入普通 Cookie（允许前端JS读取）
        const csrfToken = randomUUID();
        res.cookie('csrf_token', csrfToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/',
        });

        return { message: '登录成功' };
    }

    @Post('register')
    @ApiOperation({ summary: '用户注册' })
    async register(@Body() dto: RegisterDto) {
        // 保留了你原有的 3 个参数 (email, password, name)
        return this.authService.register(dto.email, dto.password, dto.name);
    }

    // --- 以下为新增接口 ---

    @Post('logout')
    @ApiOperation({ summary: '用户登出' })
    async logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('access_token');
        res.clearCookie('csrf_token');
        return { message: '登出成功' };
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth() // 加上 Swagger auth 标识
    @ApiOperation({ summary: '获取当前登录用户信息' })
    async me(@GetUser() user: JwtPayload) {
        return user;
    }
}