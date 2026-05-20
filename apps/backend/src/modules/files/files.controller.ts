import { 
  BadRequestException,
  Controller, 
  HttpCode,
  HttpStatus,
  Post, 
  UploadedFile, 
  UploadedFiles, 
  UseGuards,
  UseInterceptors, 
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'; // ApiBearerAuth و ApiResponse اضافه شد

export const multerOptions = {
  limits: {
    fileSize: 1024 * 1024 * 2,
  },
  fileFilter: (
    req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const isAllowed = /\.(png|jpeg|jpg|webp)$/i.test(file.originalname);
    if (!isAllowed) {
      return callback(
        new BadRequestException('فرمت فایل مجاز نیست. فقط png, jpeg, jpg, webp'),
        false,
      );
    }

    callback(null, true);
  },
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
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('create', 'File'))
  @UseInterceptors(FileInterceptor('file', multerOptions)) 
  @ApiOperation({ summary: 'آپلود تصویر تکی محصول' }) // اضافه شد
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: 'فایل با موفقیت آپلود شد.', schema: { type: 'object', properties: { url: { type: 'string' } } } }) // اضافه شد
  @ApiBearerAuth('JWT-auth') // اضافه شد
  uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('هیچ فایلی برای آپلود ارسال نشده است.');
    }

    this.validateUploadedFile(file);

    return { url: `/uploads/products/${file.filename}` };
  }

  // ۲. آپلود گالری تصاویر محصول (چندین فایل) با اعتبارسنجی و محدودیت دسترسی
  @Post('upload-gallery-images')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('create', 'File'))
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions)) 
  @ApiOperation({ summary: 'آپلود گالری تصاویر محصول (تا 10 عکس)' }) // اضافه شد
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } } } })
  @ApiResponse({ status: 201, description: 'فایل‌ها با موفقیت آپلود شدند.', schema: { type: 'array', items: { type: 'object', properties: { url: { type: 'string' } } } } }) // اضافه شد
  @ApiBearerAuth('JWT-auth') // اضافه شد
  uploadGalleryImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('هیچ فایلی برای آپلود ارسال نشده است.');
    }

    files.forEach((file) => this.validateUploadedFile(file));

    return files.map(file => ({ url: `/uploads/products/${file.filename}` }));
  }

  @Post('upload-document-image')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('create', 'File'))
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiOperation({ summary: 'آپلود تصویر مدرک' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: 'فایل با موفقیت آپلود شد.', schema: { type: 'object', properties: { url: { type: 'string' } } } })
  @ApiBearerAuth('JWT-auth')
  uploadDocumentImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('هیچ فایلی برای آپلود ارسال نشده است.');
    }

    this.validateUploadedFile(file);

    return { url: `/uploads/products/${file.filename}` };
  }

  private validateUploadedFile(file: Express.Multer.File) {
    const isAllowed = /\.(png|jpeg|jpg|webp)$/i.test(file.originalname);
    if (!isAllowed) {
      throw new BadRequestException(
        'فرمت فایل مجاز نیست. فقط png, jpeg, jpg, webp',
      );
    }

    if (file.size > 1024 * 1024 * 2) {
      throw new BadRequestException('حجم فایل بیشتر از حد مجاز است');
    }
  }
}
