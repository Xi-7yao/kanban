// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service'; // 👈 引入 Prisma

@Module({
  providers: [UsersService, PrismaService], // 👈 注册 Prisma
  exports: [UsersService], // 👈 导出，给 AuthModule 用
})
export class UsersModule { }