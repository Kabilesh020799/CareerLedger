declare global {
  namespace Express {
    interface User {
      id: string;
      username: string | null;
      email: string;
      name: string | null;
      avatarUrl: string | null;
    }
  }
}

export {};
