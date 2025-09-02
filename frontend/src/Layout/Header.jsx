import { Image } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import logo from '../assets/logo.webp'
const Header = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="d-flex align-items-center bg-white shadow-sm p-3">
      <button
        className="btn btn-outline-secondary d-md-none me-3"
        onClick={toggleSidebar}
      >
        <i className="bi bi-list"></i>
      </button>
        <Image className="ms-5" src={logo} alt="hlg logo" height={50} width={90}/>
      <div className="ms-auto d-flex align-items-center">
        <div className="dropdown">
          <button
            className="btn btn-sm btn-outline-secondary dropdown-toggle"
            data-bs-toggle="dropdown"
          >
            <i className="bi bi-person-circle me-1"></i> {user?.name || "Profile"}
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <button className="dropdown-item" disabled>
                {user?.email}
              </button>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button className="dropdown-item text-danger" onClick={logout}>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Header;
