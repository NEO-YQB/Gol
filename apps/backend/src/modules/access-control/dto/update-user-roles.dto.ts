import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsInt, Min } from 'class-validator';

export class UpdateUserRolesDto {
  @ApiProperty({
    type: [Number],
    example: [1, 3],
    description: 'آرایه کامل roleIdهایی که باید روی کاربر باقی بمانند',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds!: number[];
}
