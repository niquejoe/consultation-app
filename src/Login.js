import React, { useState } from "react";
import { auth } from "./firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import logo from "./assets/img/logo.png";
import "./assets/css/login.css"; 

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-form">
        <img src={logo} alt="CICT Logo" className="login-logo" />
        <h2 className="login-title">CICT Consultation WebApp</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="login-input"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="login-input"
        />

        <button type="submit" className="login-button">Login</button>
        {error && <p className="login-error">{error}</p>}
      </form>
    </div>
  );
}
