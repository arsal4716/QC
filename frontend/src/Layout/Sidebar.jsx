import SidebarItem from "./SidebarItem";

const Sidebar = ({ collapsed, activePage, setActivePage }) => {
  const menuItems = [
  { id: "reporting", label: "Reporting", icon: "bi-bar-chart", path: "/reporting" },
  { id: "callLogs", label: "Call Logs", icon: "bi-hash", path: "/callLogs" },
  { id: "users", label: "Users", icon: "bi-people", path: "/users" },
  // { id: "Cost", label: "cost", icon: "bi-money", path: "/cost" },
  { id: "logout", label: "Logout", icon: "bi-box-arrow-right", path: "/login" }, 
];

  return (
    <aside
      className="text-white h-100 sticky-top"
      style={{
        backgroundColor:"#151824",
        width: collapsed ? "80px" : "220px",
        transition: "width 0.3s",
        overflowY: "auto"
      }}
    >
      <nav className="nav flex-column p-3">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            isActive={activePage === item.id}
            onClick={setActivePage}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;