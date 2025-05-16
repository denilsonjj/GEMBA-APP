// AdminPainel.jsx
import React, { useState, useEffect, useMemo } from 'react';
import './AdminPainel.css'; // Certifique-se que este arquivo CSS existe e está correto

const API_BASE_URL = 'http://127.0.0.1:5001';

function AdminPainel({ onVoltar }) {
  const [todosOsRegistosComUtilizador, setTodosOsRegistosComUtilizador] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados para os filtros da tabela
  const [filtroUtilizador, setFiltroUtilizador] = useState("todos");
  const [filtroFacto, setFiltroFacto] = useState("todos");    
  const [listaUtilizadoresUnicos, setListaUtilizadoresUnicos] = useState([]);
  const [listaFactosUnicos, setListaFactosUnicos] = useState([]);

  useEffect(() => {
    const fetchDadosIniciais = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const responseRegistos = await fetch(`${API_BASE_URL}/dados`);
        if (!responseRegistos.ok) {
          throw new Error(`Erro ao buscar todos os registos: ${responseRegistos.statusText}`);
        }
        const dataRegistos = await responseRegistos.json();
        // A rota /dados retorna data_registro no formato original do banco (TEXT)
        // A ordenação por data ainda funciona corretamente com strings no formato ISO
        dataRegistos.sort((a, b) => {
          // Tratar casos onde data_registro pode ser null ou undefined
          const dateA = a.data_registro ? new Date(a.data_registro) : new Date(0); // Data mínima se nulo
          const dateB = b.data_registro ? new Date(b.data_registro) : new Date(0);
          return dateB - dateA; // Mais recentes primeiro
        });
        setTodosOsRegistosComUtilizador(dataRegistos);

        if (dataRegistos.length > 0) {
          const utilizadores = [...new Set(dataRegistos.map(reg => reg.nome_usuario).filter(Boolean))].sort();
          const factos = [...new Set(dataRegistos.map(reg => reg.nome_fato).filter(Boolean))].sort();
          setListaUtilizadoresUnicos(utilizadores);
          setListaFactosUnicos(factos);
        }

      } catch (err) {
        console.error("Erro ao buscar dados iniciais:", err);
        setError(err.message || "Não foi possível carregar os dados necessários.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDadosIniciais();
  }, []);

  const registosFiltradosParaTabela = useMemo(() => {
    let registosFiltrados = todosOsRegistosComUtilizador;
    if (filtroUtilizador !== "todos") {
      registosFiltrados = registosFiltrados.filter(reg => reg.nome_usuario === filtroUtilizador);
    }
    if (filtroFacto !== "todos") {
      registosFiltrados = registosFiltrados.filter(reg => reg.nome_fato === filtroFacto);
    }
    return registosFiltrados;
  }, [todosOsRegistosComUtilizador, filtroUtilizador, filtroFacto]);

  const handleDownloadRelatorioCompletoExcel = () => {
    // Apontar para a rota unificada que gera o Excel com registos e descrições de resumo
    const downloadUrl = `${API_BASE_URL}/admin/relatorio_completo/excel`;
    window.open(downloadUrl, '_blank'); // Abre a URL, o backend força o download
  };


  if (isLoading) {
    return <p className="loading-message admin-feedback">A carregar dados do painel de administrador...</p>;
  }
  if (error) {
    return <p className="error-message admin-feedback">Erro: {error}</p>;
  }

  return (
    <div className="admin-painel-container">
      <div className="admin-painel-header">
        <h2>Painel de Administrador</h2>
        {onVoltar && (
            <button onClick={onVoltar} className="button-voltar-admin">
              Voltar
            </button>
        )}
      </div>

      <div className="admin-actions-container">
        {/* ÚNICO BOTÃO DE DOWNLOAD */}
        {todosOsRegistosComUtilizador.length > 0 ? (
          <button
            onClick={handleDownloadRelatorioCompletoExcel}
            className="button-download-excel"
          >
            Download Relatório Completo (Excel)
          </button>
        ) : (
          !isLoading && <p className="info-message admin-feedback">Não há dados para exportar.</p>
        )}
      </div>

      {/* Filtros para a Tabela de Registos */}
      {todosOsRegistosComUtilizador.length > 0 && (
        <div className="filtros-tabela-container admin-filtros-tabela">
          <div className="filtro-item-admin">
            <label htmlFor="filtro-tabela-utilizador" className="filtro-label-admin">Filtrar Registos por Utilizador:</label>
            <select 
              id="filtro-tabela-utilizador" 
              value={filtroUtilizador} 
              onChange={(e) => setFiltroUtilizador(e.target.value)}
              className="filtro-select-admin"
            >
              <option value="todos">Todos os Utilizadores</option>
              {listaUtilizadoresUnicos.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
          <div className="filtro-item-admin">
            <label htmlFor="filtro-tabela-facto" className="filtro-label-admin">Filtrar Registos por Facto:</label>
            <select 
              id="filtro-tabela-facto" 
              value={filtroFacto} 
              onChange={(e) => setFiltroFacto(e.target.value)}
              className="filtro-select-admin"
            >
              <option value="todos">Todos os Factos</option>
              {listaFactosUnicos.map(facto => (
                <option key={facto} value={facto}>{facto}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Tabela de Todos os Registos Individuais */}
      <div className="tabela-registos-wrapper">
        <h3>Registos Individuais {registosFiltradosParaTabela.length !== todosOsRegistosComUtilizador.length ? "(Filtrados)" : ""}</h3>
        {registosFiltradosParaTabela.length === 0 && !isLoading && (
          <p className="info-message admin-feedback">
            { (filtroUtilizador !== "todos" || filtroFacto !== "todos") 
              ? "Nenhum registo encontrado com os filtros atuais." 
              : "Nenhum registo individual encontrado."
            }
          </p>
        )}
        {registosFiltradosParaTabela.length > 0 && (
          <div className="table-responsive-container-admin">
            <table className="admin-registos-table responsive-table">
              <thead>
                <tr>
                  <th>Data Registo</th>
                  <th>Utilizador</th>
                  <th>Cargo Util.</th>
                  <th>Facto</th>
                  <th>Dia Semana</th>
                  <th>Valor</th>
                  <th>Cor</th>
                  <th>Correção</th>
                </tr>
              </thead>
              <tbody>
                {registosFiltradosParaTabela.map(reg => (
                  <tr key={reg.registro_id}>
                    {/* Usar reg.data_registro que vem da API /dados */}
                    <td data-label="Data:">{reg.data_registro ? new Date(reg.data_registro).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : '-'}</td>
                    <td data-label="Utilizador:">{reg.nome_usuario || '-'}</td>
                    <td data-label="Cargo Util.:">{reg.cargo_usuario || '-'}</td>
                    <td data-label="Facto:">{reg.nome_fato || '-'}</td>
                    <td data-label="Dia:">{reg.dia_semana || '-'}</td>
                    <td data-label="Valor:">{reg.valor === null ? '-' : reg.valor}</td>
                    <td style={{color: getColorForStatus(reg.cor), fontWeight: 'bold'}} data-label="Cor:">
                      {reg.cor ? reg.cor.charAt(0).toUpperCase() + reg.cor.slice(1) : '-'}
                    </td>
                    <td data-label="Correção:">{reg.correcao || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const getColorForStatus = (cor) => {
    if (!cor) return '#4b5563'; // Cor padrão para indefinido
    switch (cor.toLowerCase()) {
        case 'verde': return '#10b981'; // Exemplo: Tailwind green-500
        case 'laranja': return '#f59e0b'; // Exemplo: Tailwind amber-500
        case 'vermelho': return '#ef4444'; // Exemplo: Tailwind red-500
        default: return '#4b5563';
    }
};

export default AdminPainel;
