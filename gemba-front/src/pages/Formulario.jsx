// Formulario.jsx
import React, { useState, useEffect, useCallback } from "react";
import "./Formulario.css"; // Manteremos o seu CSS, mas muitos estilos da grelha não serão usados

const API_BASE_URL = 'http://127.0.0.1:5001';
// DIAS_SEMANA_REGISTRO ainda é útil para a lógica interna e para o resumo
const DIAS_SEMANA_REGISTRO = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_SEMANA_RESUMO = [...DIAS_SEMANA_REGISTRO, "Outro"];

// Função para obter a semana ISO atual
const getSemanaISOAtual = () => {
  const data = new Date();
  data.setHours(0, 0, 0, 0);
  data.setDate(data.getDate() + 3 - (data.getDay() + 6) % 7);
  const semana1 = new Date(data.getFullYear(), 0, 4);
  return data.getFullYear() + "-W" + (1 + Math.round(((data.getTime() - semana1.getTime()) / 86400000 - 3 + (semana1.getDay() + 6) % 7) / 7)).toString().padStart(2, '0');
};

// Função para calcular a cor de fundo baseada no valor e limites
const getValorBackgroundColor = (valor, fato) => {
  if (!fato || valor === '' || valor === null || valor === undefined) {
    return ''; 
  }
  const v = Number(valor);
  if (isNaN(v)) {
    return 'form-input-error'; 
  }
  const { limite_verde, limite_laranja } = fato;
  if (limite_verde === null || limite_laranja === null || limite_verde === undefined || limite_laranja === undefined) {
    return 'form-input-gray'; 
  }
  if (v <= limite_verde) {
    return 'form-input-green';
  } else if (v <= limite_laranja) {
    return 'form-input-orange';
  } else {
    return 'form-input-red';
  }
};

// Função para obter o nome do dia da semana atual em Português
const getDiaSemanaAtual = () => {
  const hoje = new Date();
  const diaIndex = hoje.getDay(); // 0 (Dom) a 6 (Sab)
  if (diaIndex >= 1 && diaIndex <= 6) { // De Segunda (1) a Sábado (6)
    return DIAS_SEMANA_REGISTRO[diaIndex - 1]; // Ajusta índice
  }
  return null; // Domingo ou dia inválido para registo
};

function Formulario({ usuarioLogado }) {
  const [fatosApi, setFatosApi] = useState([]);
  // Estado 'registros' mantém a mesma estrutura: { "fatoId_diaAtual": { valor: '', correcao: '' } }
  const [registros, setRegistros] = useState({});

  const [modoVisualizacao, setModoVisualizacao] = useState('registro');
  const [dadosParaResumo, setDadosParaResumo] = useState({ qtd_vermelho: 0, qtd_laranja: 0 });
  const [descricoesResumo, setDescricoesResumo] = useState(
    DIAS_SEMANA_RESUMO.reduce((acc, dia) => ({ ...acc, [dia.toLowerCase().replace('ç', 'c').replace('á', 'a')]: "" }), {})
  );
  const [semanaParaResumo, setSemanaParaResumo] = useState(getSemanaISOAtual());

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [diaAtual, setDiaAtual] = useState(null);

  useEffect(() => {
    setDiaAtual(getDiaSemanaAtual());
  }, []);

  useEffect(() => {
    if (modoVisualizacao === 'registro' && diaAtual) { // Só busca factos se for um dia de registo válido
      setIsLoading(true);
      setError(null);
      setSuccessMessage('');
      fetch(`${API_BASE_URL}/fatos`)
        .then((res) => {
          if (!res.ok) throw new Error(`Erro ao buscar factos: ${res.statusText}`);
          return res.json();
        })
        .then((data) => {
          const fatosOrdenados = data.sort((a, b) => a.nome.localeCompare(b.nome));
          setFatosApi(fatosOrdenados);
          // Inicializar o estado 'registros' para o dia atual
          const initialRegistros = {};
          fatosOrdenados.forEach(fato => {
            initialRegistros[`${fato.id}_${diaAtual}`] = { valor: "", correcao: "" };
          });
          setRegistros(initialRegistros);
        })
        .catch(err => {
          console.error("Erro ao buscar factos:", err);
          setError(`Não foi possível carregar os factos: ${err.message}`);
        })
        .finally(() => setIsLoading(false));
    } else if (modoVisualizacao === 'registro' && !diaAtual) {
      // Se for Domingo, por exemplo
      setFatosApi([]); // Limpa factos para não mostrar o formulário de registo
      setRegistros({});
    }
  }, [modoVisualizacao, diaAtual]);

  const handleRegistroChange = useCallback((fatoId, campo, valorInput) => {
    if (!diaAtual) return; // Não fazer nada se não for um dia de registo válido
    const key = `${fatoId}_${diaAtual}`; // Sempre usa o diaAtual
    setRegistros(prevRegistros => ({
      ...prevRegistros,
      [key]: {
        ...prevRegistros[key],
        [campo]: valorInput
      }
    }));
    setError(null);
    setSuccessMessage('');
  }, [diaAtual]); // Adicionar diaAtual às dependências
  
  const handleDescricaoResumoChange = (dia, valor) => {
    setDescricoesResumo(prev => ({ ...prev, [dia.toLowerCase().replace('ç', 'c').replace('á', 'a')]: valor }));
  };

  const enviarFormularioRegistros = async (e) => {
    e.preventDefault();
    if (!diaAtual) {
      setError("Não é possível registar hoje (Domingo ou dia inválido).");
      return;
    }
    setError(null);
    setSuccessMessage('');

    if (!usuarioLogado || !usuarioLogado.nome || !usuarioLogado.cargo) {
        setError("Informações do utilizador ausentes. Por favor, faça login novamente.");
        return;
    }

    const registrosParaEnviarBackend = [];
    let calculoQtdVermelho = 0;
    let calculoQtdLaranja = 0;

    fatosApi.forEach(fato => {
      const key = `${fato.id}_${diaAtual}`; // Apenas considera o dia atual
      const registroItem = registros[key];
      if (registroItem && registroItem.valor !== '' && registroItem.valor !== null) {
        const valorNum = Number(registroItem.valor);
        if (!isNaN(valorNum)) {
          const corCalculada = getValorBackgroundColor(valorNum, fato).replace('form-input-', '');
          registrosParaEnviarBackend.push({
            fato_nome: fato.nome,
            dia_semana: diaAtual, // Envia o dia da semana atual
            valor: valorNum,
            correcao: registroItem.correcao || "",
          });
          if (corCalculada === 'red') calculoQtdVermelho++;
          if (corCalculada === 'orange') calculoQtdLaranja++;
        }
      }
    });

    if (registrosParaEnviarBackend.length === 0) {
      setError("Nenhum valor foi preenchido para o dia de hoje.");
      setIsLoading(false);
      return;
    }

    const dadosPayload = {
      usuario: { nome: usuarioLogado.nome, cargo: usuarioLogado.cargo },
      registros_dia: registrosParaEnviarBackend,
    };

    setIsLoading(true);
    try {
      const resposta = await fetch(`${API_BASE_URL}/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosPayload),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) {
        throw new Error(resultado.erro || `Erro do servidor: ${resposta.status}`);
      }
      
      setSuccessMessage(resultado.mensagem || "Registos de hoje enviados com sucesso! Prepare o resumo semanal.");
      setDadosParaResumo({ qtd_vermelho: calculoQtdVermelho, qtd_laranja: calculoQtdLaranja });
      setModoVisualizacao('resumo');
      // Limpar registos do dia atual
      const clearedRegistros = {};
      fatosApi.forEach(fato => {
        clearedRegistros[`${fato.id}_${diaAtual}`] = { valor: "", correcao: "" };
      });
      setRegistros(clearedRegistros);

    } catch (err) {
      console.error("Erro ao enviar formulário de registos:", err);
      setError(err.message || "Ocorreu um erro ao enviar os dados de registo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalvarResumo = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');
    if (!usuarioLogado || !usuarioLogado.nome || !usuarioLogado.cargo) {
        setError("Informações do utilizador ausentes para salvar o resumo."); return;
    }
    if (!semanaParaResumo) {
        setError("Por favor, informe a semana para o resumo."); return;
    }
    const payloadResumo = {
        usuario: { nome: usuarioLogado.nome, cargo: usuarioLogado.cargo },
        semana: semanaParaResumo,
        qtd_vermelho: dadosParaResumo.qtd_vermelho,
        qtd_laranja: dadosParaResumo.qtd_laranja,
        descricoes: descricoesResumo
    };
    setIsLoading(true);
    try {
        const resposta = await fetch(`${API_BASE_URL}/resumo`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadResumo),
        });
        const resultado = await resposta.json();
        if (!resposta.ok) { throw new Error(resultado.erro || `Erro do servidor: ${resposta.status}`); }
        setSuccessMessage(resultado.mensagem || "Resumo semanal salvo com sucesso!");
    } catch (err) {
        console.error("Erro ao salvar resumo:", err);
        setError(err.message || "Ocorreu um erro ao salvar o resumo semanal.");
    } finally { setIsLoading(false); }
  };

  const iniciarNovoRegistro = () => {
    setModoVisualizacao('registro'); 
    setError(null);
    setSuccessMessage('');
    setDescricoesResumo(DIAS_SEMANA_RESUMO.reduce((acc, dia) => ({ ...acc, [dia.toLowerCase().replace('ç','c').replace('á','a')]: "" }), {}));
    setSemanaParaResumo(getSemanaISOAtual());
    // O useEffect de [modoVisualizacao, diaAtual] irá recarregar os factos e limpar os registos.
  };

  // Renderização do Formulário de Registo Diário (focado no dia atual)
  const renderFormularioRegistro = () => {
    if (!diaAtual) { // Se for Domingo ou dia inválido
      return (
        <div className="info-message dia-nao-util">
          Hoje é Domingo. Não há registos a serem feitos.
        </div>
      );
    }

    return (
      <form onSubmit={enviarFormularioRegistros} className="form-dia-atual">
        <h3 className="titulo-dia-atual">Registos para Hoje: {diaAtual}</h3>
        {fatosApi.map((fato) => {
          const key = `${fato.id}_${diaAtual}`;
          const valorAtual = registros[key]?.valor ?? '';
          const correcaoAtual = registros[key]?.correcao ?? '';
          const bgColorClass = getValorBackgroundColor(valorAtual, fato);

          return (
            <div key={fato.id} className="fato-item-dia-atual">
              <div className="fato-info">
                <span className="fato-nome">{fato.nome}</span>
                <div className="limites-info-visual">
                  <span className="limite-item"> <span className="limite-dot dot-green"></span> {fato.limite_verde ?? 'N/A'} </span>
                  <span className="limite-item"> <span className="limite-dot dot-orange"></span> {fato.limite_laranja ?? 'N/A'} </span>
                  <span className="limite-item"> <span className="limite-dot dot-red"></span> {fato.limite_vermelho ?? 'N/A'} </span>
                </div>
              </div>
              <div className="fato-inputs">
                <div className="input-group-dia-atual">
                  <label htmlFor={`valor-${key}`}>Valor Ocorrências:</label>
                  <input
                    id={`valor-${key}`}
                    type="number"
                    placeholder="Valor"
                    value={valorAtual}
                    onChange={(e) => handleRegistroChange(fato.id, 'valor', e.target.value)}
                    className={`form-input input-valor ${bgColorClass}`}
                  />
                </div>
                <div className="input-group-dia-atual">
                  <label htmlFor={`correcao-${key}`}>Descrição:</label>
                  <input
                    id={`correcao-${key}`}
                    type="text"
                    placeholder="Descrição (opcional)"
                    value={correcaoAtual}
                    onChange={(e) => handleRegistroChange(fato.id, 'correcao', e.target.value)}
                    className="form-input input-correcao"
                  />
                </div>
              </div>
            </div>
          );
        })}
        <div className="form-actions">
          <button type="submit" className="button-submit" disabled={isLoading || fatosApi.length === 0}>
            {isLoading ? "A Enviar..." : "Enviar Registos de Hoje e Ir para Resumo"}
          </button>
        </div>
      </form>
    );
  };
  
  const renderFormularioResumo = () => (
    // ... (código do formulário de resumo mantido como antes) ...
    <form onSubmit={handleSalvarResumo} className="resumo-form-container">
        <h3>Resumo Semanal</h3>
        <div className="resumo-info-counts">
            <p>Total em Zona Vermelha (Hoje): <span className="count-red">{dadosParaResumo.qtd_vermelho}</span></p>
            <p>Total em Zona Laranja (Hoje): <span className="count-orange">{dadosParaResumo.qtd_laranja}</span></p>
        </div>
        <div className="form-field">
            <label htmlFor="semanaResumo">Semana (formato AAAA-WNN, ex: {getSemanaISOAtual()}):</label>
            <input 
                type="text" id="semanaResumo" value={semanaParaResumo} 
                onChange={(e) => setSemanaParaResumo(e.target.value)} required 
                className="form-input" placeholder={`Ex: ${getSemanaISOAtual()}`}
            />
        </div>
        <h4>Descrições Diárias (para o resumo da semana):</h4>
        {DIAS_SEMANA_RESUMO.map(dia => {
            const diaKey = dia.toLowerCase().replace('ç', 'c').replace('á', 'a');
            return (
                <div className="form-field" key={diaKey}>
                    <label htmlFor={`desc-${diaKey}`}>{dia}:</label>
                    <textarea 
                        id={`desc-${diaKey}`} value={descricoesResumo[diaKey]}
                        onChange={(e) => handleDescricaoResumoChange(diaKey, e.target.value)}
                        rows="3" className="form-textarea"
                        placeholder={`Descreva os principais pontos da ${dia.toLowerCase()}`}
                    />
                </div>);
        })}
        <div className="form-actions">
            <button type="button" onClick={iniciarNovoRegistro} className="button-secondary">Iniciar Novo Registo Diário</button>
            <button type="submit" className="button-submit" disabled={isLoading}>{isLoading ? "A Salvar Resumo..." : "Salvar Relatório Semanal"}</button>
        </div>
    </form>
  );

  return (
    <div className="form-container">
      <div className="form-header">
        <h2>{modoVisualizacao === 'registro' ? `Formulário de Registo (${diaAtual || 'Dia Inválido'})` : 'Resumo Semanal'}</h2>
        <div className="user-info">
          <p><strong>Utilizador:</strong> {usuarioLogado.nome}</p>
          <p><strong>Cargo:</strong> {usuarioLogado.cargo}</p>
        </div>
      </div>

      {isLoading && modoVisualizacao === 'registro' && <p className="loading-message">A carregar dados...</p>}
      {isLoading && modoVisualizacao === 'resumo' && <p className="loading-message">A processar...</p>}
      
      {error && <p className="error-message">{error}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}

      {modoVisualizacao === 'registro' && !isLoading && fatosApi.length === 0 && diaAtual && (
        <p className="info-message">Nenhum facto observável carregado. Verifique a ligação com o servidor ou a configuração dos factos.</p>
      )}
      
      {modoVisualizacao === 'registro' && renderFormularioRegistro()}
      {modoVisualizacao === 'resumo' && renderFormularioResumo()}
    </div>
  );
}

export default Formulario;
