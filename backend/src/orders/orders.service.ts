import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity'; // ⭐ Import OrderStatus enum
import { OrderHistory, OrderHistoryType } from './entities/order-history.entity'; // ⭐ Add this
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { TourMappingsService } from '../tour-mappings/tour-mappings.service';
import { RoomTypeRulesService } from '../room-type-rules/room-type-rules.service';
import { NotificationsService } from '../notifications/notifications.service';

// Allowed sort fields whitelist (security: prevent SQL injection)
const ALLOWED_SORT_FIELDS = [
  'shopifyCreatedAt',
  'tourDate',
  'customerName',
  'status',
  'createdAt',
  'updatedAt',
  'pax',
  'lineItemPrice',
];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderHistory)
    private historyRepository: Repository<OrderHistory>,
    private tourMappingsService: TourMappingsService,
    private roomTypeRulesService: RoomTypeRulesService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const order = this.ordersRepository.create(createOrderDto);
    
    // ⭐ Auto-assign tour code from mapping
    if (order.storeId && order.tourTitle && !order.tourCode) {
      try {
        const mapping = await this.tourMappingsService.findByStoreAndTitle(
          order.storeId,
          order.tourTitle,
        );
        
        if (mapping && mapping.tourCode) {
          order.tourCode = mapping.tourCode;
        }
      } catch (error) {
        this.logger.warn(`Failed to auto-assign tour code: ${error.message}`);
      }
    }
    
    // ⭐ NEW: Auto-assign room type if not provided
    if (!order.roomType && order.campType && order.pax) {
      try {
        this.logger.debug(`Auto-assigning room type for campType="${order.campType}", pax=${order.pax}`);
        
        const matchingRule = await this.roomTypeRulesService.findMatchingRule(
          order.campType,
          order.pax,
        );
        
        if (matchingRule) {
          order.roomType = matchingRule.defaultRoomType;
          this.logger.debug(`Auto-assigned room type: "${order.roomType}" (rule: ${matchingRule.paxMin}-${matchingRule.paxMax} PAX)`);
        } else {
          this.logger.warn(`No matching room rule found for campType="${order.campType}", pax=${order.pax}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to auto-assign room type: ${error?.message}`);
      }
    }
    
    const saved = await this.ordersRepository.save(order);

    // Notify eligible users (Owner, Admin, Travel Agent) about the new order
    this.notificationsService
      .notifyNewOrder(saved.id, saved.shopifyOrderNumber)
      .catch((err) => this.logger.warn(`Push notification failed for order ${saved.shopifyOrderNumber}: ${err.message}`));

    return saved;
  }

  async findAll(
    params: {
      page: number;
      pageSize: number;
      storeId?: string;
      status?: string;
      shopifyOrderId?: string;
      tourType?: string;
      transport?: string;
      startDate?: string;
      endDate?: string;
      customerName?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
    user?: any,
  ) {
    const query = this.ordersRepository.createQueryBuilder('order');

    // ⭐ Filter by accessible stores for TravelAgent
    if (user?.role === 'Travel Agent') {
      if (!user.accessibleShopifyStores || user.accessibleShopifyStores.length === 0) {
        return {
          orders: [],
          total: 0,
          totalPages: 0,
          page: params.page,
          pageSize: params.pageSize,
        };
      }
      
      query.andWhere('order.storeId IN (:...stores)', {
        stores: user.accessibleShopifyStores,
      });
    }

    // ⭐ FIX: Only add filters if value is truthy and not "undefined" string
    if (params.storeId && params.storeId !== 'undefined') {
      query.andWhere('order.storeId = :storeId', {
        storeId: params.storeId,
      });
    }

    if (params.status && params.status !== 'undefined') {
      query.andWhere('order.status = :status', {
        status: params.status,
      });
    }

    if (params.shopifyOrderId && params.shopifyOrderId !== 'undefined') {
      query.andWhere('order.shopifyOrderId = :shopifyOrderId', {
        shopifyOrderId: params.shopifyOrderId,
      });
    }

    if (params.tourType && params.tourType !== 'undefined') {
      query.andWhere('order.tourType = :tourType', {
        tourType: params.tourType,
      });
    }

    if (params.transport && params.transport !== 'undefined') {
      query.andWhere('order.transport = :transport', {
        transport: params.transport,
      });
    }

    if (params.startDate && params.startDate !== 'undefined') {
      query.andWhere('order.tourDate >= :startDate', {
        startDate: params.startDate,
      });
    }

    if (params.endDate && params.endDate !== 'undefined') {
      query.andWhere('order.tourDate <= :endDate', {
        endDate: params.endDate,
      });
    }

    if (params.customerName && params.customerName !== 'undefined') {
      query.andWhere('LOWER(order.customerName) LIKE LOWER(:customerName)', {
        customerName: `%${params.customerName}%`,
      });
    }

    if (params.search && params.search !== 'undefined') {
      query.andWhere(
        `(
          LOWER(order.customerName) LIKE LOWER(:search) OR
          LOWER(order.customerEmail) LIKE LOWER(:search) OR
          LOWER(order.shopifyOrderNumber) LIKE LOWER(:search) OR
          LOWER(order.tourTitle) LIKE LOWER(:search) OR
          LOWER(order.customerPhone) LIKE LOWER(:search)
        )`,
        { search: `%${params.search}%` },
      );
    }

    const hasDateFilter =
      (params.startDate && params.startDate !== 'undefined') ||
      (params.endDate && params.endDate !== 'undefined');

    const sortBy =
      params.sortBy && ALLOWED_SORT_FIELDS.includes(params.sortBy)
        ? params.sortBy
        : hasDateFilter
          ? 'tourDate'
          : 'shopifyCreatedAt';

    const sortOrder =
      params.sortOrder
        ? params.sortOrder === 'ASC'
          ? 'ASC'
          : 'DESC'
        : hasDateFilter
          ? 'ASC'
          : 'DESC';

    query
      .orderBy(`order.${sortBy}`, sortOrder)
      .addOrderBy('order.createdAt', 'DESC')
      .addOrderBy('order.lineItemIndex', 'ASC')
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize);

    const [orders, total] = await query.getManyAndCount();

    return {
      orders,
      total,
      totalPages: Math.ceil(total / params.pageSize),
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async findOne(id: string, user?: any): Promise<Order> {
    // ⭐ Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      throw new BadRequestException(
        `Invalid order ID format. Expected UUID, got: ${id}`,
      );
    }

    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

      // ⭐ NEW: Check if TravelAgent has access to this order's store
  if (user?.role === 'Travel Agent') {
    if (
      !user.accessibleShopifyStores ||
      !user.accessibleShopifyStores.includes(order.storeId)
    ) {
      throw new ForbiddenException(
        `You don't have access to orders from store ${order.storeId}`,
      );
    }
  }

    return order;
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    userId?: string,
  ): Promise<Order> {
    const order = await this.findOne(id);

    // ⭐ NEW: Auto-change status from "New" to "Updated" on any edit
    if (order.status === OrderStatus.NEW && Object.keys(updateOrderDto).length > 0) {
      // Only auto-change if the update is NOT just setting status to something else
      if (!updateOrderDto.status || updateOrderDto.status === OrderStatus.NEW) {
        updateOrderDto.status = OrderStatus.UPDATED;
        this.logger.debug(`Auto-changing status New → Updated for order ${order.shopifyOrderNumber}`);
      }
    }

    // Track what changed
    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }> = [];

    // Check each field for changes
    const fieldsToTrack = [
      'status',
      'tourDate',
      'tourHour',
      'pax',
      'tourType',
      'campType',
      'roomType',
      'pickupLocation',
      'accommodationName',
      'transport',
      'note',
      'driverId',
      'driverNotes',
    ];

    for (const field of fieldsToTrack) {
      if (
        updateOrderDto[field] !== undefined &&
        order[field] !== updateOrderDto[field]
      ) {
        changes.push({
          field,
          oldValue: order[field],
          newValue: updateOrderDto[field],
        });
      }
    }

    // Apply updates
    Object.assign(order, updateOrderDto);
    const savedOrder = await this.ordersRepository.save(order);

    // Create history entries
    for (const change of changes) {
      if (change.field === 'status') {
        // Status change
        await this.historyRepository.save({
          orderId: order.id,
          type: OrderHistoryType.STATUS_CHANGE,
          userId,
          oldStatus: change.oldValue,
          newStatus: change.newValue,
        });
      } else if (change.field === 'driverId') {
        // Driver assignment/unassignment
        if (change.newValue && !change.oldValue) {
          // Assigned
          await this.historyRepository.save({
            orderId: order.id,
            type: OrderHistoryType.DRIVER_ASSIGNED,
            userId,
            driverId: change.newValue,
          });
        } else if (!change.newValue && change.oldValue) {
          // Unassigned
          await this.historyRepository.save({
            orderId: order.id,
            type: OrderHistoryType.DRIVER_UNASSIGNED,
            userId,
            driverId: change.oldValue,
          });
        } else {
          // Changed
          await this.historyRepository.save({
            orderId: order.id,
            type: OrderHistoryType.FIELD_UPDATED,
            userId,
            fieldName: 'driverId',
            oldValue: String(change.oldValue || ''),
            newValue: String(change.newValue || ''),
          });
        }
      } else {
        // Regular field update
        await this.historyRepository.save({
          orderId: order.id,
          type: OrderHistoryType.FIELD_UPDATED,
          userId,
          fieldName: change.field,
          oldValue: String(change.oldValue || ''),
          newValue: String(change.newValue || ''),
        });
      }
    }

    return savedOrder;
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOne(id);
    await this.ordersRepository.remove(order);
  }

  // ⭐ NEW: Add note to order
  async addNote(
    orderId: string,
    note: string,
    userId: string,
  ): Promise<OrderHistory> {
    const order = await this.findOne(orderId);

    const historyEntry = this.historyRepository.create({
      orderId: order.id,
      type: OrderHistoryType.NOTE_ADDED,
      userId,
      note,
    });

    return await this.historyRepository.save(historyEntry);
  }

  // ⭐ NEW: Get order history
  async getHistory(orderId: string): Promise<OrderHistory[]> {
    const order = await this.findOne(orderId);

    return await this.historyRepository.find({
      where: { orderId: order.id },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  // ⭐ NEW: Track supplement added (call this from supplements service)
  async trackSupplementAdded(
    orderId: string,
    supplementId: string,
    label: string,
    amount: number,
    userId: string,
  ): Promise<void> {
    await this.historyRepository.save({
      orderId,
      type: OrderHistoryType.SUPPLEMENT_ADDED,
      userId,
      supplementId,
      supplementLabel: label,
      supplementAmount: amount,
    });
  }

  // ⭐ NEW: Track supplement removed (call this from supplements service)
  async trackSupplementRemoved(
    orderId: string,
    supplementId: string,
    label: string,
    amount: number,
    userId: string,
  ): Promise<void> {
    await this.historyRepository.save({
      orderId,
      type: OrderHistoryType.SUPPLEMENT_REMOVED,
      userId,
      supplementId,
      supplementLabel: label,
      supplementAmount: amount,
    });
  }
}