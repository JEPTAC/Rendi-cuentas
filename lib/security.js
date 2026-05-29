import crypto from 'node:crypto';
import { adminAuth, adminDb } from './firebaseAdmin';

export function cleanText(value, max = 1000) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/<\/?script[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, max);
}

export function cleanEmail(value) {
  return String(value ?? '').trim().toLowerCase().slice(0, 160);
}

export function cleanPhone(value) {
  return String(value ?? '').replace(/[^0-9+\s-]/g, '').trim().slice(0, 40);
}

export function publicToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip || 'unknown')).digest('hex').slice(0, 40);
}

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export async function requireUser(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) throw new Error('No autorizado');

  const decoded = await adminAuth.verifyIdToken(token, true);
  const profileSnap = await adminDb.collection('users').doc(decoded.uid).get();
  if (!profileSnap.exists) throw new Error('Usuario sin perfil autorizado');
  const profile = { uid: decoded.uid, ...profileSnap.data() };
  if (profile.activo === false) throw new Error('Usuario inactivo');
  return profile;
}

export function requireSuperAdmin(profile) {
  if (!profile || profile.role !== 'super_admin') {
    throw new Error('Solo el Super Admin puede ejecutar esta acción');
  }
}

export function validatePassword(password) {
  const value = String(password || '');
  return value.length >= 10 && /[A-ZÁÉÍÓÚÑ]/.test(value) && /[a-záéíóúñ]/.test(value) && /\d/.test(value);
}
