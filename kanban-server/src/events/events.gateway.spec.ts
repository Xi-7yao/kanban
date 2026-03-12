import { EventsGateway } from './events.gateway';

describe('EventsGateway', () => {
  const roomEmit = jest.fn();
  const server = {
    to: jest.fn(() => ({
      emit: roomEmit,
    })),
  };

  const jwtService = {
    verify: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };

  let gateway: EventsGateway;

  const createClient = (id: string, cookie = 'access_token=valid-token') => ({
    id,
    data: {} as { userId?: number },
    handshake: {
      headers: {
        cookie,
      },
    },
    join: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    roomEmit.mockReset();
    server.to.mockClear();
    jwtService.verify.mockReturnValue({ sub: 1 });
    configService.get.mockReturnValue('secret');

    gateway = new EventsGateway(jwtService as never, configService as never);
    (gateway as unknown as { server: typeof server }).server = server as never;
  });

  it('emits existing active locks to a newly connected client', async () => {
    const existingSocketId = 'socket-existing';
    (gateway as unknown as { userLocks: Map<string, number> }).userLocks.set(existingSocketId, 42);
    (gateway as unknown as { socketUsers: Map<string, number> }).socketUsers.set(existingSocketId, 1);

    const client = createClient('socket-new');

    await gateway.handleConnection(client as never);

    expect(client.join).toHaveBeenCalledWith('board:1');
    expect(client.emit).toHaveBeenCalledWith('locks:sync', {
      cardIds: [42],
    });
  });

  it('broadcasts the full active lock snapshot after acquiring a lock', () => {
    const client = createClient('socket-a');
    client.data.userId = 1;
    (gateway as unknown as { socketUsers: Map<string, number> }).socketUsers.set(client.id, 1);

    gateway.handleLockAcquire(client as never, 42);

    expect(server.to).toHaveBeenCalledWith('board:1');
    expect(roomEmit).toHaveBeenCalledWith('locks:sync', {
      cardIds: [42],
    });
  });

  it('keeps other active locks in the snapshot after releasing one lock', () => {
    const clientA = createClient('socket-a');
    clientA.data.userId = 1;
    const clientB = createClient('socket-b');
    clientB.data.userId = 1;

    (gateway as unknown as { userLocks: Map<string, number> }).userLocks.set(clientA.id, 42);
    (gateway as unknown as { userLocks: Map<string, number> }).userLocks.set(clientB.id, 7);
    (gateway as unknown as { socketUsers: Map<string, number> }).socketUsers.set(clientA.id, 1);
    (gateway as unknown as { socketUsers: Map<string, number> }).socketUsers.set(clientB.id, 1);

    gateway.handleLockRelease(clientA as never, 42);

    expect(roomEmit).toHaveBeenCalledWith('locks:sync', {
      cardIds: [7],
    });
  });
});
