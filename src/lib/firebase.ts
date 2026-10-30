/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA6zoCd_YOePbKUF0YQc4HHSx68_0dKtXE",
  authDomain: "offsleek-shared-backend.firebaseapp.com",
  projectId: "offsleek-shared-backend",
  storageBucket: "offsleek-shared-backend.firebasestorage.app",
  messagingSenderId: "982793510619",
  appId: "1:982793510619:web:1189cb05dbf1903449b6fe"
};

// Prevent duplicate initialization across hot reloads or multiple imports
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firebase Authentication instance
export const auth: Auth = getAuth(app);

// Default Firestore database instance in asia-south1 (Mumbai)
export const db: Firestore = getFirestore(app);
