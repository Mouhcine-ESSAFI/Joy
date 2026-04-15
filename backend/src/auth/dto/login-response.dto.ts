export class LoginResponseDto {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    accessibleShopifyStores: string[];
    permissions: Record<string, any>;
  };
}