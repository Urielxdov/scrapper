import { BcryptAdapter } from './bcrypt.adapter';

describe('BcryptAdapter', () => {
  const adapter = new BcryptAdapter();

  it('hashes and compares correctly', async () => {
    const hashed = await adapter.hash('my-password');
    expect(hashed).not.toBe('my-password');
    expect(await adapter.compare('my-password', hashed)).toBe(true);
    expect(await adapter.compare('wrong', hashed)).toBe(false);
  });
});
