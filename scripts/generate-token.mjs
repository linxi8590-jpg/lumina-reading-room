import { randomBytes } from 'node:crypto';

const token = `lrr_${randomBytes(32).toString('base64url')}`;
console.log(token);

