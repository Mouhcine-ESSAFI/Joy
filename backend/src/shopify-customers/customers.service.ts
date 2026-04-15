import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, In, DataSource } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CustomerFilterDto } from './dto/customer-filter.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters: CustomerFilterDto) {
    const page = parseInt(filters.page || '1', 10);
    const pageSize = Math.min(parseInt(filters.pageSize || '20', 10), 100);
    const skip = (page - 1) * pageSize;

    const baseWhere: FindOptionsWhere<Customer> = {};
    if (filters.storeId) baseWhere.storeId = filters.storeId;
    if (filters.country) baseWhere.country = filters.country;

    let where: FindOptionsWhere<Customer> | FindOptionsWhere<Customer>[] = baseWhere;

    if (filters.search) {
      const searchLike = Like(`%${filters.search}%`);
      where = [
        { ...baseWhere, firstName: searchLike },
        { ...baseWhere, lastName: searchLike },
        { ...baseWhere, email: searchLike },
        { ...baseWhere, phone: searchLike },
      ];
    }

    const [data, total] = await this.customersRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });

    // Compute real totalOrders and totalSpent from the orders table
    if (data.length > 0) {
      const emails = data
        .map((c) => c.email)
        .filter((e): e is string => !!e);

      if (emails.length > 0) {
        const stats: Array<{
          customerEmail: string;
          orderCount: string;
          totalSpent: string;
        }> = await this.dataSource
          .createQueryBuilder()
          .select('o."customerEmail"', 'customerEmail')
          .addSelect('COUNT(DISTINCT o."shopifyOrderId")', 'orderCount')
          .addSelect(
            'SUM(CASE WHEN o.status != \'Canceled\' THEN o."shopifyTotalAmount" ELSE 0 END)',
            'totalSpent',
          )
          .from('orders', 'o')
          .where('o."customerEmail" IN (:...emails)', { emails })
          .groupBy('o."customerEmail"')
          .getRawMany();

        const statsMap = new Map(
          stats.map((s) => [s.customerEmail.toLowerCase(), s]),
        );

        for (const customer of data) {
          const s = customer.email
            ? statsMap.get(customer.email.toLowerCase())
            : undefined;
          customer.totalOrders = s ? parseInt(s.orderCount, 10) : 0;
          customer.totalSpent = s
            ? parseFloat(s.totalSpent).toFixed(2)
            : '0.00';
        }
      }
    }

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string): Promise<Customer | null> {
    return this.customersRepository.findOne({ where: { id } });
  }

  async getStats() {
    const total = await this.customersRepository.count();
    const withEmail = await this.customersRepository.count({
      where: { email: Like('%@%') },
    });
    return { total, withEmail };
  }

  async upsertFromShopify(
    shopifyCustomer: {
      id: string | number;
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      orders_count?: number;
      total_spent?: string;
      default_address?: { country?: string; city?: string };
    },
    storeDomain: string,
    storeId: string,
  ): Promise<Customer> {
    const shopifyId = shopifyCustomer.id.toString();

    const existing = await this.customersRepository.findOne({
      where: { shopifyCustomerId: shopifyId, storeId },
    });

    const data: Partial<Customer> = {
      shopifyCustomerId: shopifyId,
      firstName: shopifyCustomer.first_name ?? undefined,
      lastName: shopifyCustomer.last_name ?? undefined,
      email: shopifyCustomer.email ?? undefined,
      phone: shopifyCustomer.phone ?? undefined,
      totalOrders: shopifyCustomer.orders_count ?? 0,
      totalSpent: shopifyCustomer.total_spent ?? '0',
      country: shopifyCustomer.default_address?.country ?? undefined,
      city: shopifyCustomer.default_address?.city ?? undefined,
      storeId,
      storeDomain,
    };

    if (existing) {
      await this.customersRepository.update(existing.id, data);
      this.logger.debug(`Updated customer ${shopifyId} for store ${storeId}`);
      return { ...existing, ...data } as Customer;
    }

    const customer = this.customersRepository.create(data);
    const saved = await this.customersRepository.save(customer);
    this.logger.debug(`Created customer ${shopifyId} for store ${storeId}`);
    return saved;
  }

  async upsertManyFromShopify(
    shopifyCustomers: Array<{
      id: string | number;
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      orders_count?: number;
      total_spent?: string;
      default_address?: { country?: string; city?: string };
    }>,
    storeDomain: string,
    storeId: string,
  ): Promise<void> {
    if (!shopifyCustomers.length) return;

    const shopifyIds = shopifyCustomers.map((c) => c.id.toString());
    const existing = await this.customersRepository.find({
      where: { shopifyCustomerId: In(shopifyIds), storeId },
    });
    const existingMap = new Map(existing.map((c) => [c.shopifyCustomerId, c]));

    const toUpdate: Customer[] = [];
    const toCreate: Partial<Customer>[] = [];

    for (const sc of shopifyCustomers) {
      const shopifyId = sc.id.toString();
      const data: Partial<Customer> = {
        shopifyCustomerId: shopifyId,
        firstName: sc.first_name ?? undefined,
        lastName: sc.last_name ?? undefined,
        email: sc.email ?? undefined,
        phone: sc.phone ?? undefined,
        totalOrders: sc.orders_count ?? 0,
        totalSpent: sc.total_spent ?? '0',
        country: sc.default_address?.country ?? undefined,
        city: sc.default_address?.city ?? undefined,
        storeId,
        storeDomain,
      };

      const existingCustomer = existingMap.get(shopifyId);
      if (existingCustomer) {
        toUpdate.push({ ...existingCustomer, ...data } as Customer);
      } else {
        toCreate.push(data);
      }
    }

    if (toUpdate.length) await this.customersRepository.save(toUpdate);
    if (toCreate.length) {
      await this.customersRepository.save(
        toCreate.map((d) => this.customersRepository.create(d)),
      );
    }

    this.logger.log(
      `Upserted ${shopifyCustomers.length} customers for store ${storeId} (${toCreate.length} new, ${toUpdate.length} updated)`,
    );
  }
}
