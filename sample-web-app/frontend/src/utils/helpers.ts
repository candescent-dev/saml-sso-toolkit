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
