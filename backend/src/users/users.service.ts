import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Enforce single Owner rule
    if (createUserDto.role === UserRole.OWNER) {
      const existingOwner = await this.usersRepository.findOne({ where: { role: UserRole.OWNER } });
      if (existingOwner) {
        throw new ConflictException('An Owner already exists. Only one Owner is allowed.');
      }
    }

    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user with hashed password (map password to passwordHash)
    const user = this.usersRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      passwordHash: hashedPassword, // ← This is the key line!
      role: createUserDto.role,
      status: createUserDto.status,
      accessibleShopifyStores: createUserDto.accessibleShopifyStores,
      permissions: createUserDto.permissions,
    });

    return await this.usersRepository.save(user);
  }

  async findAll() {
    return await this.usersRepository.find();
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string) {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    // If changing role to Owner, enforce single owner rule
    if (updateUserDto.role === UserRole.OWNER && user.role !== UserRole.OWNER) {
      const existingOwner = await this.usersRepository.findOne({ where: { role: UserRole.OWNER } });
      if (existingOwner && existingOwner.id !== id) {
        throw new ConflictException('An Owner already exists. Only one Owner is allowed.');
      }
    }

    // Prevent changing the Owner's role away from Owner (must stay Owner)
    if (user.role === UserRole.OWNER && updateUserDto.role && updateUserDto.role !== UserRole.OWNER) {
      throw new ForbiddenException('Cannot change the Owner role. The Owner role is permanent.');
    }

    // If password is being updated, hash it
    if (updateUserDto.password) {
      const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
      updateUserDto['passwordHash'] = hashedPassword;
      delete updateUserDto.password; // Remove plain password
    }

    Object.assign(user, updateUserDto);
    return await this.usersRepository.save(user);
  }

  async updateOwnerProfile(ownerId: string, updateDto: Pick<UpdateUserDto, 'name' | 'email' | 'password'>) {
    return this.update(ownerId, updateDto);
  }

  async getOwner(): Promise<User | null> {
    return this.usersRepository.findOne({ where: { role: UserRole.OWNER } });
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    return { message: `User ${id} deleted successfully` };
  }

  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
  await this.usersRepository.update({ id: userId }, { refreshTokenHash });
}

}