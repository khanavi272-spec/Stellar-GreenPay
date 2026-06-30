/**
 * __tests__/useBiometricAuth.test.ts
 * Tests for the biometric authentication hook.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { authenticate } from '../hooks/useBiometricAuth';

describe('authenticate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns true when biometrics are available and authentication succeeds', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

    expect(await authenticate()).toBe(true);
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ disableDeviceFallback: false })
    );
  });

  it('returns false when biometrics succeed but user cancels', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: false });

    expect(await authenticate()).toBe(false);
  });

  it('falls back to PIN when no biometric hardware', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

    expect(await authenticate()).toBe(true);
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Enter your PIN to proceed' })
    );
  });

  it('falls back to PIN when biometrics not enrolled', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

    expect(await authenticate()).toBe(true);
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Enter your PIN to proceed' })
    );
  });

  it('uses the provided prompt message', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

    await authenticate('Custom prompt');
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Custom prompt' })
    );
  });
});
