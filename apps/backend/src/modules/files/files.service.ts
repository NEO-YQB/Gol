import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

type UploadFolder = 'products' | 'documents';

type UploadedImageVariant = {
  url: string;
  width: number;
  height: number;
  key: string;
};

type UploadedImageResponse = {
  url: string;
  width: number | null;
  height: number | null;
  contentType: string;
  variants: {
    original: UploadedImageVariant;
    large: UploadedImageVariant | null;
    medium: UploadedImageVariant | null;
    thumbnail: UploadedImageVariant | null;
  };
};

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
    return this.uploadImage(file, 'products', true);
  }

  async uploadGalleryImages(files: Express.Multer.File[]) {
    return Promise.all(files.map((file) => this.uploadImage(file, 'products', true)));
  }

  async uploadDocumentImage(file: Express.Multer.File) {
    return this.uploadImage(file, 'documents', false);
  }

  private async uploadImage(
    file: Express.Multer.File,
    folder: UploadFolder,
    requireWebp: boolean,
  ): Promise<UploadedImageResponse> {
    this.validateImageFile(file);

    const imageAsset = await this.prepareImageAsset(file, folder, requireWebp);
    return this.persistImageAsset(imageAsset, folder);
  }

  private buildFileName() {
    return `${uuidv4()}.webp`;
  }

  private parseBoolean(value?: string | null) {
    return value === 'true' || value === '1';
  }

  private async prepareImageAsset(
    file: Express.Multer.File,
    folder: UploadFolder,
    requireWebp: boolean,
  ) {
    try {
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default;
      const metadata = await sharp(file.buffer).metadata();
      const baseName = this.buildFileName();
      const originalKey = `${folder}/${baseName}`;
      const originalBuffer = await sharp(file.buffer).webp({ quality: 82 }).toBuffer();
      const large = await this.buildVariant(sharp, file.buffer, folder, 'lg', 1440);
      const medium = await this.buildVariant(sharp, file.buffer, folder, 'md', 960);
      const thumbnail = await this.buildVariant(sharp, file.buffer, folder, 'thumb', 480);

      return {
        original: {
          key: originalKey,
          buffer: originalBuffer,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
        },
        large,
        medium,
        thumbnail,
        contentType: 'image/webp',
      };
    } catch {
      if (requireWebp) {
        throw new ServiceUnavailableException(
          'سرویس پردازش تصویر در سرور فعال نیست و تبدیل به webp انجام نشد. ابتدا پشتیبانی sharp روی سرور را فعال کنید.',
        );
      }

      const fallbackKey = `${folder}/${this.buildFallbackFileName(file.originalname)}`;
      return {
        original: {
          key: fallbackKey,
          buffer: file.buffer,
          width: null,
          height: null,
        },
        large: null,
        medium: null,
        thumbnail: null,
        contentType: file.mimetype || 'application/octet-stream',
      };
    }
  }

  private async buildVariant(
    sharp: (input?: Buffer) => any,
    sourceBuffer: Buffer,
    folder: UploadFolder,
    suffix: string,
    width: number,
  ) {
    const instance = sharp(sourceBuffer);
    const metadata = await instance.metadata();

    if (!metadata.width || metadata.width <= width) {
      return null;
    }

    const resized = await sharp(sourceBuffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const resizedMetadata = await sharp(resized).metadata();

    return {
      key: `${folder}/${uuidv4()}-${suffix}.webp`,
      buffer: resized,
      width: resizedMetadata.width ?? width,
      height: resizedMetadata.height ?? null,
    };
  }

  private async persistImageAsset(
    asset: {
      original: { key: string; buffer: Buffer; width: number | null; height: number | null };
      large: { key: string; buffer: Buffer; width: number | null; height: number | null } | null;
      medium: { key: string; buffer: Buffer; width: number | null; height: number | null } | null;
      thumbnail: { key: string; buffer: Buffer; width: number | null; height: number | null } | null;
      contentType: string;
    },
    folder: UploadFolder,
  ): Promise<UploadedImageResponse> {
    if (this.client && this.bucket && this.publicUrl) {
      await Promise.all(
        [asset.original, asset.large, asset.medium, asset.thumbnail]
          .filter(Boolean)
          .map((item) =>
            this.client!.send(
              new PutObjectCommand({
                Bucket: this.bucket!,
                Key: item!.key,
                Body: item!.buffer,
                ContentType: asset.contentType,
              }),
            ),
          ),
      );

      return {
        url: `${this.publicUrl}/${asset.original.key}`,
        width: asset.original.width,
        height: asset.original.height,
        contentType: asset.contentType,
        variants: {
          original: this.toUploadedVariant(asset.original, this.publicUrl),
          large: this.toUploadedVariantNullable(asset.large, this.publicUrl),
          medium: this.toUploadedVariantNullable(asset.medium, this.publicUrl),
          thumbnail: this.toUploadedVariantNullable(asset.thumbnail, this.publicUrl),
        },
      };
    }

    const targetDirectory = join(this.uploadsRoot, folder);
    await mkdir(targetDirectory, { recursive: true });

    await Promise.all(
      [asset.original, asset.large, asset.medium, asset.thumbnail]
        .filter(Boolean)
        .map((item) => writeFile(join(this.uploadsRoot, item!.key), item!.buffer)),
    );

    return {
      url: `/uploads/${asset.original.key}`,
      width: asset.original.width,
      height: asset.original.height,
      contentType: asset.contentType,
      variants: {
        original: this.toUploadedVariant(asset.original, '/uploads'),
        large: this.toUploadedVariantNullable(asset.large, '/uploads'),
        medium: this.toUploadedVariantNullable(asset.medium, '/uploads'),
        thumbnail: this.toUploadedVariantNullable(asset.thumbnail, '/uploads'),
      },
    };
  }

  private toUploadedVariant(
    asset: { key: string; width: number | null; height: number | null },
    baseUrl: string,
  ): UploadedImageVariant {
    return {
      url: `${baseUrl.replace(/\/+$/, '')}/${asset.key}`,
      width: asset.width ?? 0,
      height: asset.height ?? 0,
      key: asset.key,
    };
  }

  private toUploadedVariantNullable(
    asset: { key: string; width: number | null; height: number | null } | null,
    baseUrl: string,
  ) {
    return asset ? this.toUploadedVariant(asset, baseUrl) : null;
  }

  private buildFallbackFileName(originalName: string) {
    const extension = extname(originalName).toLowerCase();
    const normalizedExtension = extension || '.bin';
    return `${uuidv4()}${normalizedExtension}`;
  }
}
