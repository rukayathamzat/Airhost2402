import { Link, useLocation } from 'react-router-dom';
import './SideMenu.css';

const SideMenu = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/chat', label: 'Conversations', icon: '💬' },
    { path: '/emergency', label: 'Cas d\'urgence', icon: '🚨' },
    { path: '/sandbox', label: 'Chat Sandbox', icon: '🧪' },
    { path: '/settings', label: 'Paramètres', icon: '⚙️' },
  ];

  return (
    <div className="side-menu">
      <div className="menu-header">
        <h2>AirHost</h2>
      </div>
      <nav>
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
