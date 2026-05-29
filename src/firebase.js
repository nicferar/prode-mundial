import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD3tQzUR038rl6R5zQ3J2nz44H9ZuVvLU0",
    authDomain: "prode-mundial-aml.firebaseapp.com",
    projectId: "prode-mundial-aml",
    messagingSenderId: "397808238155",
    appId: "1:397808238155:web:c3d5000ab5a542776217ce"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);