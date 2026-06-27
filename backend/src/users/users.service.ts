import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async createUser(phone: string): Promise<User> {
    const user = this.usersRepository.create({ phone, role: 'user' });
    return this.usersRepository.save(user);
  }

  async saveTotpSecret(userId: string, encryptedSecret: string): Promise<void> {
    await this.usersRepository.update(userId, {
      totpSecretEnc: encryptedSecret,
      totpEnabled: true,
    });
  }

  async disableTotp(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      totpSecretEnc: null,
      totpEnabled: false,
    });
  }

  async setPendingTotpSecret(
    userId: string,
    encryptedSecret: string,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      totpSecretEnc: encryptedSecret,
      totpEnabled: false,
    });
  }
}
