import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaComments, FaExclamationTriangle, FaFlask, FaWhatsapp, FaSignOutAlt } from 'react-icons/fa';
import './SideMenu.css';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactElement;
}

const SideMenu: React.FC = () => {
  const location = useLocation();

  const mainMenuItems: MenuItem[] = [
    { path: '/chat', label: 'Conversations', icon: <FaComments /> },
    { path: '/properties', label: 'Propriétés', icon: <FaHome /> },
    { path: '/emergency', label: 'Cas d\'urgence', icon: <FaExclamationTriangle /> },
    { path: '/sandbox', label: 'Chat Sandbox', icon: <FaFlask /> },
  ];

  const bottomMenuItems: MenuItem[] = [
    { path: '/whatsapp-config', label: 'Configuration WhatsApp', icon: <FaWhatsapp /> },
    { path: '/logout', label: 'SE DÉCONNECTER', icon: <FaSignOutAlt /> },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <Link
      key={item.path}
      to={item.path}
      className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
    >
      <span className="menu-icon">{item.icon}</span>
      <span className="menu-label">{item.label}</span>
    </Link>
  );

  return (
    <div className="side-menu">
      <div className="menu-header">
        <h2 className="app-title">AirHost Admin</h2>
      </div>
      <nav className="menu-nav">
        {mainMenuItems.map(renderMenuItem)}
      </nav>
      <nav className="menu-nav bottom-nav">
        {bottomMenuItems.map(renderMenuItem)}
      </nav>
    </div>
  );
};

export default SideMenu;
