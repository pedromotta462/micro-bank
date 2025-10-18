import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];
  private readonly maxSizeInBytes = 1.5 * 1024 * 1024; // 1.5MB

  transform(file: any) {
    // Validação: arquivo enviado
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validação: tipo de arquivo
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: [
          {
            field: 'file',
            message: `Invalid file type. Allowed types: jpg, jpeg, png, webp. Received: ${file.mimetype}`,
          },
        ],
      });
    }

    // Validação: tamanho
    if (file.size > this.maxSizeInBytes) {
      const sizeInMB = (file.size / 1024 / 1024).toFixed(2);
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: [
          {
            field: 'file',
            message: `File size exceeds maximum limit of 1.5MB. Received: ${sizeInMB}MB`,
          },
        ],
      });
    }

    return file;
  }
}
