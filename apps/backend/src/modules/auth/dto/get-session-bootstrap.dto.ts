import { ApiProperty } from '@nestjs/swagger';

class SessionBootstrapPermissionDto {
  @ApiProperty({ example: 'read' })
  action!: string;

  @ApiProperty({ example: 'Article' })
  subject!: string;
}

export class SessionBootstrapDto {
  @ApiProperty({ type: [String], example: ['SEO_MANAGER'] })
  roles!: string[];

  @ApiProperty({ type: [SessionBootstrapPermissionDto] })
  effectivePermissions!: SessionBootstrapPermissionDto[];
}
