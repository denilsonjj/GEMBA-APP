// Home.jsx
import React, { useState, useEffect } from "react";

const API_BASE_URL = 'http://127.0.0.1:5001'; // Certifique-se que esta é a porta correta

// Cores da Paleta (para referência e uso nos estilos)
const STELLANTIS_COLORS = {
  BLUE: '#243782',
  TANGERINE: '#e94e24',
  MINT: '#43aaa0',
  ORANGE: '#eca935',
  ANTHRACITE: '#282b34',
  TEXT_LIGHT: '#ffffff',
  LIGHT_GRAY_BG: '#f8f9fa', // Um cinza muito claro para fundos
  MEDIUM_GRAY_BORDER: '#ced4da', // Um cinza para bordas
};

function Home({ onLogin, loginError }) { // Adicionado loginError como prop
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState(""); 
  const [cargo, setCargo] = useState("");
  const [cargosList, setCargosList] = useState([]);
  const [isLoadingCargos, setIsLoadingCargos] = useState(false);
  const [errorCargos, setErrorCargos] = useState(null);

  useEffect(() => {
    const fetchCargos = async () => {
      setIsLoadingCargos(true);
      setErrorCargos(null);
      try {
        const response = await fetch(`${API_BASE_URL}/cargos`);
        if (!response.ok) {
          throw new Error(`Falha ao buscar cargos: ${response.statusText}`);
        }
        const data = await response.json();
        setCargosList(data);
        if (data.length > 0 && !cargo) { // Define apenas se cargo ainda não estiver definido
          setCargo(data[0]); 
        }
      } catch (error) {
        console.error("Erro ao buscar cargos:", error);
        setErrorCargos(error.message);
      } finally {
        setIsLoadingCargos(false);
      }
    };

    fetchCargos();
  }, []); // Dependência vazia para executar apenas uma vez

  const handleLogin = (e) => {
    e.preventDefault();
    if (nome && email && cargo) { 
      onLogin({ nome, email, cargo }); // Passa o objeto completo para App.jsx
    } else {
      // Idealmente, este alerta seria uma mensagem de erro mais integrada na UI
      alert("Por favor, preencha todos os campos: Nome, E-mail e Cargo.");
    }
  };

  // Estilos atualizados com a paleta de cores
  const styles = {
    container: {
      maxWidth: "450px", // Um pouco mais largo
      margin: "80px auto", 
      padding: "30px 35px", 
      border: `2px solid ${STELLANTIS_COLORS.BLUE}`,
      borderRadius: "10px", 
      backgroundColor: STELLANTIS_COLORS.LIGHT_GRAY_BG, 
      textAlign: "center",
      fontFamily: "Arial, sans-serif", // Considerar uma fonte da Stellantis se disponível
      boxShadow: "0 6px 12px rgba(0, 0, 0, 0.1)", 
    },
    title: {
      color: STELLANTIS_COLORS.BLUE,
      marginBottom: '25px',
      fontSize: '1.8em', // Título maior
      fontWeight: 'bold',
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "20px", 
    },
    input: {
      padding: "12px 15px", 
      borderRadius: "6px", 
      border: `1px solid ${STELLANTIS_COLORS.MEDIUM_GRAY_BORDER}`,
      fontSize: "1em", 
      width: "100%", 
      boxSizing: "border-box", 
      color: STELLANTIS_COLORS.ANTHRACITE, // Cor do texto do input
    },
    selectDisabled: { // Estilo para o select quando estiver a carregar/com erro
        color: '#aaa', // Cor de texto mais clara
        backgroundColor: '#eee', // Fundo ligeiramente diferente
    },
    button: {
      padding: "12px 15px", 
      backgroundColor: STELLANTIS_COLORS.BLUE,
      color: STELLANTIS_COLORS.TEXT_LIGHT,
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "1.1em", // Botão ligeiramente maior
      fontWeight: 'bold',
      transition: "background-color 0.3s ease, box-shadow 0.3s ease",
      boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
    },
    // buttonHover (não pode ser feito diretamente em JS inline, mas pode ser adicionado com CSS)
    // Para simular hover, pode-se usar estados do React, mas é mais complexo para este caso.
    errorText: {
      color: STELLANTIS_COLORS.TANGERINE, // Usar Tangerine para erros
      fontSize: '0.85em',
      marginTop: '8px',
      textAlign: 'left', // Alinhar à esquerda para melhor leitura
    },
    loginErrorText: { // Estilo para o erro de login vindo do App.jsx
        color: STELLANTIS_COLORS.TANGERINE,
        backgroundColor: '#ffebee', // Um fundo vermelho claro
        border: `1px solid ${STELLANTIS_COLORS.TANGERINE}`,
        padding: '10px',
        borderRadius: '6px',
        marginBottom: '15px',
        fontSize: '0.9em',
    }
  };


  return (
    <div style={styles.container}>
      <h2 style={styles.title}>GEMBA APP</h2>
      {loginError && <p style={styles.loginErrorText}>{loginError}</p>}
      <form onSubmit={handleLogin} style={styles.form}>
        <input
          type="text"
          placeholder="Nome Completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          style={styles.input}
          aria-label="Nome Completo"
        />
        <input
          type="email"
          placeholder="E-mail (Corporativo)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
          aria-label="E-mail"
        />
        <div>
          <select
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            required
            style={{...styles.input, ...( (isLoadingCargos || errorCargos) ? styles.selectDisabled : {})}}
            aria-label="Cargo"
            disabled={isLoadingCargos || !!errorCargos} // Desabilitar se estiver a carregar ou se houver erro
          >
            <option value="" disabled={cargo !== ""}> 
              {isLoadingCargos ? "A carregar cargos..." : (errorCargos ? "Erro ao carregar" : "Selecione um cargo")}
            </option>
            {!isLoadingCargos && !errorCargos && cargosList.map((c, index) => (
              <option key={index} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errorCargos && <p style={styles.errorText}>Falha ao carregar cargos. Tente recarregar.</p>}
        </div>
        <button 
            type="submit" 
            style={styles.button} 
            disabled={isLoadingCargos}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a2b6b'} // Simulação de hover
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = STELLANTIS_COLORS.BLUE}
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

export default Home;
