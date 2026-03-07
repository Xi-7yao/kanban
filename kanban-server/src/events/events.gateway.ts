import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
    // 必须开启 credentials 允许携带 Cookie
    cors: { origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'], credentials: true },
    namespace: '/board',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private userLocks = new Map<string, number>(); // 记录 socketId 正在编辑的 cardId

    constructor(
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    async handleConnection(client: Socket) {
        console.log('[WS] 新连接到达, socketId =', client.id);
        try {
            // 1. 从握手请求的 Cookie 中提取 access_token
            const cookieHeader = client.handshake.headers.cookie;
            console.log('[WS] Cookie:', cookieHeader ? '有' : '无');
            if (!cookieHeader) throw new Error('No cookie found');

            const token = cookieHeader
                .split('; ')
                .find(row => row.startsWith('access_token='))
                ?.split('=')[1];

            if (!token) throw new Error('No token found');

            // 2. 验证 JWT
            const secret = this.configService.get<string>('JWT_SECRET');
            const payload = this.jwtService.verify(token, { secret });

            // 3. 记录 userId 并加入个人专属房间（保证只会广播给同一个用户的多端设备）
            // JWT payload 中用户 ID 的字段名是 sub（由 auth.service.ts 签发时决定）
            client.data.userId = payload.sub;
            client.join(`board:${payload.sub}`);
            console.log('[WS] 鉴权成功, userId =', payload.sub, ', 已加入房间 board:' + payload.sub);
        } catch (error) {
            console.error('[WS] 鉴权失败:', (error as Error).message);
            client.disconnect(); // 鉴权失败，断开连接
        }
    }

    handleDisconnect(client: Socket) {
        // 4. 断线时如果该用户持有锁，自动广播释放锁，防止死锁
        const lockedCardId = this.userLocks.get(client.id);
        if (lockedCardId && client.data.userId) {
            this.broadcastToBoard(client.data.userId, 'board:event', {
                type: 'user:stopEditing',
                cardId: lockedCardId,
            }, client.id);
        }
        this.userLocks.delete(client.id);
    }

    // --- 供 Service 调用的广播方法 ---
    broadcastToBoard(userId: number, event: string, data: any, excludeClientId?: string) {
        if (excludeClientId) {
            this.server.to(`board:${userId}`).except(excludeClientId).emit(event, data);
        } else {
            this.server.to(`board:${userId}`).emit(event, data);
        }
    }

    // --- 接收前端发来的锁定/解锁事件 ---
    @SubscribeMessage('lock:acquire')
    handleLockAcquire(@ConnectedSocket() client: Socket, @MessageBody() cardId: number) {
        if (!client.data.userId) return;
        this.userLocks.set(client.id, cardId);
        this.broadcastToBoard(client.data.userId, 'board:event', {
            type: 'user:editing',
            cardId,
        }, client.id); // 排除自己，发给其他端
    }

    @SubscribeMessage('lock:release')
    handleLockRelease(@ConnectedSocket() client: Socket, @MessageBody() cardId: number) {
        if (!client.data.userId) return;
        this.userLocks.delete(client.id);
        this.broadcastToBoard(client.data.userId, 'board:event', {
            type: 'user:stopEditing',
            cardId,
        }, client.id);
    }
}