
import React, { useState, useEffect, useCallback } from 'react';
import '../styles/GerenciarFatos.css'; // CSS específico para este componente

// Importar toast para notificações
import { toast } from 'react-toastify';

// Ícones para feedback (já não são necessários para mensagens inline, mas podem ser usados nos toasts se personalizar)
// const CheckIcon = () => ( /* ... */ );
// const ExclamationTriangleIcon = () => ( /* ... */ );

const API_BASE_URL = 'http://127.0.0.1:5001';

function GerenciarFatos({ onVoltar }) {
  const [fatosEditaveis, setFatosEditaveis] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Estado 'error' global pode ser mantido para erros de carregamento inicial, ou também substituído por toast.
  // Por agora, vamos mantê-lo para o erro de carregamento inicial.
  const [errorCarregamento, setErrorCarregamento] = useState(null); 
  // Estado para controlar o loading de cada botão individualmente
  const [loadingPorFato, setLoadingPorFato] = useState({});


  const carregarFatos = useCallback(async () => {
    setIsLoading(true);
    setErrorCarregamento(null);
    // feedbackPorFato removido
    try {
      const response = await fetch(`${API_BASE_URL}/fatos`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({erro: `Erro HTTP: ${response.status}`}));
        throw new Error(errData.erro || `Erro ao buscar factos: ${response.statusText}`);
      }
      const data = await response.json();
      setFatosEditaveis(data.sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (err) {
      console.error("Erro ao buscar factos:", err);
      toast.error(err.message || "Não foi possível carregar os factos para edição.");
      setErrorCarregamento(err.message || "Não foi possível carregar os factos para edição.");
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
  };

  const handleGuardarFato = async (idFato) => {
    const fatoParaGuardar = fatosEditaveis.find(f => f.id === idFato);
    if (!fatoParaGuardar) return;

    // Ativar loading para este facto específico
    setLoadingPorFato(prev => ({ ...prev, [idFato]: true }));

    const payload = {
      nome: fatoParaGuardar.nome,
      limite_verde: fatoParaGuardar.limite_verde !== '' && fatoParaGuardar.limite_verde !== null ? Number(fatoParaGuardar.limite_verde) : null,
      limite_laranja: fatoParaGuardar.limite_laranja !== '' && fatoParaGuardar.limite_laranja !== null ? Number(fatoParaGuardar.limite_laranja) : null,
      limite_vermelho: fatoParaGuardar.limite_vermelho !== '' && fatoParaGuardar.limite_vermelho !== null ? Number(fatoParaGuardar.limite_vermelho) : null,
    };
    
    if ((payload.limite_verde !== null && isNaN(payload.limite_verde)) ||
        (payload.limite_laranja !== null && isNaN(payload.limite_laranja)) ||
        (payload.limite_vermelho !== null && isNaN(payload.limite_vermelho))) {
      toast.error('Limites devem ser números válidos ou vazios.');
      setLoadingPorFato(prev => ({ ...prev, [idFato]: false }));
      return;
    }
     if (!payload.nome || payload.nome.trim() === "") {
      toast.error('O nome do facto não pode estar vazio.');
      setLoadingPorFato(prev => ({ ...prev, [idFato]: false }));
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
      toast.success(resultado.mensagem || `Facto "${fatoParaGuardar.nome}" atualizado com sucesso!`);
      // Opcional: Se quiser recarregar todos os factos após uma atualização bem-sucedida
      // para garantir que a lista está 100% sincronizada com o backend (ex: se houver validações no backend que alterem os dados).
      // carregarFatos(); 
    } catch (err) {
      console.error(`Erro ao guardar facto ${idFato}:`, err);
      toast.error(err.message || `Falha ao atualizar o facto "${fatoParaGuardar.nome}".`);
    } finally {
      setLoadingPorFato(prev => ({ ...prev, [idFato]: false }));
    }
  };

  // Mostrar loading apenas na carga inicial
  if (isLoading && fatosEditaveis.length === 0) { 
    return <p className="loading-message">A carregar factos para edição...</p>;
  }

  // Mostrar erro apenas se a carga inicial falhar e não houver factos para exibir
  if (errorCarregamento && fatosEditaveis.length === 0) { 
    return <p className="error-message global-error-message">{errorCarregamento}</p>;
  }

  return (
    <div className="gerenciar-fatos-container">
      <div className="gerenciar-fatos-header">
        <h2>Gerir Factos Observáveis e Limites</h2>
        {onVoltar && (
            <button onClick={onVoltar} className="button-voltar">
            Voltar
            </button>
        )}
      </div>

      {/* Mensagem de erro global removida, pois os toasts tratarão disso */}
      {/* {errorCarregamento && <p className="error-message global-error-message">{errorCarregamento}</p>} */}

      {fatosEditaveis.length === 0 && !isLoading && (
        <p className="info-message">Nenhum facto encontrado para edição. Pode precisar de os criar primeiro se a funcionalidade existir, ou verificar o backend.</p>
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
                disabled={loadingPorFato[fato.id]} // Desabilitar botão enquanto este facto específico está a ser guardado
                className="button-guardar-fato"
              >
                {loadingPorFato[fato.id] ? 'A guardar...' : 'Guardar Alterações'}
              </button>
            </div>
            {/* JSX para feedbackPorFato removido */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GerenciarFatos;
