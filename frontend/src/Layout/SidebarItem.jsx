import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const SidebarItem = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const handleClick = () => {
    if (item.id === "logout") {
      logout();         
      navigate("/login"); 
    } else if (item.subItems) {
      setExpanded(!expanded);
    } else {
      navigate(item.path);
    }
  };

  const isActive = location.pathname === item.path;

  return (
    <div>
      <button
        className={`btn w-100 text-start text-white d-flex align-items-center mb-2 ${
          isActive ? "btn-primary" : "btn-dark"
        }`}
        onClick={handleClick}
      >
        <i className={`${item.icon} me-2`}></i>
        {item.label}
        {item.subItems && (
          <i
            className={`bi ms-auto ${
              expanded ? "bi-chevron-down" : "bi-chevron-right"
            }`}
          ></i>
        )}
      </button>
      {item.subItems && expanded && (
        <div className="ms-4">
          {item.subItems.map((subItem, idx) => (
            <button
              key={idx}
              className="btn btn-sm w-100 text-start text-white-50"
              onClick={() => navigate(subItem.path)}
            >
              {subItem.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SidebarItem;
