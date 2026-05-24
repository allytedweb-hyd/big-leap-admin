// components/Layout/Header/Header.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import { Search, Bell, ChevronDown, ChevronRight, User, LogOut, Settings } from 'lucide-react';
import { getUserFromStorage, getUserInitials, getUserName, getUserRole } from '../../lib/userData';

interface HeaderProps {
  sidebarCollapsed: boolean;
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/employees': 'Employees',
  '/attendance': 'Attendance',
  '/leaves': 'Leave Management',
  '/holidays': 'Holidays',
  '/payroll': 'Payroll',
  '/performance': 'Performance',
  '/settings': 'Settings',
  '/organizations': 'Organizations',
  '/departments': 'Departments',
  '/roles': 'Roles',
  '/services-master': 'Services',
  '/employee-tracking': 'Employee Tracking',
  '/profile': 'My Profile',
};

export const Header: React.FC<HeaderProps> = ({ sidebarCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userInitials, setUserInitials] = useState('U');
  const [userEmail, setUserEmail] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentPath = location.pathname;
  
  // Find the matching page title (handle nested routes)
  const getPageTitle = () => {
    // Check for exact match first
    if (pageTitles[currentPath]) {
      return pageTitles[currentPath];
    }
    
    // Check for nested routes (e.g., /employee-tracking/123)
    for (const [path, title] of Object.entries(pageTitles)) {
      if (currentPath.startsWith(path) && path !== '/') {
        return title;
      }
    }
    
    return 'Dashboard';
  };

  const pageTitle = getPageTitle();

  useEffect(() => {
    // Load user data from localStorage
    const user = getUserFromStorage();
    if (user) {
      setUserName(getUserName());
      setUserInitials(getUserInitials());
      setUserEmail(user.email || '');
      setUserRole(getUserRole());
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    // Clear all stored data
    localStorage.removeItem('userjwttoken');
    localStorage.removeItem('user');
    
    // Close dropdown
    setIsDropdownOpen(false);
    
    // Use window.location.href for a hard redirect to ensure everything is cleared
    window.location.href = '/login';
    
    // Alternative: use navigate with replace to prevent going back
    // navigate('/login', { replace: true });
  };

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    setIsDropdownOpen(false);
    navigate('/settings');
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <header className={`${styles.header} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
      <div className={styles.headerLeft}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbLink}>Home</span>
          <ChevronRight size={14} />
          <span>{pageTitle}</span>
        </div>
      </div>

      <div className={styles.headerRight}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search employees, documents..."
            className={styles.searchInput}
          />
        </div>

        <button className={styles.iconBtn}>
          <Bell size={20} />
          <span className={styles.badge}>3</span>
        </button>

        <div className={styles.userMenu} ref={dropdownRef}>
          <div className={styles.userInfoWrapper} onClick={toggleDropdown}>
            <div className={styles.avatar}>
              {userInitials}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{userName}</span>
              {/* <span className={styles.userRole}>{userRole}</span> */}
            </div>
            <ChevronDown 
              size={16} 
              className={`${styles.chevron} ${isDropdownOpen ? styles.chevronRotated : ''}`} 
            />
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownAvatar}>
                  {userInitials}
                </div>
                <div className={styles.dropdownUserInfo}>
                  <span className={styles.dropdownUserName}>{userName}</span>
                  <span className={styles.dropdownUserEmail}>
                    {userEmail}
                  </span>
                </div>
              </div>
              
              <div className={styles.dropdownDivider} />
              
              <button className={styles.dropdownItem} onClick={handleProfileClick}>
                <User size={16} />
                <span>My Profile</span>
              </button>
              
              <button className={styles.dropdownItem} onClick={handleSettingsClick}>
                <Settings size={16} />
                <span>Settings</span>
              </button>
              
              <div className={styles.dropdownDivider} />
              
              <button className={`${styles.dropdownItem} ${styles.logoutBtn}`} onClick={handleLogout}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;