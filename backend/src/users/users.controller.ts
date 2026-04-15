import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN) // Owner and Admin can create users
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN) // Owner and Admin can list all users
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  getProfile(@CurrentUser() user) {
    return user;
  }

  // Owner-only: get the owner profile (visible to everyone authenticated, editable only by Owner)
  @Get('owner-profile')
  async getOwnerProfile() {
    const owner = await this.usersService.getOwner();
    if (!owner) throw new NotFoundException('No owner account found');
    // Strip sensitive fields
    const { passwordHash, refreshTokenHash, ...safe } = owner as any;
    return safe;
  }

  // Owner-only: update own profile (name, email, password)
  @Patch('owner-profile')
  @Roles(UserRole.OWNER)
  async updateOwnerProfile(
    @CurrentUser() user,
    @Body() body: { name?: string; email?: string; password?: string },
  ) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only the Owner can update the owner profile');
    }
    return this.usersService.updateOwnerProfile(user.id, body);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user) {
    // Owner and Admin can view any profile, others only their own
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.ADMIN &&
      user.id !== id
    ) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN) // Owner and Admin can update users
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN) // Owner and Admin can delete users
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}