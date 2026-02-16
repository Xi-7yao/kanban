import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { CardsController } from './cards.controller';
import { ColumnsController } from './columns.controller';
import { ColumnsService } from './columns.service';
import { CardsService } from './cards.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
  ],
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