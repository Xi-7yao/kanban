import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    login: jest.fn(),
    register: jest.fn(),
  };

  const createResponse = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('issues a csrf cookie', () => {
    const res = createResponse();

    const result = controller.issueCsrfToken(res as never);

    expect(result).toEqual({ message: 'CSRF token issued' });
    expect(res.cookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: false, sameSite: 'strict', path: '/' }),
    );
  });

  it('sets auth cookies on login', async () => {
    authService.login.mockResolvedValue({ access_token: 'jwt-token' });
    const res = createResponse();

    const result = await controller.login({ email: 'a@test.com', password: 'secret' }, res as never);

    expect(result).toEqual({ message: 'Login successful' });
    expect(authService.login).toHaveBeenCalledWith('a@test.com', 'secret');
    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'jwt-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: false, sameSite: 'strict', path: '/' }),
    );
  });

  it('sets auth cookies on register', async () => {
    authService.register.mockResolvedValue({ access_token: 'jwt-token' });
    const res = createResponse();

    const result = await controller.register(
      { email: 'a@test.com', password: 'secret', name: 'Alice' },
      res as never,
    );

    expect(result).toEqual({ message: 'Registration successful' });
    expect(authService.register).toHaveBeenCalledWith('a@test.com', 'secret', 'Alice');
    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'jwt-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: false, sameSite: 'strict', path: '/' }),
    );
  });

  it('clears auth cookies on logout', async () => {
    const res = createResponse();

    const result = await controller.logout(res as never);

    expect(result).toEqual({ message: 'Logout successful' });
    expect(res.clearCookie).toHaveBeenCalledWith('access_token');
    expect(res.clearCookie).toHaveBeenCalledWith('csrf_token');
  });
});
