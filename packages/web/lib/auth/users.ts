import bcrypt from "bcryptjs";
import { readUsers, writeUsers, type StoredUser } from "./store";

type User = {
  id: string;
  email: string;
  passwordHash: string;
};

async function readIndex(): Promise<Map<string, User>> {
  const list = await readUsers();
  const map = new Map<string, User>();
  for (const u of list) {
    map.set(u.email.toLowerCase(), u);
  }
  return map;
}
async function writeIndex(map: Map<string, User>) {
  await writeUsers(Array.from(map.values()));
}

export async function createUser(email: string, password: string) {
  const list = await readUsers();
  const exists = list.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) throw new Error("User already exists");
  const passwordHash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();
  const user: StoredUser = { id, email, passwordHash };
  await writeUsers([...list, user]);
  return user;
}

export async function findUserByEmail(email: string) {
  const index = await readIndex();
  return index.get(email.toLowerCase()) || null;
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}


