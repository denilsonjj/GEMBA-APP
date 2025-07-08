// AdminPainel.jsx
import React, { useState, useEffect } from 'react';
import "../styles/AdminPainel.css";
import { toast } from 'react-toastify';
import TabelaRegistos from '../components/TabelaRegistros';

const API_BASE_URL = 'https://denilsonjj.pythonanywhere.com';

function AdminPainel({ onVoltar, usuarioLogado }) { 
 

  const handleDownloadRelatorioCompletoExcel = () => {
    const downloadUrl = `${API_BASE_URL}/admin/relatorio_completo/excel`;
    window.open(downloadUrl, '_blank');
    toast.info("A preparar o download do relatório Excel...");
  };
  
  return (
    <div className="admin-painel-container">
      <div className="admin-painel-header">
        <h2 style={{marginRight: "20px"}}>Painel de Administrador</h2>
        {onVoltar && (
            <button onClick={onVoltar} className="button-voltar-admin">
              Voltar
            </button>
        )}
      </div>

      <div className="admin-actions-container">
        <button
          onClick={handleDownloadRelatorioCompletoExcel}
          className="button-download-excel"
        >
          Download Relatório Completo (Excel)
        </button>
      </div>

      {/* Renderiza o componente TabelaRegistos, passando a prop usuarioLogado */}
      <TabelaRegistos usuarioLogado={usuarioLogado} />

    </div>
  );
}

export default AdminPainel;
