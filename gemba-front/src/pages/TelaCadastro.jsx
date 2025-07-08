
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';


const API_BASE_URL = 'https://denilsonjj.pythonanywhere.com';

const STELLANTIS_COLORS = {
  BLUE: '#243782',
  TANGERINE: '#e94e24',
  ANTHRACITE: '#282b34',
  TEXT_LIGHT: '#ffffff',
  LIGHT_GRAY_BG: '#f8f9fa',
  MEDIUM_GRAY_BORDER: '#ced4da',
};

function TelaCadastro({ onCadastroSucesso, onIrParaLogin }) {
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [email, setEmail] = useState('');
  
  const [cargosList, setCargosList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCargos, setIsLoadingCargos] = useState(false);

  useEffect(() => {
    const fetchCargos = async () => {
      setIsLoadingCargos(true);
      try {
        const response = await fetch(`${API_BASE_URL}/cargos`);
        if (!response.ok) {
          throw new Error(`Falha ao buscar cargos: ${response.statusText}`);
        }
        const data = await response.json();
        setCargosList(data);
        if (data.length > 0 && !cargo) {
          setCargo(data[0]); 
        }
      } catch (error) {
        console.error("Erro ao buscar cargos:", error);
        toast.error("Erro ao carregar lista de cargos.");
      } finally {
        setIsLoadingCargos(false);
      }
    };
    fetchCargos();
  }, []); // Dependência vazia para executar apenas uma vez

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !cargo) {
        toast.warn("Por favor, preencha todos os campos: Nome, Email e Cargo.");
        return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/register`, { // Chama a nova rota /register
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cargo, email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.erro || `Erro ao registar: ${response.status}`);
      }
      toast.success(data.mensagem || "Utilizador registado com sucesso! Agora pode fazer login.");
      if (onCadastroSucesso) {
        // Não faz login automático, apenas informa o App.jsx que pode ir para o login
        onCadastroSucesso(); 
      }
    } catch (error) {
      console.error("Erro no cadastro:", error);
      toast.error(error.message || "Não foi possível concluir o cadastro.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Estilos (semelhantes ao Home.jsx anterior, mas adaptados)
  const styles = {
    container: {
      maxWidth: "500px", margin: "60px auto", padding: "30px 35px",
      border: `2px solid ${STELLANTIS_COLORS.BLUE}`, borderRadius: "10px",
      backgroundColor: STELLANTIS_COLORS.LIGHT_GRAY_BG, textAlign: "center",
      fontFamily: "Arial, sans-serif", boxShadow: "0 6px 12px rgba(0, 0, 0, 0.1)",
    },
    title: {
      color: STELLANTIS_COLORS.BLUE, marginBottom: '25px',
      fontSize: '1.8em', fontWeight: 'bold',
    },
    form: { display: "flex", flexDirection: "column", gap: "18px" },
    inputGroup: { textAlign: 'left' },
    label: {
        display: 'block', marginBottom: '5px', color: STELLANTIS_COLORS.ANTHRACITE,
        fontSize: '0.9em', fontWeight: '500',
    },
    input: {
      padding: "12px 15px", borderRadius: "6px",
      border: `1px solid ${STELLANTIS_COLORS.MEDIUM_GRAY_BORDER}`, fontSize: "1em",
      width: "100%", boxSizing: "border-box", color: STELLANTIS_COLORS.ANTHRACITE,
    },
    button: {
      padding: "12px 15px", backgroundColor: STELLANTIS_COLORS.BLUE,
      color: STELLANTIS_COLORS.TEXT_LIGHT, border: "none", borderRadius: "6px",
      cursor: "pointer", fontSize: "1.1em", fontWeight: 'bold',
      transition: "background-color 0.3s ease", marginTop: '10px',
    },
    linkButton: {
        background: 'none', border: 'none', color: STELLANTIS_COLORS.BLUE,
        textDecoration: 'underline', cursor: 'pointer', padding: '10px 0',
        marginTop: '15px', fontSize: '0.9em',
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Primeiro Acesso / Cadastro</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label htmlFor="nome" style={styles.label}>Nome e Sobrenome:</label>
          <input type="text" id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required style={styles.input} />
        </div>
        <div style={styles.inputGroup}>
          <label htmlFor="email" style={styles.label}>Email:</label>
          <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input} />
        </div>
        <div style={styles.inputGroup}>
          <label htmlFor="cargo" style={styles.label}>Cargo:</label>
          <select id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} required style={styles.input} disabled={isLoadingCargos}>
            <option value="" disabled={cargo !== ""}>
              {isLoadingCargos ? "A carregar..." : (cargosList.length === 0 ? "Sem cargos disponíveis" : "Selecione um cargo")}
            </option>
            {!isLoadingCargos && cargosList.map((c, i) => (<option key={i} value={c}>{c}</option>))}
          </select>
        </div>
        <button type="submit" style={styles.button} disabled={isLoading || isLoadingCargos}>
          {isLoading ? "A Registar..." : "Registar"}
        </button>
      </form>
      <button onClick={onIrParaLogin} style={styles.linkButton}>
        Já está registado? Faça login
      </button>
    </div>
  );
}

export default TelaCadastro;
