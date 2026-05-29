import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Verify from "./pages/Verify";
import Partidos from "./pages/Partidos";
import Tabla from "./pages/Tabla";
import Feed from "./pages/Feed";
import Perfil from "./pages/Perfil";
import Faq from "./pages/Faq";
import Admin from "./pages/Admin";

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        const isDark = localStorage.getItem("darkMode") === "true";
        return (
            <div style={{
                height: "100vh",
                background: isDark ? "#121417" : "#f5f7fa",
            }} />
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Partidos />} />
                    <Route path="tabla" element={<Tabla />} />
                    <Route path="feed" element={<Feed />} />
                    <Route path="perfil" element={<Perfil />} />
                    <Route path="faq" element={<Faq />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
