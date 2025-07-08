// Formulario.jsx
import React, { useState, useEffect, useCallback } from "react";
import "../styles/Formulario.css"; 
import { toast } from 'react-toastify';

const API_BASE_URL = 'https://denilsonjj.pythonanywhere.com';
const DIAS_SEMANA_REGISTRO = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const getSemanaISOAtual = () => {
  const data = new Date();
  data.setHours(0, 0, 0, 0);
  data.setDate(data.getDate() + 3 - (data.getDay() + 6) % 7);
  const semana1 = new Date(data.getFullYear(), 0, 4);
  return data.getFullYear() + "-W" + (1 + Math.round(((data.getTime() - semana1.getTime()) / 86400000 - 3 + (semana1.getDay() + 6) % 7) / 7)).toString().padStart(2, '0');
};

const getValorBackgroundColor = (valor, fato) => {
  if (!fato || valor === '' || valor === null || valor === undefined) return ''; 
  const v = Number(valor);
  if (isNaN(v)) return 'form-input-error'; 
  const { limite_verde, limite_laranja } = fato;
  if (limite_verde === null || limite_laranja === null || limite_verde === undefined || limite_laranja === undefined) return 'form-input-gray'; 
  if (v <= limite_verde) return 'form-input-green';
  if (v <= limite_laranja) return 'form-input-orange'; 
  return 'form-input-red';
};

const getDiaSemanaAtual = () => {
  const hoje = new Date();
  const diaIndex = hoje.getDay(); 
  if (diaIndex >= 1 && diaIndex <= 6) { 
    return DIAS_SEMANA_REGISTRO[diaIndex - 1]; 
  }
  return null; 
};


const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay-gemba">
            <div className="modal-content-gemba">
                <h4>{title}</h4>
                <p>{message}</p>
                <div className="modal-actions-gemba">
                    <button onClick={onConfirm} className="button-danger-gemba">Confirmar Deleção</button>
                    <button onClick={onClose} className="button-secondary">Cancelar</button>
                </div>
            </div>
        </div>
    );
};


function Formulario({ usuarioLogado, onLogout }) { 
  const [fatosApi, setFatosApi] = useState([]);
  const [registros, setRegistros] = useState({});
  const [modoVisualizacao, setModoVisualizacao] = useState('registro');
  const [dadosParaResumo, setDadosParaResumo] = useState({ qtd_vermelho: 0, qtd_laranja: 0 });
  const [observacaoGeralSemana, setObservacaoGeralSemana] = useState("");
  const [semanaParaResumo, setSemanaParaResumo] = useState(getSemanaISOAtual());
  const [isLoading, setIsLoading] = useState(false);
  const [diaAtual, setDiaAtual] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); 

  useEffect(() => {
    setDiaAtual(getDiaSemanaAtual());
  }, []);

  useEffect(() => {
    if (modoVisualizacao === 'registro' && diaAtual) {
      setIsLoading(true);
      fetch(`${API_BASE_URL}/fatos`)
        .then((res) => {
          if (!res.ok) throw new Error(`Erro ao buscar fatos: ${res.statusText}`);
          return res.json();
        })
        .then((data) => {
          const fatosOrdenados = data.sort((a, b) => a.nome.localeCompare(b.nome));
          setFatosApi(fatosOrdenados);
          const initialRegistros = {};
          fatosOrdenados.forEach(fato => {
            initialRegistros[`${fato.id}_${diaAtual}`] = { valor: "", descricao_fato_dia: "" };
          });
          setRegistros(initialRegistros);
        })
        .catch(err => {
          toast.error(`Não foi possível carregar os fatos: ${err.message}`);
        })
        .finally(() => setIsLoading(false));
    } else if (modoVisualizacao === 'registro' && !diaAtual) {
      setFatosApi([]);
      setRegistros({});
    }
  }, [modoVisualizacao, diaAtual]);

  const handleRegistroChange = useCallback((fatoId, campo, valorInput) => {
    if (!diaAtual) return;
    const key = `${fatoId}_${diaAtual}`;
    setRegistros(prevRegistros => ({
      ...prevRegistros,
      [key]: {
        ...prevRegistros[key],
        [campo]: valorInput 
      }
    }));
  }, [diaAtual]);
  
  const enviarFormularioRegistros = async (e) => {
    e.preventDefault();
    if (!diaAtual) {
      toast.warn("Não é possível registar hoje (Domingo ou dia inválido).");
      return;
    }
    if (!usuarioLogado || typeof usuarioLogado.id !== 'number') { 
        toast.error("Informações do utilizador (ID) ausentes. Por favor, faça login novamente.");
        return;
    }

    const registrosParaEnviarBackend = [];
    let calculoQtdVermelho = 0;
    let calculoQtdLaranja = 0;

    fatosApi.forEach(fato => {
      const key = `${fato.id}_${diaAtual}`;
      const registroItem = registros[key];
      // Envia apenas se 'valor' não for string vazia. Se for 0, envia.
      if (registroItem && registroItem.valor !== '' && registroItem.valor !== null && registroItem.valor !== undefined) {
        const valorNum = Number(registroItem.valor);
        if (!isNaN(valorNum)) {
          const corCalculada = getValorBackgroundColor(valorNum, fato).replace('form-input-', '');
          registrosParaEnviarBackend.push({
            fato_nome: fato.nome,
            dia_semana: diaAtual,
            valor: valorNum,
            descricao_fato_dia: registroItem.descricao_fato_dia || "",
          });
          if (corCalculada === 'red') calculoQtdVermelho++;
          if (corCalculada === 'orange') calculoQtdLaranja++;
        } else if (registroItem.valor !== "") { // Se não for número mas também não for string vazia, logar.
            toast.warn(`Valor '${registroItem.valor}' para o fato '${fato.nome}' não é um número válido e não será salvo.`);
        }
      }
    });

    if (registrosParaEnviarBackend.length === 0) {
      toast.warn("Nenhum valor válido foi preenchido para o dia de hoje.");
      // setIsLoading(false); // Removido pois o finally já faz isso
      return;
    }

    const dadosPayload = {
      usuario_id: usuarioLogado.id,
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
      
      toast.success(resultado.mensagem || "Registos de hoje enviados com sucesso!");
      setDadosParaResumo({ qtd_vermelho: calculoQtdVermelho, qtd_laranja: calculoQtdLaranja });
      
      
      const clearedRegistros = {};
      fatosApi.forEach(fato => {
        clearedRegistros[`${fato.id}_${diaAtual}`] = { valor: "", descricao_fato_dia: "" };
      });
      setRegistros(clearedRegistros); 

    } catch (err) {
      toast.error(err.message || "Ocorreu um erro ao enviar os dados de registo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalvarResumo = async (e) => {
    e.preventDefault();
    if (!usuarioLogado || typeof usuarioLogado.id !== 'number') {
        toast.error("Informações do utilizador (ID) ausentes para salvar o resumo."); return;
    }
    if (!semanaParaResumo) {
        toast.warn("Por favor, informe a semana para o resumo."); return;
    }
    const payloadResumo = {
        usuario_id: usuarioLogado.id,
        semana: semanaParaResumo,
        qtd_vermelho: dadosParaResumo.qtd_vermelho,
        qtd_laranja: dadosParaResumo.qtd_laranja,
        observacao_geral_semana: observacaoGeralSemana 
    };
    setIsLoading(true);
    try {
        const resposta = await fetch(`${API_BASE_URL}/resumo`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadResumo),
        });
        const resultado = await resposta.json();
        if (!resposta.ok) { throw new Error(resultado.erro || `Erro do servidor: ${resposta.status}`); }
        toast.success(resultado.mensagem || "Resumo semanal salvo com sucesso!");
        setObservacaoGeralSemana(""); 
    } catch (err) {
        toast.error(err.message || "Ocorreu um erro ao salvar o resumo semanal.");
    } finally { setIsLoading(false); }
  };

  const iniciarNovoRegistro = () => {
    setModoVisualizacao('registro'); 
    setObservacaoGeralSemana("");
    setSemanaParaResumo(getSemanaISOAtual());
    
    if (diaAtual) {
        setIsLoading(true);
        fetch(`${API_BASE_URL}/fatos`)
            .then(res => res.json())
            .then(data => {
                const fatosOrdenados = data.sort((a, b) => a.nome.localeCompare(b.nome));
                setFatosApi(fatosOrdenados);
                const initialRegistros = {};
                fatosOrdenados.forEach(fato => {
                    initialRegistros[`${fato.id}_${diaAtual}`] = { valor: "", descricao_fato_dia: "" };
                });
                setRegistros(initialRegistros);
            })
            .catch(err => toast.error(`Erro ao recarregar fatos: ${err.message}`))
            .finally(() => setIsLoading(false));
    }
  };

  const handleDeleteMeusDados = async () => {
    if (!usuarioLogado || typeof usuarioLogado.id !== 'number') {
        toast.error("Informações do utilizador não encontradas para esta operação.");
        return;
    }
    setIsLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/meus_dados`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuarioLogado.id }),
        });
        const resultado = await response.json();
        if (!response.ok) {
            throw new Error(resultado.erro || `Erro do servidor: ${response.status}`);
        }
        toast.success(resultado.mensagem || "Todos os seus dados foram apagados com sucesso!");
      
        setRegistros({});
        setDadosParaResumo({ qtd_vermelho: 0, qtd_laranja: 0 });
        setObservacaoGeralSemana("");
       
        setIsDeleteModalOpen(false); // Fecha o modal
    } catch (err) {
        toast.error(err.message || "Ocorreu um erro ao apagar seus dados.");
    } finally {
        setIsLoading(false);
    }
  };


  const renderFormularioRegistro = () => {
    if (!diaAtual) {
      return ( <div className="info-message dia-nao-util"> Hoje é Domingo. Não há registos a serem feitos. </div> );
    }
    return (
      <form onSubmit={enviarFormularioRegistros} className="form-dia-atual">
        <h3 className="titulo-dia-atual">Registos para Hoje: {diaAtual}</h3>
        {fatosApi.map((fato) => {
          const key = `${fato.id}_${diaAtual}`;
          const valorAtual = registros[key]?.valor ?? '';
          const descricaoAtual = registros[key]?.descricao_fato_dia ?? ''; 
          const bgColorClass = getValorBackgroundColor(valorAtual, fato);
          return (
            <div key={fato.id} className="fato-item-dia-atual">
              <div className="fato-info">
                <span className="fato-nome">{fato.nome}</span>
                <div className="limites-info-visual">
                  <span className="limite-item"><span className="limite-dot dot-green"></span> {fato.limite_verde ?? 'N/A'}</span>
                  <span className="limite-item"><span className="limite-dot dot-orange"></span> {fato.limite_laranja ?? 'N/A'}</span>
                  <span className="limite-item"><span className="limite-dot dot-red"></span> {fato.limite_vermelho ?? 'N/A'}</span>
                </div>
              </div>
              <div className="fato-inputs">
                <div className="input-group-dia-atual">
                  <label htmlFor={`valor-${key}`}>Valor Ocorrências:</label>
                  <input id={`valor-${key}`} type="number" placeholder="Valor" value={valorAtual} onChange={(e) => handleRegistroChange(fato.id, 'valor', e.target.value)} className={`form-input input-valor ${bgColorClass}`} />
                </div>
                <div className="input-group-dia-atual">
                  <label htmlFor={`descDia-${key}`}>Descrição do Dia (para este fato):</label>
                  <input id={`descDia-${key}`} type="text" placeholder="Observações sobre este fato hoje (opcional)" value={descricaoAtual} onChange={(e) => handleRegistroChange(fato.id, 'descricao_fato_dia', e.target.value)} className="form-input input-descricao-dia" />
                </div>
              </div>
            </div> );
        })}
        <div className="form-actions">
          <button type="submit" className="button-submit" disabled={isLoading || fatosApi.length === 0}>
            {isLoading ? "A Enviar..." : "Concluir Registos de Hoje"}
          </button>
        </div>
      </form>
    );
  };
  
  const renderFormularioResumo = () => (
    <form onSubmit={handleSalvarResumo} className="resumo-form-container">
        <h3>Resumo Semanal</h3>
        <div className="resumo-info-counts">
            <p>Total em Zona Vermelha (Hoje): <span className="count-red">{dadosParaResumo.qtd_vermelho}</span></p>
            <p>Total em Zona Laranja (Hoje): <span className="count-orange">{dadosParaResumo.qtd_laranja}</span></p>
        </div>
        <div className="form-field">
            <label htmlFor="semanaResumo">Semana (formato AAAA-WNN, ex: {getSemanaISOAtual()}):</label>
            <input type="text" id="semanaResumo" value={semanaParaResumo} onChange={(e) => setSemanaParaResumo(e.target.value)} required className="form-input" placeholder={`Ex: ${getSemanaISOAtual()}`} />
        </div>
        <div className="form-field">
            <label htmlFor="observacaoGeralSemana">Observação Geral da Semana (opcional):</label>
            <textarea id="observacaoGeralSemana" value={observacaoGeralSemana} onChange={(e) => setObservacaoGeralSemana(e.target.value)} rows="4" className="form-textarea" placeholder="Insira aqui notas ou observações gerais sobre a semana." />
        </div>
        <div className="form-actions">
            <button type="button" onClick={iniciarNovoRegistro} className="button-secondary">Ir para Registo Diário</button>
            <button type="submit" className="button-submit" disabled={isLoading}>{isLoading ? "A Salvar Resumo..." : "Salvar Resumo da Semana"}</button>
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
      
      {/* Botões de navegação de modo */}
      <div className="modo-visualizacao-toggle" style={{ marginBottom: '20px', textAlign: 'center' }}>
        <button 
            onClick={() => setModoVisualizacao('registro')} 
            className={modoVisualizacao === 'registro' ? 'button-submit' : 'button-secondary'}
            style={{ marginRight: '10px' }}
        >
            Registo Diário
        </button>
        <button 
            onClick={() => setModoVisualizacao('resumo')}
            className={modoVisualizacao === 'resumo' ? 'button-submit' : 'button-secondary'}
        >
            Resumo Semanal
        </button>
      </div>
      {isLoading && <p className="loading-message">A processar...</p>} 
            
      {modoVisualizacao === 'registro' && !isLoading && fatosApi.length === 0 && diaAtual && (
        <p className="info-message">Nenhum fato observável carregado para hoje.</p>
      )}
      
      {modoVisualizacao === 'registro' && renderFormularioRegistro()}
      {modoVisualizacao === 'resumo' && renderFormularioResumo()}

      {/* Botão para Apagar Dados do Usuário */}
      <div className="user-data-actions" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
        <button 
            onClick={() => setIsDeleteModalOpen(true)} 
            className="button-danger-gemba" 
            title="Esta ação não pode ser desfeita."
        >
            Apagar Todos os Meus Dados
        </button>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteMeusDados}
        title="Confirmar Deleção de Dados"
        message={`Tem a certeza que deseja apagar permanentemente todos os seus registos e resumos? Esta ação não pode ser desfeita e os dados de ${usuarioLogado.nome} serão removidos.`}
      />
    </div>
  );
}

export default Formulario;
