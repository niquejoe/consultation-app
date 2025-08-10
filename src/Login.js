import React, { useState } from "react";
import { auth } from "./firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import logo from "./assets/img/logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect or show success message here
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.form}>
        <img
            src={logo}
            alt="CICT Logo"
            style={styles.logo}
        />
        <h2 style={styles.title}>CICT Consultation WebApp</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          Login
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </form>
    </div>
  );
}

const styles = {
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        // Use a warm orange gradient matching the logo's main color
        background: "linear-gradient(86deg, rgb(247 148 30 / 12%), rgb(243 112 33 / 54%))",
        fontFamily: "sans-serif",
    },
    form: {
        background: "#fff",
        padding: "2rem",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        width: "320px",
        display: "flex",
        flexDirection: "column",
    },
    title: {
        textAlign: "center",
        marginBottom: "1.5rem",
        color: "#f37021",  // Use a strong orange from the logo for the text
        fontWeight: "600",
    },
    input: {
        padding: "0.8rem",
        marginBottom: "1rem",
        border: "1px solid #f37021", // orange border
        borderRadius: "8px",
        outline: "none",
        fontSize: "1rem",
        transition: "0.2s",
    },
    button: {
        padding: "0.8rem",
        background: "#f37021", // logo orange
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "1rem",
        transition: "background 0.2s",
    },
    buttonHover: {
        background: "#d35616", // darker orange on hover
    },
    error: {
        color: "red",
        textAlign: "center",
        marginTop: "0.5rem",
    },
    logo: {
        display: "block",
        margin: "0 auto 1.5rem",
        width: "100px",
        height: "auto",
    },
};  
