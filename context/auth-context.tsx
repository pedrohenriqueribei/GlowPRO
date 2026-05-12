'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, getDocs, collection, query, where, setDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';

interface AuthContextType {
  user: FirebaseUser | null;
  currentUser: FirebaseUser | null; // Adding alias for consistency
  userProfile: any | null; // Adding alias for consistency
  profile: any | null;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, currentUser: null, userProfile: null, profile: null, isAdmin: false, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: () => void;
    let unsubscribeAdmin: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // If it's the master admin, ensure they have the admin role
        if (firebaseUser.email === 'pedrohenriqueribei@gmail.com') {
          setIsAdmin(true);
        }

        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data());
            setLoading(false);
          } else {
            // Check if this new user is a registered staff member OR professional by email
            try {
              // 1. Check Staff
              const staffQuery = query(collection(db, 'staff'), where('email', '==', firebaseUser.email));
              const staffSnap = await getDocs(staffQuery);
              
              if (!staffSnap.empty) {
                 const staffDoc = staffSnap.docs[0];
                 const staffItem = staffDoc.data();
                 
                 // Update staff document with userId for rule consistency
                 await updateDoc(doc(db, 'staff', staffDoc.id), {
                   userId: firebaseUser.uid,
                   updatedAt: serverTimestamp()
                 });

                 const newProfile = {
                   uid: firebaseUser.uid,
                   email: firebaseUser.email,
                   displayName: firebaseUser.displayName || staffItem.name,
                   role: 'profissional',
                   isOwner: false,
                   salonId: staffItem.ownerId,
                   staffId: staffDoc.id,
                   createdAt: serverTimestamp(),
                   updatedAt: serverTimestamp()
                 };
                 await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
                 setProfile(newProfile);
              } else {
                 // 2. Check if a Professional (Salon Owner) was pre-registered by email
                 // Note: We search for the old 'professional' role as well during migration if needed, 
                 // but going forward it will be 'profissional'
                 const profQuery = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
                 const profSnap = await getDocs(profQuery);
                 
                 let existingProf = null;
                 if (!profSnap.empty) {
                   existingProf = profSnap.docs.find(d => d.data().role === 'professional' || d.data().role === 'profissional');
                 }

                 if (existingProf) {
                   const profData = existingProf.data();
                   const newProfile = {
                     ...profData,
                     role: 'profissional',
                     isOwner: true,
                     uid: firebaseUser.uid,
                     updatedAt: serverTimestamp()
                   };
                   await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
                   
                   if (existingProf.id !== firebaseUser.uid) {
                     await deleteDoc(doc(db, 'users', existingProf.id));
                   }
                   
                   setProfile(newProfile);
                 } else {
                   // 3. Not a professional/staff -> Default to CLIENTE
                   const newProfile = {
                     uid: firebaseUser.uid,
                     email: firebaseUser.email,
                     displayName: firebaseUser.displayName || 'Cliente',
                     role: 'cliente',
                     createdAt: serverTimestamp(),
                     updatedAt: serverTimestamp()
                   };
                   await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
                   setProfile(newProfile);
                 }
              }
            } catch (e) {
              console.error('Error auto-creating profile:', e);
            }
            setLoading(false);
          }
        }, (error) => {
          // Silent fail or handle as needed for profile
          console.error('Profile snapshot error:', error);
        });

        unsubscribeAdmin = onSnapshot(doc(db, 'admins', firebaseUser.uid), (doc) => {
          if (doc.exists() || firebaseUser.email === 'pedrohenriqueribei@gmail.com') {
            setIsAdmin(true);
          }
        }, (error) => {
          // If we can't read our own admin status, we just aren't an admin
          setIsAdmin(firebaseUser.email === 'pedrohenriqueribei@gmail.com');
          console.warn('Admin status check restricted or failed:', error.message);
        });
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeAdmin) unsubscribeAdmin();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      currentUser: user, 
      profile, 
      userProfile: profile, 
      isAdmin, 
      loading 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
