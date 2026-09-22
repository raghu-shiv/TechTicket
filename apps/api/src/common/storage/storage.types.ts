export interface StorageUploadInput {
  objectKey: string;
  data: Buffer;
  size: number;
  contentType: string;
}

export interface StorageObject {
  objectKey: string;
  data: Buffer;
}
