/**
 * Validate URL format
 * @param url string
 * @returns boolean true if valid, false otherwise
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export function validatePublicCertificate(cert: string): boolean {
  if (!cert) return false;
  const normalized = cert.trim().replace(/\r/g, '');
  const pemHeader = '-----BEGIN CERTIFICATE-----';
  const pemFooter = '-----END CERTIFICATE-----';
  if (!normalized.includes(pemHeader) || !normalized.includes(pemFooter)) {
    return false;
  }
  return true;
}
