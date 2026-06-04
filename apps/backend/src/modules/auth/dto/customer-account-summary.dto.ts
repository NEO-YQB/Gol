import { ApiProperty } from '@nestjs/swagger';

export class CustomerAccountSummaryDto {
  @ApiProperty()
  profile!: {
    id: number;
    phoneNumber: string;
    fullName: string | null;
    createdAt: Date;
  };

  @ApiProperty()
  stats!: {
    orderCount: number;
    activeOrderCount: number;
    deliveredOrderCount: number;
    addressCount: number;
    defaultAddressTitle: string | null;
    latestOrderStatus: string | null;
  };

  @ApiProperty()
  recentOrders!: Array<{
    id: number;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    createdAt: Date;
    storeName: string | null;
    itemCount: number;
  }>;

  @ApiProperty()
  addresses!: Array<{
    id: number;
    title: string;
    city: string;
    address: string;
    isDefault: boolean;
  }>;
}
