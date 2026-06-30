/**
 * hooks/useBiometricAuth.ts
 * Biometric (Face ID / fingerprint) authentication hook.
 * Falls back to device PIN/passcode when biometrics are unavailable.
 */
import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticate(promptMessage = 'Confirm your identity to proceed'): Promise<boolean> {
  const hasBiometrics = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  const options: LocalAuthentication.LocalAuthenticationOptions = {
    promptMessage,
    fallbackLabel: 'Use PIN',
    disableDeviceFallback: false,
  };

  if (!hasBiometrics || !isEnrolled) {
    // Device has no biometrics — attempt PIN/passcode fallback directly
    const result = await LocalAuthentication.authenticateAsync({
      ...options,
      promptMessage: 'Enter your PIN to proceed',
    });
    return result.success;
  }

  const result = await LocalAuthentication.authenticateAsync(options);
  return result.success;
}
