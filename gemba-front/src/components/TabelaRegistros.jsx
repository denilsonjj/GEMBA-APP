
import React, { useState, useEffect, useMemo } from "react";
import "../styles/TabelaDeRegistros.css"; 
import { toast } from "react-toastify";

const API_BASE_URL = 'https://denilsonjj.pythonanywhere.com';


const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = "Confirmar",
  cancelButtonText = "Cancelar",
}) => {
  if (!isOpen) return null;

  return (
   
    <div className="modal-overlay-gemba">
      <div className="modal-content-gemba">
        <h4>{title}</h4>
        <p>{message}</p>
        <div className="modal-actions-gemba">
          <button onClick={onConfirm} className="button-danger-gemba">
            {confirmButtonText}
          </button>
          <button onClick={onClose} className="button-secondary">
            {cancelButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

const getColorForStatus = (cor) => {
  if (!cor) return "#4b5563";
  switch (cor.toLowerCase()) {
    case "verde":
      return "#10b981";
    case "laranja":
      return "#f59e0b";
    case "vermelho":
      return "#ef4444";
    default:
      return "#4b5563";
  }
};

function TabelaRegistros({ usuarioLogado }) {
  // Recebe usuarioLogado como prop
  console.log("Objeto usuarioLogado no início do componente:", usuarioLogado);
  const [todosOsRegistos, setTodosOsRegistos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  const [filtroUtilizador, setFiltroUtilizador] = useState("todos");
  const [filtroFacto, setFiltroFacto] = useState("todos");
  const [listaUtilizadoresUnicos, setListaUtilizadoresUnicos] = useState([]);
  const [listaFactosUnicos, setListaFactosUnicos] = useState([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [registroParaDeletar, setRegistroParaDeletar] = useState(null);

  // Função para buscar os dados
  const fetchDados = async () => {
    setIsLoading(true);
    setLoadingError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/dados`);
      if (!response.ok) {
        const errData = await response
          .json()
          .catch(() => ({ erro: `Erro HTTP: ${response.status}` }));
        throw new Error(
          errData.erro || `Erro ao buscar registos: ${response.statusText}`
        );
      }
      const data = await response.json();
      data.sort((a, b) => {
        const dateA = a.data_registro ? new Date(a.data_registro) : new Date(0);
        const dateB = b.data_registro ? new Date(b.data_registro) : new Date(0);
        return dateB - dateA; // Mais recentes primeiro
      });
      setTodosOsRegistos(data);
    } catch (err) {
      console.error("Erro ao buscar dados para TabelaRegistos:", err);
      toast.error(err.message || "Não foi possível carregar os registos.");
      setLoadingError(err.message || "Não foi possível carregar os registos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, []); // Busca dados na montagem do componente

  useEffect(() => {
    if (todosOsRegistos.length > 0) {
      const utilizadores = [
        ...new Set(
          todosOsRegistos.map((reg) => reg.nome_usuario).filter(Boolean)
        ),
      ].sort();
      const factos = [
        ...new Set(todosOsRegistos.map((reg) => reg.nome_fato).filter(Boolean)),
      ].sort();
      setListaUtilizadoresUnicos(utilizadores);
      setListaFactosUnicos(factos);
    }
  }, [todosOsRegistos]);

  const registosFiltrados = useMemo(() => {
    let filtrados = todosOsRegistos;
    if (filtroUtilizador !== "todos") {
      filtrados = filtrados.filter(
        (reg) => reg.nome_usuario === filtroUtilizador
      );
    }
    if (filtroFacto !== "todos") {
      filtrados = filtrados.filter((reg) => reg.nome_fato === filtroFacto);
    }
    return filtrados;
  }, [todosOsRegistos, filtroUtilizador, filtroFacto]);

  const abrirModalDelecao = (registo) => {
    setRegistroParaDeletar(registo);
    setIsDeleteModalOpen(true);
  };

  const confirmarDelecaoRegisto = async () => {
    if (!registroParaDeletar || !usuarioLogado) {
      toast.error(
        "Erro: Informação do registo ou do usuário ausente para deleção."
      );
      setIsDeleteModalOpen(false);
      setRegistroParaDeletar(null);
      return;
    }

    setIsLoading(true); // Pode ser um loading específico para a ação de deleção
    try {
      const response = await fetch(
        `${API_BASE_URL}/registros/${registroParaDeletar.registro_id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario_id: usuarioLogado.id }),
        }
      );
      const resultado = await response.json();
      if (!response.ok) {
        throw new Error(
          resultado.erro || `Erro do servidor: ${response.status}`
        );
      }
      toast.success(resultado.mensagem || "Registo apagado com sucesso!");
      // Atualiza a lista de registos no frontend
      setTodosOsRegistos((prevRegistos) =>
        prevRegistos.filter(
          (r) => r.registro_id !== registroParaDeletar.registro_id
        )
      );
    } catch (err) {
      toast.error(err.message || "Ocorreu um erro ao apagar o registo.");
    } finally {
      setIsLoading(false);
      setIsDeleteModalOpen(false);
      setRegistroParaDeletar(null);
    }
  };

  if (isLoading && todosOsRegistos.length === 0) {
    return (
      <p className="loading-message admin-feedback">A carregar registos...</p>
    );
  }

  if (loadingError && todosOsRegistos.length === 0) {
    return (
      <p className="error-message admin-feedback">
        Erro ao carregar dados: {loadingError}
      </p>
    );
  }

  return (
    <>
      <div className="tabela-registos-component-wrapper">
        {todosOsRegistos.length > 0 && (
          <div className="filtros-tabela-container admin-filtros-tabela">
            <div className="filtro-item-admin">
              <label
                htmlFor="componente-filtro-utilizador"
                className="filtro-label-admin"
              >
                Filtrar Registos por Utilizador:
              </label>
              <select
                id="componente-filtro-utilizador"
                value={filtroUtilizador}
                onChange={(e) => setFiltroUtilizador(e.target.value)}
                className="filtro-select-admin"
              >
                <option value="todos">Todos os Utilizadores</option>
                {listaUtilizadoresUnicos.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
            </div>
            <div className="filtro-item-admin">
              <label
                htmlFor="componente-filtro-facto"
                className="filtro-label-admin"
              >
                Filtrar Registos por Facto:
              </label>
              <select
                id="componente-filtro-facto"
                value={filtroFacto}
                onChange={(e) => setFiltroFacto(e.target.value)}
                className="filtro-select-admin"
              >
                <option value="todos">Todos os Factos</option>
                {listaFactosUnicos.map((facto) => (
                  <option key={facto} value={facto}>
                    {facto}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="tabela-registos-wrapper">
          <h3>
            Registos Individuais{" "}
            {registosFiltrados.length !== todosOsRegistos.length
              ? "(Filtrados)"
              : ""}
          </h3>
          {registosFiltrados.length === 0 && !isLoading && !loadingError && (
            <p className="info-message admin-feedback">
              {filtroUtilizador !== "todos" || filtroFacto !== "todos"
                ? "Nenhum registo encontrado com os filtros atuais."
                : "Nenhum registo individual encontrado."}
            </p>
          )}
          {registosFiltrados.length > 0 && (
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
                    <th>Descrição do Dia</th>
                    <th>Ações</th> 
                  </tr>
                </thead>
                <tbody>
                  {registosFiltrados.map((reg) => (
                    <tr key={reg.registro_id}>
                      <td data-label="Data:">
                        {reg.data_registro
                          ? new Date(reg.data_registro).toLocaleString(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "-"}
                      </td>
                      <td data-label="Utilizador:">
                        {reg.nome_usuario || "-"}
                      </td>
                      <td data-label="Cargo Util.:">
                        {reg.cargo_usuario || "-"}
                      </td>
                      <td data-label="Fato:">{reg.nome_fato || "-"}</td>
                      <td data-label="Dia:">{reg.dia_semana || "-"}</td>
                      <td data-label="Valor:">
                        {reg.valor === null ? "-" : reg.valor}
                      </td>
                      <td
                        style={{
                          color: getColorForStatus(reg.cor),
                          fontWeight: "bold",
                        }}
                        data-label="Cor:"
                      >
                        {reg.cor
                          ? reg.cor.charAt(0).toUpperCase() + reg.cor.slice(1)
                          : "-"}
                      </td>
                      <td data-label="Descrição Dia:">
                        {reg.descricao_fato_dia || "-"}
                      </td>
                      <td data-label="Ações:">
                        {usuarioLogado &&
                          (usuarioLogado.id === reg.registro_usuario_id ||
                            usuarioLogado.is_admin) && (
                            <button
                              onClick={() => abrirModalDelecao(reg)}
                              className="button-delete-registro"
                              title="Apagar este registo"
                            >
                              {"Apagar"}
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setRegistroParaDeletar(null);
        }}
        onConfirm={confirmarDelecaoRegisto}
        title="Confirmar Deleção de Registo"
        message={
          registroParaDeletar
            ? `Tem a certeza que deseja apagar o registo do fato "${
                registroParaDeletar.nome_fato
              }" de ${registroParaDeletar.nome_usuario} em ${new Date(
                registroParaDeletar.data_registro
              ).toLocaleDateString("pt-BR")}? Esta ação não pode ser desfeita.`
            : "Tem a certeza que deseja apagar este registo?"
        }
        confirmButtonText="Sim, Apagar Registo"
      />
    </>
  );
}

export default TabelaRegistros; 
