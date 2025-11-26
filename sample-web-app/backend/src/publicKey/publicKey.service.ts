import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const PUBLIC_KEY_PATH = '../../certs/public.pem';

@Injectable()
export class PublicKeyService {
  private readonly publicKeyPath = path.resolve(__dirname, PUBLIC_KEY_PATH);

  /**
   * Reads and validates the public key file.
   * @returns Buffer containing valid PEM public key
   * @throws NotFoundException if file missing
   * @throws InternalServerErrorException if validation fails
   */
  getPublicKey(): Buffer {
    if (!fs.existsSync(this.publicKeyPath)) {
      throw new NotFoundException(`Public key file not found at: ${this.publicKeyPath}`);
    }
    const fileBuffer = fs.readFileSync(this.publicKeyPath);
    const fileContent = fileBuffer.toString('utf-8');
    // Validate extension
    if (!this.publicKeyPath.endsWith('.pem')) {
      throw new InternalServerErrorException(
        'Invalid key file format. Expected a .pem public key file',
      );
    }
    // Validate PEM format
    const pemRegex = /-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----/;
    if (!pemRegex.test(fileContent)) {
      throw new InternalServerErrorException(
        'The public key file content is invalid. Ensure it is a properly formatted pem key',
      );
    }
    return fileBuffer;
  }
}
