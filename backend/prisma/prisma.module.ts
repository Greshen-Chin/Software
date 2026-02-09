import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Membuatnya bisa dipakai di mana saja tanpa import ulang
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}