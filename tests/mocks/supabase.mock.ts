// tests/mocks/supabase.mock.ts
export interface SupabaseMockUser {
  id: string;
  email?: string;
}

export const supabaseAuthAdmin = {
  createUser: jest.fn(async (input: { email?: string; id?: string }) => ({
    data: { user: { id: input.id ?? 'mock-auth-user-id', email: input.email } },
    error: null,
  })),
  listUsers: jest.fn(async () => ({
    data: { users: [] as SupabaseMockUser[] },
    error: null,
  })),
  deleteUser: jest.fn(async (_id: string) => ({ data: {}, error: null })),
};

export const supabaseStorageBucket = {
  upload: jest.fn(async (_path: string, _body: unknown) => ({
    data: { path: _path },
    error: null,
  })),
  list: jest.fn(async () => ({ data: [] as Array<{ name: string }>, error: null })),
  remove: jest.fn(async (_paths: string[]) => ({ data: [], error: null })),
  createSignedUrl: jest.fn(async (_path: string, expiresIn: number) => ({
    data: {
      signedUrl: `https://example.test/signed/${encodeURIComponent(_path)}?expiresIn=${expiresIn}`,
    },
    error: null,
  })),
};

export const mockSupabaseClient = {
  auth: { admin: supabaseAuthAdmin },
  storage: { from: jest.fn(() => supabaseStorageBucket) },
};

export const createClient = jest.fn(() => mockSupabaseClient);

jest.mock('@supabase/supabase-js', () => ({
  createClient,
}));
