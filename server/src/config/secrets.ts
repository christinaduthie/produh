import crypto from 'crypto';
import { ENV } from './env';


const ALGO = 'aes-256-gcm';
const KEY = crypto.createHash('sha256').update(ENV.ENC_KEY).digest();


export function encrypt(plain: string) {
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv(ALGO, KEY, iv);
const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();
return Buffer.concat([iv, tag, enc]).toString('base64');
}


export function decrypt(b64: string) {
const buf = Buffer.from(b64, 'base64');
const iv = buf.subarray(0, 12);
const tag = buf.subarray(12, 28);
const data = buf.subarray(28);
const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
decipher.setAuthTag(tag);
const dec = Buffer.concat([decipher.update(data), decipher.final()]);
return dec.toString('utf8');
}