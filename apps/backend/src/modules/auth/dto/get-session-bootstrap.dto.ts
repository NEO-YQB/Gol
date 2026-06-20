import { ApiProperty } from '@nestjs/swagger';

class SessionBootstrapPermissionDto {
  @ApiProperty({ example: 'read' })
  action!: string;

  @ApiProperty({ example: 'Article' })
  subject!: string;
}

class SessionBootstrapVendorOnboardingDto {
  @ApiProperty({ example: 'SUBMITTED' })
  applicationStatus!: string;

  @ApiProperty({ example: 'DRAFT' })
  productStatus!: string;

  @ApiProperty({ example: null, nullable: true })
  storeActivatedAt!: string | null;
}

class SessionBootstrapStoreDto {
  @ApiProperty({ example: 17 })
  id!: number;

  @ApiProperty({ example: true })
  isVerified!: boolean;

  @ApiProperty({ example: 'گلخانه بهار' })
  name!: string;

  @ApiProperty({ example: 'bahar-flower-shop' })
  slug!: string;
}

export class SessionBootstrapDto {
  @ApiProperty({ example: 'مریم احمدی', nullable: true, required: false })
  fullName?: string | null;

  @ApiProperty({ type: [String], example: ['SEO_MANAGER'] })
  roles!: string[];

  @ApiProperty({ type: [SessionBootstrapPermissionDto] })
  effectivePermissions!: SessionBootstrapPermissionDto[];

  @ApiProperty({ type: SessionBootstrapVendorOnboardingDto, required: false, nullable: true })
  vendorOnboarding?: SessionBootstrapVendorOnboardingDto | null;

  @ApiProperty({ type: SessionBootstrapStoreDto, required: false, nullable: true })
  store?: SessionBootstrapStoreDto | null;
}
