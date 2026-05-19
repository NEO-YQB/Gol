import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, Min } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: 'آرایه کامل permissionIdهایی که باید به role متصل باشند',
  })
  @IsArray()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  @Min(1, { each: true })
  permissionIds!: number[];
}
