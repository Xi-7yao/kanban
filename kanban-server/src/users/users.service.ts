import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    // 🔎 通过邮箱查找用户 (登录用)
    async findOne(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    // 📝 创建新用户 (注册用)
    async create(data: Prisma.UserCreateInput) {
        return this.prisma.user.create({
            data,
        });
    }
}