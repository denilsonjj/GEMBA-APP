// Home.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify'; // Usaremos toast para feedback de erro de login

// Cores da Paleta (para referência e uso nos estilos)
const STELLANTIS_COLORS = {
  BLUE: '#243782',
  TANGERINE: '#e94e24',
  ANTHRACITE: '#282b34',
  TEXT_LIGHT: '#ffffff',
  LIGHT_GRAY_BG: '#f8f9fa',
  MEDIUM_GRAY_BORDER: '#ced4da',
};

function Home({ onLogin, onIrParaCadastro, loginError }) { // Adicionada prop onIrParaCadastro e loginError
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Estado de loading para o botão

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      toast.warn("Por favor, preencha o Nome e o Email.");
      return;
    }
    setIsLoading(true);
    // A função onLogin (que virá do App.jsx) agora fará a chamada à API
    // e tratará o sucesso ou erro.
    await onLogin({ nome, email }); // Passa nome e email para App.jsx
    setIsLoading(false);
  };

  // Estilos (mantidos e adaptados da versão anterior do Home/TelaCadastro)
  const styles = {
    container: {
      maxWidth: "450px",
      margin: "80px auto",
      padding: "30px 35px",
      border: `2px solid ${STELLANTIS_COLORS.BLUE}`,
      borderRadius: "10px",
      backgroundColor: STELLANTIS_COLORS.LIGHT_GRAY_BG,
      textAlign: "center",
      fontFamily: "Arial, sans-serif",
      boxShadow: "0 6px 12px rgba(0, 0, 0, 0.1)",
    },
    title: {
      color: STELLANTIS_COLORS.BLUE,
      marginBottom: '25px',
      fontSize: '1.8em',
      fontWeight: 'bold',
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },
    inputGroup: {
        textAlign: 'left',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        color: STELLANTIS_COLORS.ANTHRACITE,
        fontSize: '0.9em',
        fontWeight: '500',
    },
    input: {
      padding: "12px 15px",
      borderRadius: "6px",
      border: `1px solid ${STELLANTIS_COLORS.MEDIUM_GRAY_BORDER}`,
      fontSize: "1em",
      width: "100%",
      boxSizing: "border-box",
      color: STELLANTIS_COLORS.ANTHRACITE,
    },
    button: {
      padding: "12px 15px",
      backgroundColor: STELLANTIS_COLORS.BLUE,
      color: STELLANTIS_COLORS.TEXT_LIGHT,
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "1.1em",
      fontWeight: 'bold',
      transition: "background-color 0.3s ease, box-shadow 0.3s ease",
      boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
      marginTop: '10px',
    },
    linkButton: {
        background: 'none',
        border: 'none',
        color: STELLANTIS_COLORS.BLUE,
        textDecoration: 'underline',
        cursor: 'pointer',
        padding: '10px 0',
        marginTop: '15px',
        fontSize: '0.9em',
    },
    loginErrorText: {
        color: STELLANTIS_COLORS.TANGERINE,
        backgroundColor: '#ffebee',
        border: `1px solid ${STELLANTIS_COLORS.TANGERINE}`,
        padding: '10px',
        borderRadius: '6px',
        marginBottom: '15px',
        fontSize: '0.9em',
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Gemba App</h2>
      {loginError && <p style={styles.loginErrorText}>{loginError}</p>}
      <form onSubmit={handleLoginSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label htmlFor="nome" style={styles.label}>Nome e Sobrenome:</label>
          <input
            type="text"
            id="nome"
            placeholder="O seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label htmlFor="email" style={styles.label}>Email:</label>
          <input
            type="email"
            id="email"
            placeholder="O seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
        </div>
        <button 
            type="submit" 
            style={styles.button} 
            disabled={isLoading}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a2b6b'} // Simulação de hover
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = STELLANTIS_COLORS.BLUE}
        >
          {isLoading ? "A Entrar..." : "Entrar"}
        </button>
      </form>
      <button onClick={onIrParaCadastro} style={styles.linkButton}>
        Não tem uma conta? Cadastre-se aqui
      </button>
    </div>
  );
}

export default Home;
