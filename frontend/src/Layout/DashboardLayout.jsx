import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

const DashboardLayout = ({ children, activePage, setActivePage }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="d-flex flex-column vh-100">
      <Header toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />      
      <div className="d-flex flex-grow-1" style={{ overflow: 'hidden' }}>
        <div className="flex-shrink-0">
          <Sidebar
            collapsed={sidebarCollapsed}
            activePage={activePage}
            setActivePage={setActivePage}
          />
        </div>

        <main className="flex-grow-1 p-3" style={{ overflow: 'auto', backgroundColor:'#12172b' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;