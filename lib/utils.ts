import crypto from 'crypto';

/**
 * Generates a cryptographically stronger temporary password.
 * @param {number} length The desired length of the password.
 * @returns {string} The generated temporary password.
 */
export function generateTemporaryPassword(length: number = 24): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}
