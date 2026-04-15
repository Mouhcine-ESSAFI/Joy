import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../../users/entities/user.entity';

export async function createOwnerUser(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  // Check if owner already exists
  const existingOwner = await userRepository.findOne({
    where: { email: 'owner@joymorocco.com' },
  });

  if (existingOwner) {
    console.log('✅ Owner user already exists');
    return existingOwner;
  }

  // Create owner user
  const passwordHash = await bcrypt.hash('owner123456', 10);

  const owner = userRepository.create({
    name: 'System Owner',
    email: 'owner@joymorocco.com',
    passwordHash,
    role: UserRole.OWNER,
    status: UserStatus.ACTIVE,
    accessibleShopifyStores: [], // Access to all stores
    permissions: {}, // Full permissions by role
  });

  await userRepository.save(owner);

  console.log('✅ Owner user created successfully');
  console.log('📧 Email: owner@joymorocco.com');
  console.log('🔑 Password: owner123456');
  
  return owner;
}