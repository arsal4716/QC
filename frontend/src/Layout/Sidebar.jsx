import SidebarItem from "./SidebarItem";

const Sidebar = ({ collapsed, activePage, setActivePage }) => {
  const menuItems = [
    {
      id: "reporting",
      label: "Reporting",
      icon: "bi-bar-chart",
      path: "/reporting",
    },
    { id: "callLogs", label: "Call Logs", icon: "bi-phone", path: "/callLogs" },
    { id: "caps", label: "Caps", icon: "bi-graph-up", path: "/caps" },
    {
      id: "TwilioCalls",
      label: "Twilio Calls",
      icon: "bi-telephone",
      path: "/twilioCalls",
    },
    { id: "users", label: "Users", icon: "bi-people", path: "/users" },
    {
      id: "logout",
      label: "Logout",
      icon: "bi-box-arrow-right",
      path: "/login",
    },
  ];

  const topItems = menuItems.slice(0, 4);
  const bottomItems = menuItems.filter((item) => item.id === "logout");

  return (
    <aside
      className="text-white h-100 sticky-top d-flex flex-column"
      style={{
        backgroundColor: "#151824",
        width: collapsed ? "80px" : "220px",
        transition: "width 0.3s",
        overflowY: "auto",
      }}
    >
      <nav className="nav flex-column p-3 flex-grow-1">
        {/* Top Items */}
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
