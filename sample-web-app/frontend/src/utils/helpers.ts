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

export function validateCertificate(cert: string): boolean {
  if (!cert) return false;
  const hasHeader = cert.includes('-----BEGIN PUBLIC KEY-----');
  const hasFooter = cert.includes('-----END PUBLIC KEY-----');
  if (!hasHeader || !hasFooter) {
    return false;
  }
  // Extract the body between header and footer
  const body = cert.replace(/-----.*-----/g, '').trim();
  const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
  if (!base64Regex.test(body)) {
    return false;
  }
  if (body.length < 100) {
    return false;
  }
  return true;
}
