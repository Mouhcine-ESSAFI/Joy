import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class StoreAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Owner and Admin can access all stores
    if (user.role === UserRole.OWNER || user.role === UserRole.ADMIN) {
      return true;
    }

    // Get storeId from query params or body
    const storeId = request.query?.storeId || request.body?.storeId;

    if (!storeId) {
      return true;
    }

    // Check if user has access to this store
    const hasAccess = user.accessibleShopifyStores?.includes(storeId);

    if (!hasAccess) {
      throw new ForbiddenException(
        `You don't have access to store: ${storeId}`,
      );
    }

    return true;
  }
}