import { Module } from '@nestjs/common';
import { EncryptionService } from './services/encryption.service';

@Module({
  imports: [EncryptionService],
})
export class SharedModule {}
