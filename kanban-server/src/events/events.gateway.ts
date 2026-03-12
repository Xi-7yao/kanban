import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'], credentials: true },
  namespace: '/board',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);
  private userLocks = new Map<string, number>();
  private socketUsers = new Map<string, number>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers.cookie;
      if (!cookieHeader) throw new Error('No cookie found');

      const token = cookieHeader
        .split('; ')
        .find((row) => row.startsWith('access_token='))
        ?.split('=')[1];

      if (!token) throw new Error('No token found');

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });

      client.data.userId = payload.sub;
      this.socketUsers.set(client.id, payload.sub);
      client.join(`board:${payload.sub}`);
      client.emit('locks:sync', {
        cardIds: this.getActiveLocksForUser(payload.sub),
      });
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'No cookie found' || message === 'No token found') {
        this.logger.debug(`Ignored anonymous socket ${client.id}: ${message}`);
      } else {
        this.logger.warn(`Socket authentication failed for ${client.id}: ${message}`);
      }
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id) ?? client.data.userId;
    const lockedCardId = this.userLocks.get(client.id);
    if (lockedCardId && userId) {
      this.userLocks.delete(client.id);
      this.emitLocksSync(userId);
      this.socketUsers.delete(client.id);
      return;
    }
    this.userLocks.delete(client.id);
    this.socketUsers.delete(client.id);
  }

  private getActiveLocksForUser(userId: number): number[] {
    const activeLocks = new Set<number>();

    for (const [socketId, cardId] of this.userLocks.entries()) {
      if (this.socketUsers.get(socketId) === userId) {
        activeLocks.add(cardId);
      }
    }

    return [...activeLocks];
  }

  private emitLocksSync(userId: number) {
    const payload = {
      cardIds: this.getActiveLocksForUser(userId),
    };

    this.server.to(`board:${userId}`).emit('locks:sync', payload);
  }

  broadcastToBoard(userId: number, event: string, data: any, excludeClientId?: string) {
    if (excludeClientId) {
      this.server.to(`board:${userId}`).except(excludeClientId).emit(event, data);
    } else {
      this.server.to(`board:${userId}`).emit(event, data);
    }
  }

  @SubscribeMessage('lock:acquire')
  handleLockAcquire(@ConnectedSocket() client: Socket, @MessageBody() cardId: number) {
    if (!client.data.userId) return;

    const previousLockedCardId = this.userLocks.get(client.id);
    if (previousLockedCardId === cardId) {
      return;
    }

    this.userLocks.set(client.id, cardId);
    this.emitLocksSync(client.data.userId);
  }

  @SubscribeMessage('lock:release')
  handleLockRelease(@ConnectedSocket() client: Socket, @MessageBody() cardId: number) {
    if (!client.data.userId) return;

    const currentLockedCardId = this.userLocks.get(client.id);
    if (!currentLockedCardId || currentLockedCardId !== cardId) {
      return;
    }

    this.userLocks.delete(client.id);
    this.emitLocksSync(client.data.userId);
  }
}
