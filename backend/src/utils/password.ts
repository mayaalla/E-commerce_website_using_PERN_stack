import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

// Function that hashes the password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Function that compares the password with the hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}