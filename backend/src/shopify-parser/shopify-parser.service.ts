import { Injectable } from '@nestjs/common';
import { TourType } from '../orders/entities/order.entity';

interface ParsedLineItem {
  shopifyLineItemId: string;
  lineItemIndex: number;
  tourTitle: string;
  variantTitle: string;
  lineItemPrice: number;
  lineItemDiscount: number;
  quantity: number;
  properties: string;
  productType: string;
  
  // Parsed fields
  tourDate?: Date;
  tourHour?: string;
  tourType?: TourType;
  campType?: string;
  pickupLocation?: string;
  pax?: number;
}

interface ParsedOrder {
  shopifyOrderId: string;
  shopifyOrderNumber: string;
  storeId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  tags: string[];
  note?: string;
  
  // Payment info (shared across all line items)
  shopifyTotalAmount: number;
  originalTotalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  currency: string;
  
  // Shopify statuses
  financialStatus: string;
  fulfillmentStatus?: string;
  
  // Line items (each becomes a separate Order)
  lineItems: ParsedLineItem[];
}

@Injectable()
export class ShopifyParserService {
  /**
   * Parse Shopify JSON order (from API) to structured order data
   */
  parseShopifyOrderJSON(shopifyOrder: any, storeId: string): ParsedOrder {
    // Extract customer info
    const billing = shopifyOrder.billing_address || {};
    const shipping = shopifyOrder.shipping_address || {};
    const customer = shopifyOrder.customer || {};

    const customerName = billing.name || shipping.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
    const customerEmail = shopifyOrder.email || customer.email || shopifyOrder.contact_email;
    const customerPhone = billing.phone || customer.phone || shipping.phone;

    // Extract payment info
    const subtotal = parseFloat(shopifyOrder.subtotal_price || '0');
    const totalDiscount = parseFloat(shopifyOrder.total_discounts || '0');
    const shopifyTotal = parseFloat(shopifyOrder.total_price || '0');
    const originalTotal = subtotal;
    const deposit = shopifyTotal;
    const balance = originalTotal - deposit;

    // Extract tags
    const tags = shopifyOrder.tags ? shopifyOrder.tags.split(',').map((t: string) => t.trim()) : [];

    // Parse line items
    const lineItems = shopifyOrder.line_items.map((item: any, index: number) => {
      const properties = item.properties || [];
      const propertiesText = properties.map((p: any) => `${p.name}: ${p.value}`).join('\n');
      const parsedProperties = this.parsePropertiesText(propertiesText);
      
      // Parse variant title for PAX and camp type
      const variantData = this.parseVariantTitle(item.variant_title || '');

      return {
        shopifyLineItemId: item.id?.toString() || `${shopifyOrder.id}-${index}`,
        lineItemIndex: index,
        tourTitle: item.title || item.name,
        variantTitle: item.variant_title || '',
        lineItemPrice: parseFloat(item.price || '0'),
        lineItemDiscount: parseFloat(item.total_discount || '0'),
        quantity: item.quantity || 1,
        properties: propertiesText,
        productType: item.product_type || '',
        tourDate: parsedProperties.tourDate,
        tourHour: parsedProperties.tourHour,
        tourType: this.mapTourType(parsedProperties.tourType || item.product_type),
        campType: variantData.campType,
        pickupLocation: parsedProperties.pickupLocation,
        pax: variantData.pax || item.quantity || 1,
      };
    });

    return {
      shopifyOrderId: shopifyOrder.id?.toString(),
      shopifyOrderNumber: shopifyOrder.name?.toString() || shopifyOrder.name,
      storeId,
      customerName,
      customerEmail,
      customerPhone,
      tags,
      note: shopifyOrder.note,
      shopifyTotalAmount: deposit,
      originalTotalAmount: originalTotal,
      depositAmount: deposit,
      balanceAmount: balance,
      currency: shopifyOrder.currency || 'EUR',
      financialStatus: shopifyOrder.financial_status,
      fulfillmentStatus: shopifyOrder.fulfillment_status,
      lineItems,
    };
  }

  /**
   * Parse variant title to extract PAX and camp type
   * Examples:
   * "2 / Campamento Superior (+55€)" → pax: 2, campType: "Campamento Superior (+55€)"
   * "1" → pax: 1, campType: null
   * "Hasta 4 personas / Medio día con Guía" → pax: null, campType: "Hasta 4 personas / Medio día con Guía"
   */
  private parseVariantTitle(variantTitle: string): { pax?: number; campType?: string } {
    if (!variantTitle || variantTitle.trim() === '') {
      return {};
    }

    const trimmed = variantTitle.trim();

    // Check if it contains "/" separator
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/').map(p => p.trim());
      
      // First part - check if it's a number (PAX)
      const firstPart = parts[0];
      const paxMatch = firstPart.match(/^\d+$/);
      
      if (paxMatch) {
        // First part is a pure number → PAX
        // Second part is camp type
        return {
          pax: parseInt(firstPart),
          campType: parts.slice(1).join(' / ').trim() || undefined,
        };
      } else {
        // First part is not a pure number → entire variant is camp type
        return {
          campType: trimmed,
        };
      }
    } else {
      // No "/" separator - check if it's a pure number
      const paxMatch = trimmed.match(/^\d+$/);
      
      if (paxMatch) {
        // It's a pure number → PAX only
        return {
          pax: parseInt(trimmed),
        };
      } else {
        // It's text → camp type only
        return {
          campType: trimmed,
        };
      }
    }
  }

  /**
   * Parse properties text (works for both EN and ES)
   */
  private parsePropertiesText(properties: string): any {
    const result: any = {};
    const lines = properties.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      const lower = line.toLowerCase();

      // Tour type (EN/ES)
      if (lower.includes('tour type:') || lower.includes('tipo del tour:')) {
        result.tourType = line.split(':', 2)[1]?.trim();
      }

      // Date (EN/ES)
      if (lower.includes('arrival date:') || lower.includes('fecha')) {
        const dateStr = line.split(':', 2)[1]?.trim();
        if (dateStr) {
          result.tourDate = this.parseDate(dateStr);
        }
      }

      // Hour (ES specific: "16h")
      if (lower.includes('hora:')) {
        const hourStr = line.split(':', 2)[1]?.trim();
        if (hourStr) {
          result.tourHour = hourStr.replace('h', ':00');
        }
      }

      // Pickup location (EN/ES)
      if (lower.includes('pickup address:') || lower.includes('recogida:') || lower.includes('dirección de recogida:')) {
        result.pickupLocation = line.split(':', 2)[1]?.trim();
      }
    }

    return result;
  }

  /**
   * Parse date in multiple formats
   */
  private parseDate(dateStr: string): Date | undefined {
    // Try format: "12 Feb, 2026" or "23 abr, 2026"
    const format1 = /(\d{1,2})\s+(\w{3}),?\s+(\d{4})/i;
    const match1 = dateStr.match(format1);
    if (match1) {
      const day = parseInt(match1[1]);
      const month = this.monthToNumber(match1[2]);
      const year = parseInt(match1[3]);
      if (month !== -1) {
        return new Date(Date.UTC(year, month, day));
      }
    }

    // Try format: "23/06/2025"
    const format2 = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    const match2 = dateStr.match(format2);
    if (match2) {
      const day = parseInt(match2[1]);
      const month = parseInt(match2[2]) - 1; // Month is 0-indexed
      const year = parseInt(match2[3]);
      return new Date(Date.UTC(year, month, day));
    }

    return undefined;
  }

  private monthToNumber(monthStr: string): number {
    const months: Record<string, number> = {
      'jan': 0, 'ene': 0, 'january': 0, 'enero': 0,
      'feb': 1, 'february': 1, 'febrero': 1,
      'mar': 2, 'march': 2, 'marzo': 2,
      'apr': 3, 'abr': 3, 'april': 3, 'abril': 3,
      'may': 4, 'mayo': 4,
      'jun': 5, 'june': 5, 'junio': 5,
      'jul': 6, 'july': 6, 'julio': 6,
      'aug': 7, 'ago': 7, 'august': 7, 'agosto': 7,
      'sep': 8, 'september': 8, 'septiembre': 8,
      'oct': 9, 'october': 9, 'octubre': 9,
      'nov': 10, 'november': 10, 'noviembre': 10,
      'dec': 11, 'dic': 11, 'december': 11, 'diciembre': 11,
    };

    return months[monthStr.toLowerCase()] ?? -1;
  }

  private mapTourType(typeStr: string | undefined): TourType | undefined {
    if (!typeStr) return undefined;
    const lower = typeStr.toLowerCase();
    if (lower.includes('private') || lower.includes('privado')) return TourType.PRIVATE;
    if (lower.includes('shared') || lower.includes('compartido')) return TourType.SHARED;
    return undefined;
  }

  // Keep existing CSV methods for backward compatibility
  parseShopifyOrder(csvRow: any): ParsedOrder {
    return {} as ParsedOrder;
  }
}
