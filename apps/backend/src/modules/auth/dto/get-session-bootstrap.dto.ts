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

export class SessionBootstrapDto {
  @ApiProperty({ type: [String], example: ['SEO_MANAGER'] })
  roles!: string[];

  @ApiProperty({ type: [SessionBootstrapPermissionDto] })
  effectivePermissions!: SessionBootstrapPermissionDto[];

  @ApiProperty({ type: SessionBootstrapVendorOnboardingDto, required: false, nullable: true })
  vendorOnboarding?: SessionBootstrapVendorOnboardingDto | null;
}
