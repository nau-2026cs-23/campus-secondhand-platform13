import { db } from '../db';
import { users, InsertUser, insertUserSchema } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

type CreateUserInput = z.infer<typeof insertUserSchema>;

export class UserRepository {
  async create(userData: CreateUserInput) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const now = Date.now();

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        id: uuidv4(),
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      } as InsertUser)
      .returning();

    return user;
  }

  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async findById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async findAll() {
    const usersList = await db.select().from(users);
    // Convert snake_case fields to camelCase
    return usersList.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      avatar: user.avatar,
      phone: user.phone,
      studentId: user.studentId,
      role: user.role,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      creditScore: user.creditScore,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
  }

  async update(id: string, data: Partial<InsertUser>) {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: Date.now() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async verifyPassword(plainPassword: string, hashedPassword: string) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

export const userRepository = new UserRepository();
