'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const MASTER_ADMIN_EMAIL = 'pedrohenriqueribei@gmail.com';

export default function AdminBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.email === MASTER_ADMIN_EMAIL) {
      const ensureAdmin = async () => {
        try {
          await setDoc(doc(db, 'admins', user.uid), {
            email: user.email,
            role: 'master',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error('Failed to bootstrap admin:', error);
        }
      };
      ensureAdmin();
    }
  }, [user]);

  return null;
}
