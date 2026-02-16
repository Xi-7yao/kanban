import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CardsController } from './cards.controller'; // 👈 新增
import { ColumnsController } from './columns.controller'; // 👈 新增
import { ColumnsService } from './columns.service';
import { CardsService } from './cards.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [
    AppController,
    CardsController, // 👈 注册
    ColumnsController // 👈 注册
  ],
  providers: [
    PrismaService,
    ColumnsService,
    CardsService
  ],
})
export class AppModule { }