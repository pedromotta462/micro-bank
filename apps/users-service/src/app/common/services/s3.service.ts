import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(
    @InjectPinoLogger(S3Service.name)
    private readonly logger: PinoLogger
  ) {
    this.region = process.env.AWS_REGION || 'sa-east-1';
    this.bucketName = process.env.AWS_S3_BUCKET || 'micro-bank-avatars';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.logger.info(`S3Service initialized for bucket: ${this.bucketName}`);
  }

  /**
   * Faz upload de um arquivo para o S3
   */
  async uploadFile(
    file: any,
    userId: string
  ): Promise<string> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `avatars/${userId}/${uuidv4()}.${fileExtension}`;

    this.logger.info(`Uploading file to S3: ${fileName}`);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      // Retorna a URL pública do arquivo
      const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
      
      this.logger.info(`File uploaded successfully: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      this.logger.error(`Error uploading file to S3: ${error.message}`, error.stack);
      throw new Error('Failed to upload file to S3');
    }
  }
}
