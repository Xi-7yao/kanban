import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();

        // 1. GET/HEAD/OPTIONS 不修改数据，放行
        if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
            return true;
        }

        // 2. 登录和注册接口放行 (此时用户还没拿到 cookie)
        if (request.path === '/auth/login' || request.path === '/auth/register') {
            return true;
        }

        // 3. 校验 CSRF Token 是否一致
        const cookieToken = request.cookies?.['csrf_token'];
        const headerToken = request.headers['x-csrf-token'];

        if (!cookieToken || !headerToken || cookieToken !== headerToken) {
            throw new ForbiddenException('CSRF 校验失败，拒绝访问');
        }

        return true;
    }
}