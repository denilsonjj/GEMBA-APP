
import React, { useState, useEffect, useMemo } from 'react';
import "../styles/ListaResumos.css"; // Estilos específicos para a página
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

import TabelaRegistos from '../components/TabelaRegistros'; // Importa o componente TabelaRegistos

const API_BASE_URL = 'http://127.0.0.1:5001';


const getSemanaISOFromTimestamp = (timestamp) => {
    if (!timestamp) return "Semana Desconhecida";
    const datePart = timestamp.split(" ")[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return "Data Inválida";
    const parts = datePart.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(Date.UTC(year, month, day));
    if (isNaN(date.getTime())) return "Semana Inválida";
    const dayOfWeekISO = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
    date.setUTCDate(date.getUTCDate() - dayOfWeekISO + 4);
    const yearISO = date.getUTCFullYear();
    const firstDayOfYear = new Date(Date.UTC(yearISO, 0, 1));
    const dayOfYear = Math.floor((date.getTime() - firstDayOfYear.getTime()) / 86400000) + 1;
    const weekNumber = Math.floor((dayOfYear - 1) / 7) + 1;
    return `${yearISO}-W${weekNumber.toString().padStart(2, '0')}`;
};


// ListaResumos agora espera a prop 'usuarioLogado' para passar para TabelaRegistos
function ListaResumos({ usuarioLogado, onVoltar }) { 
  console.log('usuarios: ', usuarioLogado)
  const [todosOsRegistosParaGrafico, setTodosOsRegistosParaGrafico] = useState([]);
  const [isLoadingGrafico, setIsLoadingGrafico] = useState(false);
  const [errorPage, setErrorPage] = useState(null); // Erro geral para a página

  useEffect(() => {
    const fetchDataParaGrafico = async () => {
      setIsLoadingGrafico(true);
      setErrorPage(null); 
      try {
        const resRegistos = await fetch(`${API_BASE_URL}/dados`);
        if (!resRegistos.ok) {
          const errData = await resRegistos.json().catch(() => ({erro: `Erro HTTP: ${resRegistos.status}`}));
          throw new Error(errData.erro || `Erro ao buscar dados para o gráfico: ${resRegistos.statusText}`);
        }
        const dataRegistosBackend = await resRegistos.json();
        setTodosOsRegistosParaGrafico(dataRegistosBackend);
      } catch (err) {
        console.error("Erro ao buscar dados para o gráfico em ListaResumos:", err);
        setErrorPage(err.message || "Não foi possível carregar os dados para o gráfico.");
      } finally {
        setIsLoadingGrafico(false);
      }
    };
    fetchDataParaGrafico();
  }, []); // Roda apenas uma vez para buscar os dados do gráfico
  
  const dadosGrafico = useMemo(() => {
    if (todosOsRegistosParaGrafico.length === 0) return [];
    const registosParaGrafico = todosOsRegistosParaGrafico; 
    
    const agrupadoPorFacto = registosParaGrafico.reduce((acc, reg) => {
      const nomeFacto = reg.nome_fato; 
      const cor = reg.cor ? reg.cor.toLowerCase() : null; 
      if (!nomeFacto) return acc;
      if (!acc[nomeFacto]) {
        acc[nomeFacto] = { name: nomeFacto, Vermelho: 0, Laranja: 0 };
      }
      if (cor === 'vermelho') acc[nomeFacto].Vermelho++;
      if (cor === 'laranja') acc[nomeFacto].Laranja++;
      return acc;
    }, {});
    return Object.values(agrupadoPorFacto).sort((a,b) => a.name.localeCompare(b.name));
  }, [todosOsRegistosParaGrafico]);

  const dataMaxGrafico = useMemo(() => {
    if (!dadosGrafico || dadosGrafico.length === 0) return 10;
    let max = 0;
    dadosGrafico.forEach(item => {
        if (item.Vermelho > max) max = item.Vermelho;
        if (item.Laranja > max) max = item.Laranja;
    });
    return max > 0 ? Math.ceil(max * 1.1) : 10; 
  }, [dadosGrafico]);

  if (errorPage) {
    // Usando a classe de feedback do AdminPainel/TabelaRegistos se o CSS for compartilhado/global
    return <p className="error-message admin-feedback">{errorPage}</p>; 
  }

  return (
    <div className="lista-resumos-container"> {/* Container principal da página */}
      <div className="lista-resumos-header">
        <h2>Visão Geral de Tendências e Histórico de Registos</h2> {/* Título ajustado */}
        {onVoltar && <button onClick={onVoltar} className="button-voltar">Voltar</button>}
      </div>

      {/* Secção do Gráfico Radar */}
      <div className="grafico-container">
        <h3>Tendências de Ocorrências por Fato (Período Completo)</h3>
        {isLoadingGrafico ? (
            <p className="loading-message admin-feedback">A carregar dados para o gráfico...</p>
        ) : dadosGrafico.length > 0 ? (
          <ResponsiveContainer width="100%" height={500}> 
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={dadosGrafico} margin={{ top: 20, right: 50, bottom: 20, left: 50 }}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" tick={{fontSize: '0.7em'}} tickFormatter={(value) => value.length > 18 ? `${value.substring(0, 16)}...` : value} />
              <PolarRadiusAxis angle={30} domain={[0, dataMaxGrafico]} allowDecimals={false} tick={{fontSize: '0.8em'}}/>
              <Tooltip formatter={(value, name) => [`${value} ocorrências`, `${name}`]} wrapperStyle={{fontSize: '0.9em'}}/>
              <Legend wrapperStyle={{fontSize: '0.9em', paddingTop: '30px'}}/>
              <Radar name="Zona Vermelha" dataKey="Vermelho" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
              <Radar name="Zona Laranja" dataKey="Laranja" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          !isLoadingGrafico && <p className="info-message admin-feedback">Sem dados para exibir no gráfico.</p>
        )}
      </div>

      {/* Secção para a Tabela de Registos Detalhados */}
      <div className="historico-registos-detalhados-container" style={{marginTop: '40px'}}>
        {/* Renderiza o componente TabelaRegistos e passa a prop usuarioLogado */}
     
        <TabelaRegistos usuarioLogado={usuarioLogado} />
      </div>
    </div>
  );
}

export default ListaResumos;
''