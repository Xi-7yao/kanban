import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Request } from 'express';

interface JwtTokenPayload {
  sub: number;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      // JWT is stored in an HttpOnly cookie instead of an Authorization header.
      jwtFromRequest: (req: Request) => req?.cookies?.['access_token'] || null,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtTokenPayload): Promise<JwtPayload> {
    return { userId: payload.sub, email: payload.email };
  }
}
