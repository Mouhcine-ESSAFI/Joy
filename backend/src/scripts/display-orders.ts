import { DataSource, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderHistory } from '../orders/entities/order-history.entity'; // ⭐ Add this
import { OrdersService } from '../orders/orders.service';
import { TourMappingsService } from '../tour-mappings/tour-mappings.service'; // ⭐ Add this

async function displayOrders() {
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'joy_morocco',
    entities: [Order, OrderHistory], // ⭐ Add OrderHistory
    synchronize: false,
  });

  await AppDataSource.initialize();

  const ordersRepository: Repository<Order> =
    AppDataSource.getRepository(Order);
  const historyRepository: Repository<OrderHistory> = // ⭐ Add this
    AppDataSource.getRepository(OrderHistory);

  // const ordersService = new OrdersService(ordersRepository, historyRepository, new TourMappingsService()); // ⭐ Pass both

  // Rest of your code...
}