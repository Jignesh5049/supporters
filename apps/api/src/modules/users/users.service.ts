import type { Me } from '@supporters/shared';
import type { PrismaClient, User } from '../../generated/prisma/client';

export const toMe = (user: User): Me => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  email: user.email,
  emailVerified: user.emailVerifiedAt !== null,
  role: user.role,
  cityId: user.cityId,
  createdAt: user.createdAt.toISOString(),
});

export class UsersService {
  constructor(private readonly prisma: PrismaClient) {}

  /** The signed-in user, or null if the account is gone or no longer active. */
  async getMe(userId: string): Promise<Me | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user && user.status === 'active' ? toMe(user) : null;
  }
}
