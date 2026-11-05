import { getEncryptedCache, wipeEncryptedCache } from './encryptedCache';
import * as SecureStore from 'expo-secure-store';

const mockStore = new Map<string, any>();
const mockInstance = {
  set: jest.fn((k, v) => mockStore.set(k, v)),
  getString: jest.fn((k) => mockStore.get(k)),
  clearAll: jest.fn(() => mockStore.clear()),
};

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => mockInstance),
}));

describe('Encrypted Cache (mobile spec line 148)', () => {
  it('initializes encrypted MMKV using a key from SecureStore', async () => {
    const cache = await getEncryptedCache();
    expect(cache).toBeDefined();
    expect(SecureStore.getItemAsync).toHaveBeenCalled();
  });

  it('wipes cached data on request', async () => {
    const cache = await getEncryptedCache();
    await wipeEncryptedCache();
    expect(mockInstance.clearAll).toHaveBeenCalled();
  });
});
