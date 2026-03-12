import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws when user does not exist', async () => {
    usersService.findOne.mockResolvedValue(null);

    await expect(service.login('a@test.com', 'secret')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('throws when password does not match', async () => {
    usersService.findOne.mockResolvedValue({
      id: 1,
      email: 'a@test.com',
      password: 'hashed-password',
    });
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(service.login('a@test.com', 'secret')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('signs a jwt when credentials are valid', async () => {
    usersService.findOne.mockResolvedValue({
      id: 7,
      email: 'a@test.com',
      password: 'hashed-password',
    });
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jwtService.sign.mockReturnValue('jwt-token');

    await expect(service.login('a@test.com', 'secret')).resolves.toEqual({ access_token: 'jwt-token' });
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: 7, email: 'a@test.com' });
  });

  it('hashes the password before creating a user on register', async () => {
    jest.mocked(bcrypt.genSalt).mockResolvedValue('salt' as never);
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    usersService.create.mockResolvedValue({ id: 1, email: 'a@test.com' });
    const loginSpy = jest.spyOn(service, 'login').mockResolvedValue({ access_token: 'jwt-token' });

    await expect(service.register('a@test.com', 'secret', 'Alice')).resolves.toEqual({ access_token: 'jwt-token' });
    expect(usersService.create).toHaveBeenCalledWith({
      email: 'a@test.com',
      password: 'hashed-password',
      name: 'Alice',
    });
    expect(loginSpy).toHaveBeenCalledWith('a@test.com', 'secret');
  });
});
