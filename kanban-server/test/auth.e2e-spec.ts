import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureTestApp } from './configure-test-app';

function extractCookieValue(setCookie: string[] | undefined, cookieName: string): string | undefined {
  if (!setCookie) {
    return undefined;
  }

  const cookie = setCookie.find((entry) => entry.startsWith(`${cookieName}=`));
  return cookie?.split(';')[0]?.split('=')[1];
}

describe('Auth flow (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureTestApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects registration without a csrf token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `no-csrf-${Date.now()}@example.com`,
        password: 'secret123',
        name: 'No CSRF',
      })
      .expect(403);

    expect(response.body.message).toBe('CSRF validation failed.');
  });

  it('supports csrf bootstrap, registration, me, and logout', async () => {
    const agent = request.agent(app.getHttpServer());

    const csrfResponse = await request(app.getHttpServer())
      .get('/auth/csrf')
      .expect(200);

    const initialCsrfToken = extractCookieValue(csrfResponse.headers['set-cookie'], 'csrf_token');
    expect(initialCsrfToken).toBeDefined();
    const initialCsrfCookie = csrfResponse.headers['set-cookie']
      ?.find((entry) => entry.startsWith('csrf_token='))
      ?.split(';')[0];
    expect(initialCsrfCookie).toBeDefined();

    const email = `kanban-e2e-${Date.now()}@example.com`;
    const registerResponse = await agent
      .post('/auth/register')
      .set('Cookie', initialCsrfCookie as string)
      .set('X-CSRF-Token', initialCsrfToken as string)
      .send({
        email,
        password: 'secret123',
        name: 'Kanban E2E',
      })
      .expect(201);

    expect(registerResponse.body.message).toBe('Registration successful');

    const refreshedCsrfToken = extractCookieValue(registerResponse.headers['set-cookie'], 'csrf_token');
    expect(refreshedCsrfToken).toBeDefined();

    const meResponse = await agent
      .get('/auth/me')
      .expect(200);

    expect(meResponse.body).toMatchObject({
      email,
    });
    expect(typeof meResponse.body.userId).toBe('number');

    await agent
      .post('/auth/logout')
      .set('X-CSRF-Token', refreshedCsrfToken as string)
      .expect(201);

    await agent
      .get('/auth/me')
      .expect(401);
  });
});
