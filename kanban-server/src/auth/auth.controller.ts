import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

// 简单定义一下 DTO，你可以稍后移到单独文件
class LoginDto {
    email: string;
    password: string;
}

class RegisterDto {
    email: string;
    password: string;
    name?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @ApiOperation({ summary: '用户登录' })
    async login(@Body() body: LoginDto) {
        return this.authService.login(body.email, body.password);
    }

    @Post('register')
    @ApiOperation({ summary: '用户注册' })
    async register(@Body() body: RegisterDto) {
        return this.authService.register(body.email, body.password, body.name);
    }
}