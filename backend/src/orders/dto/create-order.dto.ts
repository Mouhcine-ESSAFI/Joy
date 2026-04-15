import {
  IsString,
  IsEmail,
  IsInt,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  IsObject,
  IsUUID,
  Min,
} from 'class-validator';
import {
  OrderStatus,
  TourType,
  PaymentStatus,
  FinancialStatus,
} from '../entities/order.entity';

export class CreateOrderDto {
  // Shopify Information
  @IsString()
  shopifyOrderId: string;

  @IsString()
  shopifyOrderNumber: string;

  @IsString()
  shopifyLineItemId: string;

  @IsInt()
  @IsOptional()
  lineItemIndex?: number;

  @IsString()
  storeId: string; // 'EN', 'ES', 'FR'

  // Customer Information
  @IsString()
  customerName: string;

  @IsEmail()
  customerEmail: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  shopifyCustomerId?: string;

  // Tour Details
  @IsDateString()
  tourDate: string; // 'YYYY-MM-DD'

  @IsString()
  @IsOptional()
  tourHour?: string;

  @IsInt()
  @Min(1)
  pax: number;

  @IsString()
  @IsOptional()
  tourCode?: string;

  @IsString()
  tourTitle: string;

  @IsEnum(TourType)
  @IsOptional()
  tourType?: TourType;

  @IsString()
  @IsOptional()
  campType?: string; // Changed from enum to string

  @IsString()
  @IsOptional()
  roomType?: string;

  @IsString()
  @IsOptional()
  pickupLocation?: string;

  @IsString()
  @IsOptional()
  accommodationName?: string;

  // Status
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  // Payment Tracking
  @IsNumber()
  @Min(0)
  lineItemPrice: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  lineItemDiscount?: number;

  @IsNumber()
  @Min(0)
  shopifyTotalAmount: number;

  @IsNumber()
  @Min(0)
  originalTotalAmount: number;

  @IsNumber()
  @Min(0)
  depositAmount: number;

  @IsNumber()
  @Min(0)
  balanceAmount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @IsEnum(FinancialStatus)
  @IsOptional()
  financialStatus?: FinancialStatus;

  // Logistics
  @IsString()
  @IsOptional()
  transport?: string;

  @IsString()
  @IsOptional()
  note?: string;

  // Driver Assignment
  @IsUUID()
  @IsOptional()
  driverId?: string;

  @IsString()
  @IsOptional()
  driverNotes?: string;

  // Raw Data
  @IsObject()
  @IsOptional()
  lineItemProperties?: Record<string, any>;

  @IsObject()
  @IsOptional()
  shopifyMetadata?: Record<string, any>;

  @IsArray()
  @IsOptional()
  tags?: string[];
}