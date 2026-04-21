export type AuthUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
};

const globalForAuthStore = globalThis as unknown as {
  authUsers?: Map<string, AuthUser>;
};

const usersByEmail = globalForAuthStore.authUsers ?? new Map<string, AuthUser>();

globalForAuthStore.authUsers = usersByEmail;

export function findUserByEmail(email: string) {
  return usersByEmail.get(email.toLowerCase());
}

export function createUser(input: Omit<AuthUser, "id">) {
  const normalizedEmail = input.email.toLowerCase();

  if (usersByEmail.has(normalizedEmail)) {
    throw new Error("email_exists");
  }

  const user: AuthUser = {
    id: crypto.randomUUID(),
    ...input,
    email: normalizedEmail,
  };

  usersByEmail.set(normalizedEmail, user);
  return user;
}
