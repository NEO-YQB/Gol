import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

type UploadFolder = 'products' | 'documents';

@Injectable()
export class FilesService {
  private readonly client: S3Client | null;
  private readonly bucket: string | null;
  private readonly publicUrl: string | null;
  private readonly uploadsRoot = join(process.cwd(), 'uploads');

  constructor(private readonly configService: ConfigService) {
    const endpoint =
      this.configService.get<string>('STORAGE_ENDPOINT') ??
      this.configService.get<string>('S3_ENDPOINT') ??
      null;
    const region =
      this.configService.get<string>('STORAGE_REGION') ??
      this.configService.get<string>('S3_REGION') ??
      'frankfurt';
    const accessKeyId =
      this.configService.get<string>('STORAGE_ACCESS_KEY') ??
      this.configService.get<string>('S3_ACCESS_KEY') ??
      null;
    const secretAccessKey =
      this.configService.get<string>('STORAGE_SECRET_KEY') ??
      this.configService.get<string>('S3_SECRET_KEY') ??
      null;
    const bucket =
      this.configService.get<string>('STORAGE_BUCKET') ??
      this.configService.get<string>('S3_BUCKET') ??
      null;
    const publicUrl =
      this.configService.get<string>('STORAGE_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      null;
    const forcePathStyle = this.parseBoolean(
      this.configService.get<string>('STORAGE_FORCE_PATH_STYLE') ??
        this.configService.get<string>('S3_FORCE_PATH_STYLE'),
    );

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
      this.client = null;
      this.bucket = null;
      this.publicUrl = null;
      return;
    }

    this.bucket = bucket;
    this.publicUrl = publicUrl.replace(/\/+$/, '');
    this.client = new S3Client({
      region,
      endpoint: endpoint.startsWith('http') ? endpoint : `https://${endpoint}`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle,
    });
  }

  validateImageFile(file: Express.Multer.File) {
    const isAllowed = /\.(png|jpeg|jpg|webp)$/i.test(file.originalname);
    if (!isAllowed) {
      throw new BadRequestException('فرمت فایل مجاز نیست. فقط png, jpeg, jpg, webp');
    }

    if (file.size > 1024 * 1024 * 2) {
      throw new BadRequestException('حجم فایل بیشتر از حد مجاز است');
    }
  }

  async uploadProductImage(file: Express.Multer.File) {
    return this.uploadImage(file, 'products');
  }

  async uploadGalleryImages(files: Express.Multer.File[]) {
    return Promise.all(files.map((file) => this.uploadImage(file, 'products')));
  }

  async uploadDocumentImage(file: Express.Multer.File) {
    return this.uploadImage(file, 'documents');
  }

  private async uploadImage(file: Express.Multer.File, folder: UploadFolder) {
    this.validateImageFile(file);

    const fileName = this.buildFileName(file.originalname);
    const key = `${folder}/${fileName}`;
    const { buffer, contentType } = await this.prepareImageBuffer(file);

    if (this.client && this.bucket && this.publicUrl) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      return {
        url: `${this.publicUrl}/${key}`,
      };
    }

    const targetDirectory = join(this.uploadsRoot, folder);
    await mkdir(targetDirectory, { recursive: true });
    await writeFile(join(targetDirectory, fileName), buffer);

    return {
      url: `/uploads/${key}`,
    };
  }

  private buildFileName(originalName: string) {
    const extension = extname(originalName).toLowerCase();
    const normalized = extension === '.webp' ? 'webp' : 'webp';
    return `${uuidv4()}.${normalized}`;
  }

  private parseBoolean(value?: string | null) {
    return value === 'true' || value === '1';
  }

  private async prepareImageBuffer(file: Express.Multer.File) {
    try {
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default;
      const buffer = await sharp(file.buffer).webp({ quality: 82 }).toBuffer();

      return {
        buffer,
        contentType: 'image/webp',
      };
    } catch {
      return {
        buffer: file.buffer,
        contentType: file.mimetype || 'application/octet-stream',
      };
    }
  }
}
