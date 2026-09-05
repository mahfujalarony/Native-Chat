import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { User } from './schemas/user.schema.js';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    create(
        @Body('name') name: string,
        @Body('email') email: string,
        @Body('password') password: string
    ) {
        return this.usersService.create({ name, email, password } as User);
    }
    
    @Get()
    async findAll(
        @Query('limit') limit?: string,
        @Query('page') page?: string,
        @Query('search') search?: string,
        @Query('excludeUserId') excludeUserId?: string
    ) {
        const result = await this.usersService.findAll(
            excludeUserId,
            limit ? parseInt(limit, 10) : 20,
            page ? parseInt(page, 10) : 1,
            search
        );
        return {
            users: result.users.map((u: any) => ({
                id: u._id?.toString() || u.id,
                name: u.name,
                email: u.email,
                bio: (u as any).bio || '',
            })),
            total: result.total,
            hasMore: result.hasMore,
        };
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body('name') name?: string,
        @Body('email') email?: string,
        @Body('bio') bio?: string
    ) {
        const updated = await this.usersService.updateProfile(id, { name, email, bio });
        return {
            id: updated ? updated._id.toString() : id,
            name: updated?.name || name,
            email: updated?.email || email,
            bio: (updated as any)?.bio || bio || '',
        };
    }
}

