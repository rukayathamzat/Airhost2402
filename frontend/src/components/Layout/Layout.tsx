import { ReactNode } from 'react';
import SideMenu from '../SideMenu/SideMenu';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="layout">
      <SideMenu />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
