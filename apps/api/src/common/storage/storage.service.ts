import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Client } from 'minio';
import { Readable } from 'node:stream';
import type { StorageObject, StorageUploadInput } from './storage.types';

@Injectable()
export class StorageService {
  private readonly client: Client;
  private readonly bucket: string;

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT;

    if (!endpoint) {
      throw new Error('MINIO_ENDPOINT is not configured');
    }

    const port = Number(process.env.MINIO_PORT ?? 9000);
    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;
    const bucket = process.env.MINIO_BUCKET;

    if (!accessKey || !secretKey || !bucket) {
      throw new Error('MinIO configuration is incomplete');
    }

    this.client = new Client({
      endPoint: endpoint,
      port,
      useSSL: false,
      accessKey,
      secretKey,
    });

    this.bucket = bucket;
  }

  async ensureBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);

      if (!exists) {
        await this.client.makeBucket(this.bucket);
      }
    } catch {
      throw new InternalServerErrorException(
        'Unable to initialize object storage',
      );
    }
  }

  async upload(input: StorageUploadInput): Promise<void> {
    try {
      await this.ensureBucket();

      await this.client.putObject(
        this.bucket,
        input.objectKey,
        input.data,
        input.size,
        {
          'Content-Type': input.contentType,
        },
      );
    } catch {
      throw new InternalServerErrorException('Unable to upload attachment');
    }
  }

  async get(objectKey: string): Promise<StorageObject> {
    try {
      const stream = await this.client.getObject(this.bucket, objectKey);

      const chunks: Buffer[] = [];

      for await (const chunk of stream as Readable) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      return {
        objectKey,
        data: Buffer.concat(chunks),
      };
    } catch {
      throw new InternalServerErrorException('Unable to retrieve attachment');
    }
  }

  async delete(objectKey: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, objectKey);
    } catch {
      throw new InternalServerErrorException('Unable to delete attachment');
    }
  }
}
