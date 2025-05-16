// ListaResumos.jsx
import React, { useState, useEffect, useMemo } from 'react';
import './ListaResumos.css'; // Mantém o seu CSS existente

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_BASE_URL = 'http://127.0.0.1:5001';

const DIAS_SEMANA_REGISTRO_LOCAL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_SEMANA_RESUMO = [...DIAS_SEMANA_REGISTRO_LOCAL, "Outro"];

const getSemanaISOFromTimestamp = (timestamp) => {
  if (!timestamp) return "Semana Desconhecida";
  const datePart = timestamp.split(" ")[0];
  const data = new Date(datePart);

  if (isNaN(data.getTime())) {
    // console.warn("Timestamp inválido para getSemanaISOFromTimestamp:", timestamp);
    return "Semana Inválida";
  }

  data.setHours(0, 0, 0, 0);
  data.setDate(data.getDate() + 3 - (data.getDay() + 6) % 7);
  const semana1 = new Date(data.getFullYear(), 0, 4);
  const weekNumber = (1 + Math.round(((data.getTime() - semana1.getTime()) / 86400000 - 3 + (semana1.getDay() + 6) % 7) / 7));
  return `${data.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
};

function ListaResumos({ onVoltar }) {
  const [resumosAgregados, setResumosAgregados] = useState([]);
  const [todosOsRegistos, setTodosOsRegistos] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resumoExpandido, setResumoExpandido] = useState(null);
  
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedWeekFilter, setSelectedWeekFilter] = useState("todas");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const resResumos = await fetch(`${API_BASE_URL}/resumos`);
        if (!resResumos.ok) throw new Error(`Erro ao buscar resumos agregados: ${resResumos.statusText}`);
        const dataResumos = await resResumos.json();
        const dataResumosOrdenada = dataResumos.sort((a, b) => a.semana.localeCompare(b.semana));
        setResumosAgregados(dataResumosOrdenada);

        const resRegistos = await fetch(`${API_BASE_URL}/dados`);
        if (!resRegistos.ok) throw new Error(`Erro ao buscar todos os registos: ${resRegistos.statusText}`);
        const dataRegistos = await resRegistos.json();
        setTodosOsRegistos(dataRegistos);

        if (dataRegistos.length > 0) {
            const semanasUnicas = [...new Set(dataRegistos.map(reg => getSemanaISOFromTimestamp(reg.data_registro)))]
                                .filter(semana => semana !== "Semana Desconhecida" && semana !== "Semana Inválida")
                                .sort((a,b) => b.localeCompare(a));
            setAvailableWeeks(semanasUnicas);
        }

      } catch (err) {
        console.error("Erro ao buscar dados:", err);
        setError(err.message || "Não foi possível carregar os dados necessários.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleDetalhesResumo = (resumoId) => {
    setResumoExpandido(resumoExpandido === resumoId ? null : resumoId);
  };

  const dadosGrafico = useMemo(() => {
    if (todosOsRegistos.length === 0) {
        return [];
    }

    const registosParaGrafico = selectedWeekFilter === "todas"
      ? todosOsRegistos
      : todosOsRegistos.filter(reg => {
          const semanaDoRegisto = getSemanaISOFromTimestamp(reg.data_registro);
          return semanaDoRegisto === selectedWeekFilter;
        });
    
    const agrupadoPorFacto = registosParaGrafico.reduce((acc, reg) => {
      const nomeFacto = reg.nome_fato; 
      const cor = reg.cor ? reg.cor.toLowerCase() : null; 

      if (!nomeFacto) { 
        return acc;
      }

      if (!acc[nomeFacto]) {
        acc[nomeFacto] = { name: nomeFacto, Vermelho: 0, Laranja: 0 };
      }
      if (cor === 'vermelho') acc[nomeFacto].Vermelho++;
      if (cor === 'laranja') acc[nomeFacto].Laranja++;
      return acc;
    }, {});
    
    const resultadoGrafico = Object.values(agrupadoPorFacto).sort((a,b) => a.name.localeCompare(b.name));
    return resultadoGrafico;
  }, [todosOsRegistos, selectedWeekFilter]);

  const alturaGrafico = useMemo(() => {
    const baseHeight = 200; 
    const heightPerBar = 30;
    const numFactos = dadosGrafico.length;
    return numFactos > 0 ? Math.max(baseHeight, numFactos * heightPerBar + 50) : baseHeight;
  }, [dadosGrafico]);


  if (isLoading) {
    return <p className="loading-message">A carregar dados...</p>;
  }
  if (error) {
    return <p className="error-message">{error}</p>;
  }

  return (
    <div className="lista-resumos-container">
      <div className="lista-resumos-header">
        <h2>Histórico de Resumos Semanais</h2>
        <button onClick={onVoltar} className="button-voltar">
          Voltar ao Formulário
        </button>
      </div>

      <div className="filtros-grafico-container">
        <div className="filtro-item">
          <label htmlFor="filtro-semana-grafico" className="filtro-label">Visualizar Gráfico para Semana:</label>
          <select 
            id="filtro-semana-grafico" 
            value={selectedWeekFilter} 
            onChange={(e) => setSelectedWeekFilter(e.target.value)}
            className="filtro-select"
          >
            <option value="todas">Todas as Semanas (Agregado)</option>
            {availableWeeks.map(semana => (
              <option key={semana} value={semana}>{semana}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grafico-container">
        <h3>Ocorrências por Facto ({selectedWeekFilter === "todas" ? "Período Completo" : `Semana: ${selectedWeekFilter}`})</h3>
        {dadosGrafico.length > 0 ? (
          <ResponsiveContainer width="100%" height={alturaGrafico}>
            <BarChart 
              data={dadosGrafico} 
              layout="vertical"
              margin={{
                top: 5, 
                right: 30,
                left: 5,
                bottom: 20 
              }}
              barGap={4}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tick={{fontSize: '0.8em'}} />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={120} 
                tick={{fontSize: '0.8em'}}
                interval={0} 
                tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 18)}...` : value}
              />
              <Tooltip 
                formatter={(value, name, props) => [`${value} ocorrências`, name.startsWith('Zona') ? name : props.payload.name ]}
                wrapperStyle={{fontSize: '0.9em'}}
              />
              <Legend wrapperStyle={{fontSize: '0.9em', paddingTop: '10px'}}/>
              <Bar dataKey="Vermelho" fill="#ef4444" name="Zona Vermelha" barSize={12} />
              <Bar dataKey="Laranja" fill="#f97316" name="Zona Laranja" barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          !isLoading && <p className="info-message">Sem dados para exibir no gráfico com a semana selecionada.</p>
        )}
      </div>

      {/* Tabela de Resumos Agregados */}
      {resumosAgregados.length > 0 && (
        <div className="table-responsive-container lista-resumos-tabela-container">
          <h3>Detalhes dos Resumos Semanais (Agregados Gerais)</h3>
          {/* A classe 'responsive-table' será usada pelo CSS para o layout de cartões */}
          <table className="resumos-table responsive-table">
            <thead>
              <tr>
                <th>Semana</th>
                <th>Utilizador</th>
                <th>Cargo</th>
                <th className="count-column">Qtd. Vermelho</th>
                <th className="count-column">Qtd. Laranja</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {resumosAgregados.map((resumo) => (
                <React.Fragment key={resumo.resumo_id}>
                  <tr>
                    {/* Adicionar atributos data-label */}
                    <td data-label="Semana:">{resumo.semana}</td>
                    <td data-label="Utilizador:">{resumo.nome_usuario}</td>
                    <td data-label="Cargo:">{resumo.cargo_usuario}</td>
                    <td data-label="Qtd. Vermelho:" className="count-column count-red">{resumo.qtd_vermelho}</td>
                    <td data-label="Qtd. Laranja:" className="count-column count-orange">{resumo.qtd_laranja}</td>
                    <td data-label="Ações:">
                      <button onClick={() => toggleDetalhesResumo(resumo.resumo_id)} className="button-detalhes">
                        {resumoExpandido === resumo.resumo_id ? 'Ocultar' : 'Detalhes'}
                      </button>
                    </td>
                  </tr>
                  {resumoExpandido === resumo.resumo_id && (
                    <tr className="detalhes-row responsive-details-row">
                      <td colSpan="6"> {/* colSpan ainda é útil para o layout de tabela em ecrãs maiores */}
                        <div className="detalhes-content">
                          <h4>Descrições Diárias (Semana: {resumo.semana}):</h4>
                          {DIAS_SEMANA_RESUMO.map(dia => {
                            const diaKeyBackend = `descricao_${dia.toLowerCase().replace('ç', 'c').replace('á', 'a')}`;
                            return (
                                <div key={dia} className="descricao-dia">
                                    <strong>{dia}:</strong>
                                    <p>{resumo[diaKeyBackend] || <em>Sem descrição</em>}</p>
                                </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
       {resumosAgregados.length === 0 && !isLoading && (
        <p className="info-message">Nenhum resumo semanal agregado encontrado.</p>
      )}
    </div>
  );
}

export default ListaResumos;
