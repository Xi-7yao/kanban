import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
// 1. 引入 Swagger 相关模块
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, 
    transform: true, 
    forbidNonWhitelisted: true,
  }));

  // 2. ✅ 配置 Swagger
  const config = new DocumentBuilder()
    .setTitle('看板系统 API') // 文档标题
    .setDescription('这是一个基于 NestJS 和 Prisma 的全栈看板项目 API 文档') // 描述
    .setVersion('1.0') // 版本
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // 访问路径为 /api

  // 3. ✅ 开启 CORS (跨域资源共享)
  // 如果不加这行，以后你的前端(React/Vue)运行在 localhost:5173 时，
  // 访问 localhost:3000 的后端会被浏览器拦截。
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
