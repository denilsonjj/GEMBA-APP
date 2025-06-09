// App.jsx
import React, { useState, useEffect, useRef } from "react";
import Home from "./pages/Home";
import TelaCadastro from "./pages/TelaCadastro";
import Formulario from "./pages/Formulario";
import ListaResumos from "./pages/ListaResumos";
import GerenciarFatos from "./pages/GerenciarFatos";
import AdminPainel from "./pages/AdminPainel";

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_BASE_URL = 'http://127.0.0.1:5001';
const USER_STORAGE_KEY = 'gembaAppUser'; // Chave para o localStorage

// Cores da Paleta (para referência nos estilos CSS)
const STELLANTIS_COLORS = {
  BLUE: '#243782', TANGERINE: '#e94e24', MINT: '#43aaa0', ORANGE: '#eca935',
  ANTHRACITE: '#282b34', TEXT_LIGHT: '#ffffff', LIGHT_GRAY_BG: '#f8f9fa',
  MEDIUM_GRAY_BORDER: '#ced4da', FEEDBACK_SUCCESS: '#43aaa0', FEEDBACK_ERROR: '#e94e24',
};

// Ícones SVG (mantidos como antes)
const FormIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C6.095 4.01 5.25 4.973 5.25 6.108V17.25c0 1.243.829 2.25 2.003 2.25H15M9 18h3.75M14.25 6.75h3.75M14.25 9.75h3.75M14.25 12.75h3.75M14.25 15.75h3.75M14.25 18.75h3.75" /> </svg> );
const ListIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /> </svg> );
const SettingsIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.646.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.333.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.759 6.759 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /> <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> </svg> );
const AdminIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /> </svg> );
const LogoutIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /> </svg> );
const MenuIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /> </svg> );
const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> </svg> );


function App() {
  const [usuario, setUsuario] = useState(null); 
  const [currentView, setCurrentView] = useState('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [appLoading, setAppLoading] = useState(true); // Novo estado para controlar o carregamento inicial
  const navRef = useRef(null);

  // Efeito para carregar usuário do localStorage ao iniciar o app
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Validação simples: verificar se tem um ID e nome.
        // Para mais segurança, você poderia revalidar este usuário com o backend.
        if (parsedUser && parsedUser.id && parsedUser.nome) {
          setUsuario(parsedUser);
          setCurrentView('formulario'); // Ou a última página visitada, se guardada
        } else {
          // Dados inválidos no localStorage, limpar
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      } catch (error) {
        console.error("Erro ao parsear usuário do localStorage:", error);
        localStorage.removeItem(USER_STORAGE_KEY); // Limpa em caso de erro de parse
      }
    }
    setAppLoading(false); // Termina o carregamento inicial do app
  }, []);


  const handleLogin = async (dadosLogin) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosLogin),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.erro || "Falha no login. Verifique os seus dados.");
        throw new Error(data.erro || "Falha no login");
      }
      setUsuario(data.usuario);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.usuario)); // Salva no localStorage
      setCurrentView('formulario');
      toast.success(`Bem-vindo de volta, ${data.usuario.nome}!`);
    } catch (error) {
      console.error("Erro de login:", error);
    }
  };

  const handleCadastroSucesso = () => {
    setCurrentView('login'); 
  };

  const handleLogout = () => {
    setUsuario(null);
    localStorage.removeItem(USER_STORAGE_KEY); // Remove do localStorage
    setIsMobileMenuOpen(false);
    setCurrentView('login');
    toast.info("Sessão terminada com sucesso.");
  };

  const navigateTo = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    }
    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  
  if (appLoading) {
    // Você pode criar um componente de Loading mais elaborado se desejar
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5em'}}>A carregar aplicação...</div>;
  }

  let contentToRender;
  if (!usuario) {
    if (currentView === 'cadastro') {
      contentToRender = <TelaCadastro onCadastroSucesso={handleCadastroSucesso} onIrParaLogin={() => navigateTo('login')} />;
    } else {
      contentToRender = <Home onLogin={handleLogin} onIrParaCadastro={() => navigateTo('cadastro')} />;
    }
  } else {
    switch (currentView) {
      case 'formulario':
        contentToRender = <Formulario usuarioLogado={usuario} />;
        break;
      case 'listaResumos':
     contentToRender=  <ListaResumos usuarioLogado={usuario} onVoltar={() => navigateTo('formulario')} /> 
        break;
      case 'gerenciarFatos':
        contentToRender = <GerenciarFatos onVoltar={() => navigateTo('formulario')} />;
        break;
      case 'adminPainel':
        contentToRender = usuario.is_admin
        ? <AdminPainel usuarioLogado={usuario} onVoltar={() => navigateTo('formulario')} /> 
        : <Formulario usuarioLogado={usuario} />;
        
        break;
      default:
        contentToRender = <Formulario usuarioLogado={usuario} />;
        if (currentView !== 'formulario') setCurrentView('formulario');
    }
  }
  
  return (
    <>
      <ToastContainer
        position="top-right" autoClose={4000} hideProgressBar={false}
        newestOnTop={false} closeOnClick rtl={false}
        pauseOnFocusLoss draggable pauseOnHover theme="colored"
      />
      <style>{`
        body { font-family: Arial, sans-serif; margin: 0; background-color: ${STELLANTIS_COLORS.LIGHT_GRAY_BG}; color: ${STELLANTIS_COLORS.ANTHRACITE}; /* ANTHRACITE para texto escuro */ }
        .app-navbar { padding: 10px 20px; background-color: ${STELLANTIS_COLORS.BLUE}; border-bottom: 2px solid ${STELLANTIS_COLORS.ANTHRACITE}; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; position: relative; }
        .nav-brand { font-size: 1.4em; font-weight: bold; color: ${STELLANTIS_COLORS.TEXT_LIGHT}; margin-right: auto; }
        .nav-controls-right { display: flex; align-items: center; }
        .nav-links-desktop { display: flex; align-items: center; margin-left: 20px; }
        .nav-links-desktop button, .nav-user button { padding: 8px 15px; margin: 0 6px; border: none; border-radius: 4px; cursor: pointer; background-color: transparent; color: ${STELLANTIS_COLORS.TEXT_LIGHT}; font-size: 0.95em; transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease; display: flex; align-items: center; justify-content: center; border: 1px solid transparent; }
        .nav-links-desktop button:hover, .nav-user button:hover { background-color: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); }
        .nav-links-desktop button.active { background-color: rgba(255,255,255,0.2); font-weight: bold; border-color: ${STELLANTIS_COLORS.TEXT_LIGHT}; }
        .nav-user { display: flex; align-items: center; margin-left: 15px; }
        .user-greeting { margin-right: 15px; color: ${STELLANTIS_COLORS.TEXT_LIGHT}; font-size: 0.9em; white-space: nowrap; }
        .nav-logout-button { background-color: ${STELLANTIS_COLORS.TANGERINE} !important; color: ${STELLANTIS_COLORS.TEXT_LIGHT} !important; }
        .nav-logout-button:hover { background-color: #d63c10 !important; } /* Tom mais escuro de TANGERINE */
        .nav-icon { width: 1.1em; height: 1.1em; margin-right: 8px; stroke: ${STELLANTIS_COLORS.TEXT_LIGHT}; }
        .mobile-menu-button { display: none; background: none; border: none; padding: 8px 15px; cursor: pointer; order: 1; margin: 0;  }
        .mobile-menu-button .nav-icon { width: 1.6em; height: 1.6em; margin-right: 0; stroke: ${STELLANTIS_COLORS.TEXT_LIGHT}; }
        .nav-links-mobile { display: none; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background-color: ${STELLANTIS_COLORS.BLUE}; border-top: 1px solid rgba(255,255,255,0.2); z-index: 1000; padding: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .nav-links-mobile.open { display: flex; }
        .nav-links-mobile button { width: 100%; padding: 15px 20px; margin: 0; border-radius: 0; justify-content: flex-start; font-size: 1em; color: ${STELLANTIS_COLORS.TEXT_LIGHT}; background-color: transparent; box-shadow: none; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .nav-links-mobile button:last-child { border-bottom: none; }
        .nav-links-mobile button:hover { background-color: rgba(255,255,255,0.1); }
        .nav-links-mobile button.active { background-color: rgba(255,255,255,0.2); font-weight: bold; }
        @media (max-width: 880px) { .nav-brand { margin-right: 10px; } .nav-links-desktop { display: none; } .mobile-menu-button { display: flex; align-items: center; } .nav-user { margin-left: 8px; } .user-greeting { display: none; } .nav-user button .nav-button-text { display: none; } .nav-user button .nav-icon { margin-right: 0; stroke: ${STELLANTIS_COLORS.TEXT_LIGHT}; } }
        @media (max-width: 480px) { .nav-brand { font-size: 1.1em; } .nav-icon { stroke: ${STELLANTIS_COLORS.TEXT_LIGHT}; } }
      `}</style>

      <div>
        {usuario && (
          <nav className="app-navbar" ref={navRef}>
            <div className="nav-brand">Gemba</div>
            <div className="nav-links-desktop">
              <button onClick={() => navigateTo('formulario')} className={currentView === 'formulario' ? 'active' : ''} title="Formulário de Registo"> <FormIcon /> <span className="nav-button-text">Formulário</span> </button>
              <button onClick={() => navigateTo('listaResumos')} className={currentView === 'listaResumos' ? 'active' : ''} title="Ver Histórico de Resumos"> <ListIcon /> <span className="nav-button-text">Histórico</span> </button>
              <button onClick={() => navigateTo('gerenciarFatos')} className={currentView === 'gerenciarFatos' ? 'active' : ''} title="Gerir Fatos e Limites"> <SettingsIcon /> <span className="nav-button-text">Gerir Fatos</span> </button>
              {usuario.is_admin && (
                <button onClick={() => navigateTo('adminPainel')} className={currentView === 'adminPainel' ? 'active' : ''} title="Painel de Administrador"> <AdminIcon /> <span className="nav-button-text">Painel Admin</span> </button>
              )}
            </div>
            <div className="nav-controls-right">
                <button className="mobile-menu-button" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Abrir menu" aria-expanded={isMobileMenuOpen}>
                {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                </button>
                <div className="nav-user">
                <span className="user-greeting">Olá, {usuario.nome}! {usuario.is_admin ? "(Admin)" : ""}</span>
                <button onClick={handleLogout} className="nav-logout-button" title="Sair"> <LogoutIcon /> <span className="nav-button-text">Sair</span> </button>
                </div>
            </div>
            <div className={`nav-links-mobile ${isMobileMenuOpen ? 'open' : ''}`}>
              <button onClick={() => navigateTo('formulario')} className={currentView === 'formulario' ? 'active' : ''}> <FormIcon /> <span className="nav-button-text">Formulário</span> </button>
              <button onClick={() => navigateTo('listaResumos')} className={currentView === 'listaResumos' ? 'active' : ''}> <ListIcon /> <span className="nav-button-text">Histórico</span> </button>
              <button onClick={() => navigateTo('gerenciarFatos')} className={currentView === 'gerenciarFatos' ? 'active' : ''}> <SettingsIcon /> <span className="nav-button-text">Gerir Fatos</span> </button>
              {usuario.is_admin && (
                <button onClick={() => navigateTo('adminPainel')} className={currentView === 'adminPainel' ? 'active' : ''}> <AdminIcon /> <span className="nav-button-text">Painel Admin</span> </button>
              )}
            </div>
          </nav>
        )}
        
        <div className="main-content-area" style={{ padding: '0 15px' }}>
          {contentToRender}
        </div>
      </div>
    </>
  );
}

export default App;
