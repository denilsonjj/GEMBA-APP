// GerenciarFatos.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './GerenciarFatos.css'; // Criaremos este arquivo CSS

const API_BASE_URL = 'http://127.0.0.1:5001';

// Ícones para feedback
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="feedback-icon">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ExclamationTriangleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="feedback-icon">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

function GerenciarFatos({ onVoltar }) {
  const [fatosEditaveis, setFatosEditaveis] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Estado para feedback por facto: { fatoId: { type: 'success'/'error', message: '...' } }
  const [feedbackPorFato, setFeedbackPorFato] = useState({}); 

  const carregarFatos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setFeedbackPorFato({});
    try {
      const response = await fetch(`${API_BASE_URL}/fatos`);
      if (!response.ok) {
        throw new Error(`Erro ao buscar fatos: ${response.statusText}`);
      }
      const data = await response.json();
      // Adicionar uma cópia dos valores originais para detetar alterações, se necessário,
      // ou simplesmente permitir que o utilizador edite e guarde.
      // Para simplificar, vamos apenas carregar os dados para edição.
      setFatosEditaveis(data.sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (err) {
      console.error("Erro ao buscar fatos:", err);
      setError(err.message || "Não foi possível carregar os fatos para edição.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarFatos();
  }, [carregarFatos]);

  const handleInputChange = (idFato, campo, valor) => {
    setFatosEditaveis(fatosAtuais =>
      fatosAtuais.map(fato =>
        fato.id === idFato ? { ...fato, [campo]: valor } : fato
      )
    );
    // Limpar feedback específico desse facto ao editar
    setFeedbackPorFato(prevFeedback => ({ ...prevFeedback, [idFato]: null }));
  };

  const handleGuardarFato = async (idFato) => {
    const fatoParaGuardar = fatosEditaveis.find(f => f.id === idFato);
    if (!fatoParaGuardar) return;

    // Limpar feedback anterior para este facto
    setFeedbackPorFato(prevFeedback => ({ ...prevFeedback, [idFato]: { isLoading: true } }));
    setError(null); // Limpar erro global

    // Apenas envia os campos que podem ser atualizados
    const payload = {
      nome: fatoParaGuardar.nome,
      limite_verde: fatoParaGuardar.limite_verde !== '' ? Number(fatoParaGuardar.limite_verde) : null,
      limite_laranja: fatoParaGuardar.limite_laranja !== '' ? Number(fatoParaGuardar.limite_laranja) : null,
      limite_vermelho: fatoParaGuardar.limite_vermelho !== '' ? Number(fatoParaGuardar.limite_vermelho) : null,
    };
    
    // Validar se os limites são números se não forem nulos
    if ((payload.limite_verde !== null && isNaN(payload.limite_verde)) ||
        (payload.limite_laranja !== null && isNaN(payload.limite_laranja)) ||
        (payload.limite_vermelho !== null && isNaN(payload.limite_vermelho))) {
      setFeedbackPorFato(prevFeedback => ({
        ...prevFeedback,
        [idFato]: { type: 'error', message: 'Limites devem ser números válidos.', isLoading: false }
      }));
      return;
    }
     if (!payload.nome || payload.nome.trim() === "") {
      setFeedbackPorFato(prevFeedback => ({
        ...prevFeedback,
        [idFato]: { type: 'error', message: 'O nome do facto não pode estar vazio.', isLoading: false }
      }));
      return;
    }


    try {
      const response = await fetch(`${API_BASE_URL}/fatos/${idFato}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(resultado.erro || `Erro do servidor: ${response.status}`);
      }
      setFeedbackPorFato(prevFeedback => ({
        ...prevFeedback,
        [idFato]: { type: 'success', message: resultado.mensagem || 'Facto atualizado!', isLoading: false }
      }));
      // Opcional: Recarregar todos os factos para garantir consistência,
      // mas a atualização local do estado já reflete a mudança.
      // carregarFatos(); 
    } catch (err) {
      console.error(`Erro ao guardar facto ${idFato}:`, err);
      setFeedbackPorFato(prevFeedback => ({
        ...prevFeedback,
        [idFato]: { type: 'error', message: err.message || 'Falha ao atualizar.', isLoading: false }
      }));
    }
  };

  if (isLoading && fatosEditaveis.length === 0) { // Mostrar loading apenas na carga inicial
    return <p className="loading-message">A carregar fatos para edição...</p>;
  }

  if (error && fatosEditaveis.length === 0) { // Mostrar erro apenas se a carga inicial falhar
    return <p className="error-message">{error}</p>;
  }

  return (
    <div className="gerenciar-fatos-container">
      <div className="gerenciar-fatos-header">
        <h2>Gerir Fatos Observáveis e Limites</h2>
        {onVoltar && (
            <button onClick={onVoltar} className="button-voltar">
            Voltar
            </button>
        )}
      </div>

      {error && <p className="error-message global-error-message">{error}</p>}

      {fatosEditaveis.length === 0 && !isLoading && (
        <p className="info-message">Nenhum facto encontrado para edição.</p>
      )}

      <div className="lista-fatos-editaveis">
        {fatosEditaveis.map(fato => (
          <div key={fato.id} className="fato-editavel-item">
            <div className="fato-nome-input">
              <label htmlFor={`nome-fato-${fato.id}`}>Nome do Facto:</label>
              <input
                type="text"
                id={`nome-fato-${fato.id}`}
                value={fato.nome}
                onChange={(e) => handleInputChange(fato.id, 'nome', e.target.value)}
                className="form-input-manage"
              />
            </div>
            <div className="limites-inputs-container">
              <div className="limite-input-group">
                <label htmlFor={`lv-${fato.id}`}>Limite Verde:</label>
                <input
                  type="number"
                  id={`lv-${fato.id}`}
                  value={fato.limite_verde === null ? '' : fato.limite_verde}
                  onChange={(e) => handleInputChange(fato.id, 'limite_verde', e.target.value === '' ? null : e.target.value)}
                  placeholder="N/A"
                  className="form-input-manage input-limite"
                />
              </div>
              <div className="limite-input-group">
                <label htmlFor={`ll-${fato.id}`}>Limite Laranja:</label>
                <input
                  type="number"
                  id={`ll-${fato.id}`}
                  value={fato.limite_laranja === null ? '' : fato.limite_laranja}
                  onChange={(e) => handleInputChange(fato.id, 'limite_laranja', e.target.value === '' ? null : e.target.value)}
                  placeholder="N/A"
                  className="form-input-manage input-limite"
                />
              </div>
              <div className="limite-input-group">
                <label htmlFor={`lvm-${fato.id}`}>Limite Vermelho:</label>
                <input
                  type="number"
                  id={`lvm-${fato.id}`}
                  value={fato.limite_vermelho === null ? '' : fato.limite_vermelho}
                  onChange={(e) => handleInputChange(fato.id, 'limite_vermelho', e.target.value === '' ? null : e.target.value)}
                  placeholder="N/A"
                  className="form-input-manage input-limite"
                />
              </div>
            </div>
            <div className="fato-actions">
              <button 
                onClick={() => handleGuardarFato(fato.id)} 
                disabled={feedbackPorFato[fato.id]?.isLoading}
                className="button-guardar-fato"
              >
                {feedbackPorFato[fato.id]?.isLoading ? 'A guardar...' : 'Guardar Alterações'}
              </button>
            </div>
            {feedbackPorFato[fato.id] && !feedbackPorFato[fato.id]?.isLoading && (
              <div className={`feedback-message-fato ${feedbackPorFato[fato.id].type}`}>
                {feedbackPorFato[fato.id].type === 'success' ? <CheckIcon /> : <ExclamationTriangleIcon />}
                <span>{feedbackPorFato[fato.id].message}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Futuramente, um botão para adicionar novo facto poderia vir aqui */}
    </div>
  );
}

export default GerenciarFatos;
