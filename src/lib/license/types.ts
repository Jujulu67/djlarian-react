export type LicenseType = 'STANDARD' | 'EDU' | 'NFR' | 'BETA' | 'LIFETIME';

export interface LicenseData {
  email: string | null;
  licenseKey: string;
  machineID: string;
  type: number; // Index of LicenseType
  activationDate: number;
  expirationDate: number; // 0 for perpetual
  lastValidation: number;
  loadCounter: number;
}

export interface ActivationResponse {
  success: boolean;
  license_data?: string;
  signature?: string;
  remaining_activations?: number;
  error?: string;
}

export interface ValidationResponse {
  valid: boolean;
  status: 'active' | 'invalid' | 'revoked' | 'expired' | 'not_activated' | 'error';
  signature?: string;
  error?: string;
}

export const LICENSE_TYPES: LicenseType[] = ['STANDARD', 'EDU', 'NFR', 'BETA', 'LIFETIME'];

export function getLicenseTypeIndex(type: LicenseType | string): number {
  return LICENSE_TYPES.indexOf(type as LicenseType);
}
