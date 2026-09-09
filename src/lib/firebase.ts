// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCdmzi2nHr4fOC9EIQzCAIShCP5yegCKfY",
  authDomain: "namfrel-ai.firebaseapp.com",
  projectId: "namfrel-ai",
  storageBucket: "namfrel-ai.firebasestorage.app",
  messagingSenderId: "681466174140",
  appId: "1:681466174140:web:617dd8b63ade3474784eb9",
  measurementId: "G-7B3HHL05TL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);