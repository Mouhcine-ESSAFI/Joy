import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
      : ['http://localhost:9002', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = 0;

  handleConnection(client: Socket) {
    this.connectedClients++;
    this.logger.log(`Client connected: ${client.id} (total: ${this.connectedClients})`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    this.logger.log(`Client disconnected: ${client.id} (total: ${this.connectedClients})`);
  }

  /** Broadcast that orders have changed for a store */
  emitOrdersUpdated(storeId: string) {
    this.server.emit('orders:updated', { storeId, timestamp: new Date().toISOString() });
  }

  /** Broadcast a new order event */
  emitNewOrder(orderId: string, orderNumber: string, storeId: string) {
    this.server.emit('orders:new', { orderId, orderNumber, storeId, timestamp: new Date().toISOString() });
  }

  /** Broadcast a single order update */
  emitOrderChanged(orderId: string, storeId: string) {
    this.server.emit('orders:changed', { orderId, storeId, timestamp: new Date().toISOString() });
  }
}
