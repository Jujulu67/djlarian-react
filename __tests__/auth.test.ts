import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';
const prisma = new PrismaClient();
import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

type User = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  hashedPassword: string | null;
  role: string | null;
};

describe('Authentication Tests', () => {
  beforeAll(async () => {
    // S'assurer que la base de données est prête pour les tests
    await prisma.$connect();
  });

  afterAll(async () => {
    // Nettoyer après les tests
    await prisma.$disconnect();
  });

  test('should find admin user with correct email', async () => {
    const adminUser = await prisma.user.findUnique({
      where: {
        email: 'juanzeiher@gmail.com',
      },
    });

    expect(adminUser).not.toBeNull();
    expect(adminUser?.email).toBe('juanzeiher@gmail.com');
    expect(adminUser?.role).toBe('ADMIN');
  });

  test('should verify password hash is valid', async () => {
    const user = await prisma.user.findUnique({
      where: {
        email: 'juanzeiher@gmail.com',
      },
    });

    expect(user).not.toBeNull();
    expect(user?.hashedPassword).not.toBeNull();

    // Vérifier si le mot de passe correspond au hash
    // Note: Remplacez 'votre_mot_de_passe' par le vrai mot de passe pour tester
    const isValidPassword = user?.hashedPassword
      ? await compare('votre_mot_de_passe', user.hashedPassword)
      : false;

    console.log('Password validation result:', isValidPassword);
    // Le test ne vérifie pas le résultat car nous ne connaissons pas le mot de passe
    // mais affiche le résultat pour le debug
  });

  test('should verify user has required fields for authentication', async () => {
    const user = await prisma.user.findUnique({
      where: {
        email: 'juanzeiher@gmail.com',
      },
      include: {
        accounts: true, // Inclure les comptes liés (Google, Twitch, etc.)
      },
    });

    expect(user).not.toBeNull();

    // Vérifier les champs requis pour l'authentification
    expect(user?.email).not.toBeNull();
    expect(user?.id).not.toBeNull();

    // Afficher les méthodes de connexion disponibles
    if (user?.accounts) {
      console.log('Available authentication methods:');
      user.accounts.forEach((account) => {
        console.log(`- ${account.provider}`);
      });
    } else {
      console.log('No external authentication methods found');
    }
  });

  test('should list all users and verify only one admin exists', async () => {
    const allUsers = await prisma.user.findMany();
    const adminUsers = allUsers.filter((user: User) => user.role === 'ADMIN');

    expect(allUsers.length).toBeGreaterThan(0);
    expect(adminUsers.length).toBe(1);
    expect(adminUsers[0].email).toBe('juanzeiher@gmail.com');
  });
});
