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
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { FilesService } from './files.service';

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
  storage: memoryStorage(),
};

export const documentMulterOptions = {
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
  storage: memoryStorage(),
};

export const faviconMulterOptions = {
  limits: {
    fileSize: 1024 * 1024 * 1,
  },
  fileFilter: (
    req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const isAllowed = /\.(ico|png|jpeg|jpg|webp)$/i.test(file.originalname);
    if (!isAllowed) {
      return callback(
        new BadRequestException('فرمت فایل مجاز نیست. فقط ico, png, jpeg, jpg, webp'),
        false,
      );
    }

    callback(null, true);
  },
  storage: memoryStorage(),
};

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-product-image')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiOperation({ summary: 'آپلود تصویر تکی محصول' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: 'فایل با موفقیت آپلود شد.', schema: { type: 'object', properties: { url: { type: 'string' } } } })
  @ApiBearerAuth('JWT-auth')
  uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('هیچ فایلی برای آپلود ارسال نشده است.');
    }

    return this.filesService.uploadProductImage(file);
  }

  @Post('upload-gallery-images')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  @ApiOperation({ summary: 'آپلود گالری تصاویر محصول (تا 10 عکس)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } } } })
  @ApiResponse({ status: 201, description: 'فایل‌ها با موفقیت آپلود شدند.', schema: { type: 'array', items: { type: 'object', properties: { url: { type: 'string' } } } } })
  @ApiBearerAuth('JWT-auth')
  uploadGalleryImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('هیچ فایلی برای آپلود ارسال نشده است.');
    }

    return this.filesService.uploadGalleryImages(files);
  }

  @Post('upload-document-image')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', documentMulterOptions))
  @ApiOperation({ summary: 'آپلود تصویر مدرک' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: 'فایل با موفقیت آپلود شد.', schema: { type: 'object', properties: { url: { type: 'string' } } } })
  @ApiBearerAuth('JWT-auth')
  uploadDocumentImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('هیچ فایلی برای آپلود ارسال نشده است.');
    }

    return this.filesService.uploadDocumentImage(file);
  }

  @Post('upload-site-image')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiOperation({ summary: 'آپلود تصویر صفحات سایت' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: 'فایل با موفقیت آپلود شد.', schema: { type: 'object', properties: { url: { type: 'string' } } } })
  @ApiBearerAuth('JWT-auth')
  uploadSiteImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('هیچ فایلی برای آپلود ارسال نشده است.');
    }

    return this.filesService.uploadSiteImage(file);
  }

  @Post('upload-favicon')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', faviconMulterOptions))
  @ApiOperation({ summary: 'آپلود فاوایکون (ico یا تصویر)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: 'فایل با موفقیت آپلود شد.', schema: { type: 'object', properties: { url: { type: 'string' } } } })
  @ApiBearerAuth('JWT-auth')
  uploadFavicon(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('هیچ فایلی برای آپلود ارسال نشده است.');
    }

    return this.filesService.uploadFavicon(file);
  }
}
