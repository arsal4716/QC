import SidebarItem from "./SidebarItem";
import { useAuth } from "../contexts/AuthContext";

const Sidebar = ({ collapsed, activePage, setActivePage }) => {
  const { logout } = useAuth();

  const menuItems = [
    { id: "reporting", label: "Reporting", icon: "bi-bar-chart", path: "/reporting" },
    { id: "ringba", label: "Ringba Calls", icon: "bi-phone", path: "/calls/ringba" },
    { id: "callgrid", label: "CallGrid Calls", icon: "bi-telephone", path: "/calls/callgrid" },
    { id: "caps", label: "Caps", icon: "bi-graph-up", path: "/caps" },
    { id: "users", label: "Users", icon: "bi-people", path: "/users" },
    { id: "logout", label: "Logout", icon: "bi-box-arrow-right", action: logout },
  ];

  const topItems = menuItems.filter((i) => i.id !== "logout");
  const bottomItems = menuItems.filter((i) => i.id === "logout");

  return (
    <aside className="text-white h-100 sticky-top d-flex flex-column"
      style={{ backgroundColor: "#151824", width: collapsed ? "80px" : "220px", transition: "width 0.3s", overflowY: "auto" }}
    >
      <nav className="nav flex-column p-3 flex-grow-1">
        {topItems.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            isActive={activePage === item.id}
            onClick={setActivePage}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <nav className="nav flex-column p-3">
        {bottomItems.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            isActive={false}
            onClick={(id) => {
              item.action?.();
              setActivePage(id);
            }}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
