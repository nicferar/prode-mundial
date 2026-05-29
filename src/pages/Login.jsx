import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { MailIcon, StarIcon } from "../components/Icons";
import "./Login.css";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alias, setAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) { setError("Completá todos los campos."); return; }
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      navigate("/");
    } catch (e) {
      setError("Mail o contraseña incorrectos.");
      console.error(e);
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!email || !password || !alias) { setError("Completá todos los campos."); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    setLoading(true); setError("");
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await updateProfile(result.user, { displayName: alias.trim() });
      await setDoc(doc(db, "usuarios", result.user.uid), {
        email: result.user.email,
        alias: alias.trim(),
        campeon: "",
        creadoEn: new Date(),
      });
      navigate("/");
    } catch (e) {
      if (e.code === "auth/email-already-in-use") setError("Ese mail ya está registrado.");
      else setError("Error al registrarse. Intentá de nuevo.");
      console.error(e);
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!email) { setError("Ingresá tu mail."); return; }
    setLoading(true); setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setResetSent(true);
    } catch (e) {
      setError("No se encontró ese mail.");
      console.error(e);
    } finally { setLoading(false); }
  };

  if (resetSent) return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-icon"><MailIcon size={32} /></div>
        <h2 className="login-title">Revisá tu mail</h2>
        <p className="login-sub">Te mandamos un link para restablecer tu contraseña.</p>
        <button className="login-link" onClick={() => { setResetSent(false); setMode("login"); }}>
          Volver al inicio
        </button>
      </div>
    </div>
  );

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-icon"><StarIcon size={32} /></div>
        <h1 className="login-title">PRODEAR</h1>

        <div className="login-tabs">
          <button className={`login-tab ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setError(""); }}>Entrar</button>
          <button className={`login-tab ${mode === "register" ? "active" : ""}`} onClick={() => { setMode("register"); setError(""); }}>Registrarse</button>
        </div>

        {mode === "reset" ? (
          <>
            <div className="login-field">
              <label className="login-label">Tu mail</label>
              <input className="login-input" type="email" placeholder="nombre@mail.com" autoComplete="off"
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleReset()} />
            </div>
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" onClick={handleReset} disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de recuperación"}
            </button>
            <button className="login-link" onClick={() => { setMode("login"); setError(""); }}>
              ← Volver
            </button>
          </>
        ) : (
          <>
            {mode === "register" && (
              <div className="login-field">
                <label className="login-label">Alias</label>
                <input className="login-input" type="text" placeholder="Tu apodo en el prode" autoComplete="off"
                  value={alias} onChange={e => setAlias(e.target.value)} />
              </div>
            )}
            <div className="login-field">
              <label className="login-label">Mail</label>
              <input className="login-input" type="email" placeholder="nombre@mail.com" autoComplete="off"
                  value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="login-field">
              <label className="login-label">Contraseña</label>
              <input className="login-input" type="password" placeholder="••••••••" autoComplete={mode === "register" ? "new-password" : "off"}
                  value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())} />
            </div>
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" onClick={mode === "login" ? handleLogin : handleRegister} disabled={loading}>
              {loading ? "Cargando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
            {mode === "login" && (
              <button className="login-link" onClick={() => { setMode("reset"); setError(""); }}>
                Olvidé mi contraseña
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}