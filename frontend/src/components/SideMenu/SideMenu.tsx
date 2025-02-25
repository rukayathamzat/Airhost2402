import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaComments, FaExclamationTriangle, FaFlask, FaCog } from 'react-icons/fa';
import './SideMenu.css';

const SideMenu = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/properties', label: 'Propriétés', icon: <FaHome /> },
    { path: '/chat', label: 'Conversations', icon: <FaComments /> },
    { path: '/emergency', label: 'Cas d\'urgence', icon: <FaExclamationTriangle /> },
    { path: '/sandbox', label: 'Chat Sandbox', icon: <FaFlask /> },
    { path: '/settings', label: 'Paramètres', icon: <FaCog /> },
  ];

  return (
    <div className="side-menu">
      <div className="menu-header">
        <h2 className="app-title">AirHost Admin</h2>
      </div>
      <nav className="menu-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default SideMenu;
