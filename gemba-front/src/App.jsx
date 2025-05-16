// App.jsx
import React, { useState, useEffect, useRef } from "react";
import Home from "./pages/Home";
import Formulario from "./pages/Formulario";
import ListaResumos from "./pages/ListaResumos";
import GerenciarFatos from "./pages/GerenciarFatos";
import AdminPainel from "./pages/AdminPainel";

const API_BASE_URL = 'http://127.0.0.1:5001';

// Paleta de Cores Stellantis (para referência)
const STELLANTIS_COLORS = {
  BLUE: '#243782',
  TANGERINE: '#e94e24',
  MINT: '#43aaa0',
  ORANGE: '#eca935',
  ANTHRACITE: '#282b34',
  // Cores Neutras (sugestões)
  LIGHT_GRAY_BG: '#f8f9fa', // Fundo muito claro
  MEDIUM_GRAY_BORDER: '#e0e0e0', // Bordas suaves
  TEXT_LIGHT: '#ffffff',
  TEXT_DARK: '#282b34', // Anthracite para texto principal
  // Cores de Feedback (usar da paleta ou definir)
  FEEDBACK_SUCCESS: '#43aaa0', // MINT para sucesso
  FEEDBACK_ERROR: '#e94e24',   // TANGERINE para erro (ou um vermelho mais puro)
  FEEDBACK_WARNING: '#eca935', // ORANGE para aviso
};


// Ícones SVG (mantidos como antes, mas a cor 'stroke' será herdada ou definida pelo CSS)
const FormIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C6.095 4.01 5.25 4.973 5.25 6.108V17.25c0 1.243.829 2.25 2.003 2.25H15M9 18h3.75M14.25 6.75h3.75M14.25 9.75h3.75M14.25 12.75h3.75M14.25 15.75h3.75M14.25 18.75h3.75" /> </svg> );
const ListIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /> </svg> );
const SettingsIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.646.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.333.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.759 6.759 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /> <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> </svg> );
const AdminIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /> </svg> );
const LogoutIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /> </svg> );
const MenuIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /> </svg> );
const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="nav-icon"> <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> </svg> );

function App() {
  const [usuario, setUsuario] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [loginError, setLoginError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef(null);

  const handleLogin = async (dadosLogin) => {
    setLoginError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: dadosLogin.nome, cargo: dadosLogin.cargo }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.erro || "Falha no login");
      }
      setUsuario(data.usuario);
      setCurrentView('formulario');
    } catch (error) {
      console.error("Erro de login:", error);
      setLoginError(error.message);
    }
  };

  const handleLogout = () => {
    setUsuario(null);
    setLoginError(null);
    setIsMobileMenuOpen(false);
    setCurrentView('home');
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

  let contentToRender;
  // ... (lógica de contentToRender mantida como antes)
  if (currentView === 'home') {
    contentToRender = <Home onLogin={handleLogin} loginError={loginError} />;
  } else if (usuario) {
    switch (currentView) {
      case 'formulario':
        contentToRender = <Formulario usuarioLogado={usuario} />;
        break;
      case 'listaResumos':
        contentToRender = <ListaResumos onVoltar={() => navigateTo('formulario')} />;
        break;
      case 'gerenciarFatos':
        contentToRender = <GerenciarFatos onVoltar={() => navigateTo('formulario')} />;
        break;
      case 'adminPainel':
        contentToRender = usuario.is_admin 
            ? <AdminPainel onVoltar={() => navigateTo('formulario')} /> 
            : <Formulario usuarioLogado={usuario} />;
        break;
      default:
        contentToRender = <Formulario usuarioLogado={usuario} />;
    }
  } else {
    contentToRender = <Home onLogin={handleLogin} loginError={loginError} />;
    if (currentView !== 'home') setCurrentView('home');
  }
  
  return (
    <>
      <style>{`
        /* Aplicar fonte global, se desejado */
        body {
          font-family: Arial, sans-serif; /* Ou a fonte principal da Stellantis, se disponível */
          margin: 0;
          background-color: ${STELLANTIS_COLORS.LIGHT_GRAY_BG}; /* Fundo geral da aplicação */
          color: ${STELLANTIS_COLORS.TEXT_DARK}; /* Cor de texto principal */
        }
        .app-navbar {
          padding: 10px 20px; /* Aumentar padding para um visual mais espaçado */
          background-color: ${STELLANTIS_COLORS.BLUE}; /* Cor principal da Stellantis */
          border-bottom: 2px solid ${STELLANTIS_COLORS.ANTHRACITE}; /* Borda escura para contraste */
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          position: relative; 
        }
        .nav-brand { 
          font-size: 1.4em; /* Maior */
          font-weight: bold;
          color: ${STELLANTIS_COLORS.TEXT_LIGHT}; /* Texto branco sobre fundo azul */
          margin-right: auto; 
        }
        .nav-controls-right {
            display: flex;
            align-items: center;
        }
        .nav-links-desktop {
          display: flex; 
          align-items: center;
          margin-left: 20px; 
        }
        .nav-links-desktop button, 
        .nav-user button { 
          padding: 8px 15px; /* Mais padding horizontal */
          margin: 0 6px; 
          border: none;
          border-radius: 4px; /* Cantos menos arredondados */
          cursor: pointer;
          background-color: transparent; /* Botões transparentes sobre fundo azul */
          color: ${STELLANTIS_COLORS.TEXT_LIGHT};
          font-size: 0.95em; /* Ligeiramente maior */
          /* box-shadow: 0 1px 3px rgba(0,0,0,0.1); */ /* Remover sombra para visual mais plano */
          transition: background-color 0.2s ease, color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent; /* Borda transparente para manter o tamanho no hover/active */
        }
        .nav-links-desktop button:hover, 
        .nav-user button:hover {
          background-color: rgba(255,255,255,0.1); /* Hover subtil */
          border-color: rgba(255,255,255,0.3);
        }
        .nav-links-desktop button.active {
          background-color: rgba(255,255,255,0.2); /* Ativo um pouco mais destacado */
          font-weight: bold;
          border-color: ${STELLANTIS_COLORS.TEXT_LIGHT};
        }
        .nav-user {
          display: flex;
          align-items: center;
          margin-left: 15px; 
        }
        .user-greeting {
          margin-right: 15px; /* Mais espaço */
          color: ${STELLANTIS_COLORS.TEXT_LIGHT}; /* Texto branco */
          font-size: 0.9em;
          white-space: nowrap; 
        }
        .nav-logout-button {
          background-color: ${STELLANTIS_COLORS.TANGERINE} !important; /* Cor de destaque para logout */
          color: ${STELLANTIS_COLORS.TEXT_LIGHT} !important;
        }
        .nav-logout-button:hover {
          background-color: #d63c10 !important; /* Tangerine mais escuro */
        }
        .nav-icon {
          width: 1.1em; 
          height: 1.1em;
          margin-right: 8px; /* Mais espaço entre ícone e texto */
          stroke: ${STELLANTIS_COLORS.TEXT_LIGHT}; /* Ícones brancos */
        }
        
        .mobile-menu-button {
        margin-bottom: 8px; 
          display: none; 
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          order: 1; 
        }
        .mobile-menu-button .nav-icon {
          width: 1.6em; /* Ícone do hambúrguer maior */
          height: 1em;
          margin-right: 0; 
          stroke: ${STELLANTIS_COLORS.TEXT_LIGHT}; /* Ícone branco */
        }

        .nav-links-mobile {
          display: none; 
          flex-direction: column;
          position: absolute;
          top: 100%; 
          left: 0;
          right: 0;
          background-color: ${STELLANTIS_COLORS.BLUE}; 
          border-top: 1px solid rgba(255,255,255,0.2);
          z-index: 1000; 
          padding: 0; /* Remover padding para botões ocuparem tudo */
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .nav-links-mobile.open {
          display: flex; 
        }
        .nav-links-mobile button {
          width: 100%;
          padding: 15px 20px; /* Mais padding vertical */
          margin: 0;
          border-radius: 0;
          justify-content: flex-start; 
          font-size: 1em;
          color: ${STELLANTIS_COLORS.TEXT_LIGHT}; 
          background-color: transparent;
          box-shadow: none;
          border-bottom: 1px solid rgba(255,255,255,0.1); /* Separador entre itens */
        }
        .nav-links-mobile button:last-child {
            border-bottom: none;
        }
        .nav-links-mobile button:hover {
          background-color: rgba(255,255,255,0.1); 
        }
         .nav-links-mobile button.active {
          background-color: rgba(255,255,255,0.2);
          font-weight: bold;
        }

        @media (max-width: 880px) { 
          .nav-brand {
            margin-right: 10px; 
          }
          .nav-links-desktop {
            display: none; 
          }
          .mobile-menu-button {
            display: flex; 
            align-items: center;
          }
          .nav-user {
            margin-left: 8px; 
          }
          .user-greeting {
            display: none; 
          }
          .nav-user button .nav-button-text {
            display: none; 
          }
          .nav-user button .nav-icon {
            margin-right: 0; 
            stroke: ${STELLANTIS_COLORS.TEXT_LIGHT}; /* Garante cor do ícone de logout */
          }
        }
        @media (max-width: 480px) {
            .nav-brand {
                font-size: 1.1em; 
            }
            .nav-icon { /* Ícones nos botões do menu mobile */
                stroke: ${STELLANTIS_COLORS.TEXT_LIGHT};
            }
        }
        /* Estilos gerais para botões, se não definidos noutros CSS */
        button.primary-action-button {
            background-color: ${STELLANTIS_COLORS.BLUE};
            color: ${STELLANTIS_COLORS.TEXT_LIGHT};
            /* ... outros estilos de botão ... */
        }
        button.secondary-action-button {
            background-color: ${STELLANTIS_COLORS.MINT};
            color: ${STELLANTIS_COLORS.TEXT_LIGHT};
             /* ... outros estilos de botão ... */
        }

      `}</style>

      <div>
        {usuario && currentView !== 'home' && (
          <nav className="app-navbar" ref={navRef}>
            <div className="nav-brand">Gemba App</div>
            
            <div className="nav-links-desktop">
              <button onClick={() => navigateTo('formulario')} className={currentView === 'formulario' ? 'active' : ''} title="Formulário de Registo"> <FormIcon /> <span className="nav-button-text">Formulário</span> </button>
              <button onClick={() => navigateTo('listaResumos')} className={currentView === 'listaResumos' ? 'active' : ''} title="Ver Histórico de Resumos"> <ListIcon /> <span className="nav-button-text">Histórico</span> </button>
              <button onClick={() => navigateTo('gerenciarFatos')} className={currentView === 'gerenciarFatos' ? 'active' : ''} title="Gerir Factos e Limites"> <SettingsIcon /> <span className="nav-button-text">Gerir Factos</span> </button>
              {usuario && usuario.is_admin && (
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
              <button onClick={() => navigateTo('gerenciarFatos')} className={currentView === 'gerenciarFatos' ? 'active' : ''}> <SettingsIcon /> <span className="nav-button-text">Gerir Factos</span> </button>
              {usuario && usuario.is_admin && (
                <button onClick={() => navigateTo('adminPainel')} className={currentView === 'adminPainel' ? 'active' : ''}> <AdminIcon /> <span className="nav-button-text">Painel Admin</span> </button>
              )}
            </div>
          </nav>
        )}
        
        <div className="main-content-area" style={{ padding: '0 15px' }}> {/* Aumentar padding lateral do conteúdo */}
          {contentToRender}
        </div>
      </div>
    </>
  );
}

export default App;
