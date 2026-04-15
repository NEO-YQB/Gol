import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  UseGuards,
  UploadedFiles, 
  ParseFilePipe, 
  MaxFileSizeValidator, 
  FileTypeValidator,
  BadRequestException,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'; // ApiBearerAuth و ApiResponse اضافه شد

export const multerOptions = {
  storage: diskStorage({
    destination: './uploads/products',
    filename: (req, file, callback) => {
      const uniqueSuffix = uuidv4();
      const fileExtName = extname(file.originalname);
      callback(null, `${uniqueSuffix}${fileExtName}`);
    },
  }),
};

@ApiTags('Files')
@Controller('files')
export class FilesController {

  // ۱. آپلود تصویر محصول تکی با اعتبارسنجی و محدودیت دسترسی (بهینه شده)
  @Post('upload-product-image')
  @HttpCode(HttpStatus.CREATED) 
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR') 
  @UseInterceptors(FileInterceptor('file', multerOptions)) 
  @ApiOperation({ summary: 'آپلود تصویر تکی محصول' }) // اضافه شد
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: 'فایل با موفقیت آپلود شد.', schema: { type: 'object', properties: { url: { type: 'string' } } } }) // اضافه شد
  @ApiBearerAuth('JWT-auth') // اضافه شد
  uploadProductImage(@UploadedFile(
        new ParseFilePipe({
        validators: [
            new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }), 
            new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }), 
        ],
        }),
    ) file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('هیچ فایلی برای آپلود ارسال نشده است.');
    }
    return { url: `/uploads/products/${file.filename}` };
  }

  // ۲. آپلود گالری تصاویر محصول (چندین فایل) با اعتبارسنجی و محدودیت دسترسی
  @Post('upload-gallery-images')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR') 
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions)) 
  @ApiOperation({ summary: 'آپلود گالری تصاویر محصول (تا 10 عکس)' }) // اضافه شد
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } } } })
  @ApiResponse({ status: 201, description: 'فایل‌ها با موفقیت آپلود شدند.', schema: { type: 'array', items: { type: 'object', properties: { url: { type: 'string' } } } } }) // اضافه شد
  @ApiBearerAuth('JWT-auth') // اضافه شد
  uploadGalleryImages(@UploadedFiles(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }),
        new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
      ],
    }),
  ) files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('هیچ فایلی برای آپلود ارسال نشده است.');
    }
    return files.map(file => ({ url: `/uploads/products/${file.filename}` }));
  }
}