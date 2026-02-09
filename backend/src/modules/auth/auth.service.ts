import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: { email: string; password: string; name: string }) {
    // Cek apakah email sudah terdaftar
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    // Hash password sebelum disimpan
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Buat user baru
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
    });

    // Generate token untuk user baru
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  async login(email: string, pass: string) {
    // 1. Cari user di PostgreSQL berdasarkan email
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    // 2. Cek apakah user ada dan password (hash) cocok
    if (!user || !(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // 3. Berikan Token (Kunci Akses)
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
}