import { randomBytes } from 'crypto';

// Short, URL-safe ids: cp_a1b2c3d4e5f6, class_…, etc.
export const newId = (prefix: string) => `${prefix}_${randomBytes(6).toString('hex')}`;
