import { useEffect, useState } from "react";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Verify() {
    const [status, setStatus] = useState("Verificando...");
    const navigate = useNavigate();

    useEffect(() => {
        const verify = async () => {
            if (!isSignInWithEmailLink(auth, window.location.href)) {
                setStatus("Link inválido o expirado.");
                return;
            }

            let email = localStorage.getItem("emailForSignIn");
            if (!email) {
                email = window.prompt("Ingresá tu mail para confirmar:");
            }

            if (!email) {
                setStatus("No se ingresó un correo. Pedí un nuevo link.");
                return;
            }

            const cleanEmail = email.trim().toLowerCase();

            try {
                const result = await signInWithEmailLink(auth, cleanEmail, window.location.href);
                localStorage.removeItem("emailForSignIn");

                const userRef = doc(db, "usuarios", result.user.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    await setDoc(userRef, {
                        email: result.user.email,
                        alias: result.user.email.split("@")[0],
                        campeon: "",
                        creadoEn: new Date(),
                    });
                }

                navigate("/");
            } catch (e) {
                console.error(e);
                setStatus("Error al verificar. Pedí un nuevo link.");
            }
        };

        verify();
    }, []);

    return (
        <div className="login-wrap">
            <div className="login-card">
                <div className="login-icon">🔐</div>
                <h2 className="login-title">Acceso</h2>
                <p className="login-sub">{status}</p>
            </div>
        </div>
    );
}