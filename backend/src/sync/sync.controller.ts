import { Controller, Post, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('run')
  async run() {
    this.syncService.syncAllActiveStores();
    return { success: true, message: 'Sync started in background' };
  }

  @Post('fix-phones')
  async fixPhones() {
    return this.syncService.fixPhoneNumbers();
  }
}
