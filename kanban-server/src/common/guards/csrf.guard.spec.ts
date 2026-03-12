import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  const createContext = (request: Record<string, unknown>) => ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as ExecutionContext;

  it('allows safe methods without a csrf token', () => {
    expect(guard.canActivate(createContext({ method: 'GET' }))).toBe(true);
    expect(guard.canActivate(createContext({ method: 'OPTIONS' }))).toBe(true);
  });

  it('rejects write requests without matching tokens', () => {
    expect(() =>
      guard.canActivate(
        createContext({
          method: 'POST',
          cookies: { csrf_token: 'cookie-token' },
          headers: { 'x-csrf-token': 'header-token' },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows write requests when cookie and header tokens match', () => {
    expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          cookies: { csrf_token: 'same-token' },
          headers: { 'x-csrf-token': 'same-token' },
        }),
      ),
    ).toBe(true);
  });
});
