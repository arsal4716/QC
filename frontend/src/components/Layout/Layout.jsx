import React from 'react';
import { useSelector } from 'react-redux';
import TopBar from '../TopBar/TopBar';
import Sidebar from '../Sidebar/Sidebar';
import ModalManager from '../Modal/ModalManager';
import { selectSidebarOpen } from '../../store/slices/uiSlice';

const Layout = ({ children }) => {
  const sidebarOpen = useSelector(selectSidebarOpen);

  return (
    <div className="layout-container">
      <TopBar />
      <div className="layout-content">
        <Sidebar />
        <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>
      <ModalManager />
    </div>
  );
};

export default React.memo(Layout);