import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  UseGuards,
  UploadedFiles, // برای آپلود دسته‌جمعی
  ParseFilePipe, 
  MaxFileSizeValidator, 
  FileTypeValidator 
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

export const multerOptions = {
  storage: diskStorage({
    // تعیین محل ذخیره سازی
    destination: './uploads/products',
    // تعیین نام فایل
    filename: (req, file, callback) => {
      const uniqueSuffix = uuidv4(); // ایجاد یک کد رندوم برای نام فایل
      const fileExtName = extname(file.originalname); // پسوند فایل (مثلا .jpg)
      callback(null, `${uniqueSuffix}${fileExtName}`);
    },
  }),
};

@ApiTags('Files')
@Controller('files')
export class FilesController {

  @Post('upload-single')
  @UseInterceptors(FileInterceptor('file', multerOptions)) // اینجا از متغیر بالا استفاده شده
    uploadSingleFile(@UploadedFile() file: Express.Multer.File) {
    return {
        message: 'فایل با موفقیت آپلود شد',
        filename: file.filename,
        path: `/uploads/products/${file.filename}`, // این مسیری است که در دیتابیس ذخیره می‌کنی
    };
    }
  @ApiOperation({ summary: 'آپلود تصویر اصلی (تکی)' })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/products',
      filename: (req, file, cb) => {
        const name = Date.now() + extname(file.originalname);
        cb(null, name);
      }
    })
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  uploadSingle(@UploadedFile() file: Express.Multer.File) {
    return { url: `/uploads/products/${file.filename}` };
  }

  @Post('upload-gallery')
  @ApiOperation({ summary: 'آپلود دسته‌جمعی برای گالری' })
  @UseInterceptors(FilesInterceptor('files', 10, { // حداکثر ۱۰ عکس
    storage: diskStorage({
      destination: './uploads/products',
      filename: (req, file, cb) => {
        const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + extname(file.originalname);
        cb(null, name);
      }
    })
  }))

  @Post('upload-product-image')
  @UseGuards(JwtAuthGuard, RolesGuard) // فقط کاربران تایید شده
  @Roles(Role.ADMIN, Role.VENDOR)      // فقط ادمین و فروشنده
  @UseInterceptors(FileInterceptor('file', multerOptions))
  uploadFile(@UploadedFile(
        new ParseFilePipe({
        validators: [
            new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }), // حداکثر ۲ مگابایت
            new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }), // فقط عکس
        ],
        }),
    ) file: Express.Multer.File) {
    return { url: `/uploads/products/${file.filename}` };
  }

  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } } } })
  uploadGallery(@UploadedFiles() files: Express.Multer.File[]) {
    return files.map(file => ({ url: `/uploads/products/${file.filename}` }));
  }
}
