// components/Layout/Header/Header.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import styles from './Header.module.css';
import { Search, Bell, ChevronDown, ChevronRight, User, LogOut, Settings } from 'lucide-react';
import { getUserFromStorage, getUserInitials, getUserName, getUserRole } from '../../lib/userData';

interface HeaderProps {
  sidebarCollapsed: boolean;
}

// ─── Route segment label map ───────────────────────────────────────────────────
// Maps any URL segment (or full path) to a human-readable label.
// Add new routes here as the app grows.
const SEGMENT_LABELS: Record<string, string> = {
  // top-level pages
  '':                   'Dashboard',
  'dashboard':          'Dashboard',
  'employees':          'Employees',
  'attendance':         'Attendance',
  'leaves':             'Leave Management',
  'holidays':           'Holidays',
  'payroll':            'Payroll',
  'performance':        'Performance',
  'settings':           'Settings',
  'organizations':      'Organizations',
  'departments':        'Departments',
  'roles':              'Roles',
  'services-master':    'Services',
  'employee-tracking':  'Employee Tracking',
  'profile':            'My Profile',
  'admins':             'Admins',
  'faqs':               'FAQs',
  'technologies':       'Technologies',
  // nested / action segments
  'new':                'New',
  'edit':               'Edit',
  'view':               'View',
  'details':            'Details',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a label for a single path segment. Falls back to title-casing the raw segment. */
const labelFor = (segment: string): string => {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  // If it looks like a MongoDB ObjectId or UUID, show "Details"
  if (/^[a-f0-9]{24}$/i.test(segment) || /^[0-9a-f-]{36}$/i.test(segment)) return 'Details';
  // Title-case the raw segment as a last resort
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

interface BreadcrumbSegment {
  label: string;
  path: string;
  isLast: boolean;
}

/** Converts the current pathname into an array of breadcrumb segments. */
const buildBreadcrumbs = (pathname: string): BreadcrumbSegment[] => {
  const parts = pathname.split('/').filter(Boolean); // remove empty strings

  const crumbs: BreadcrumbSegment[] = [
    { label: 'Home', path: '/', isLast: parts.length === 0 },
  ];

  parts.forEach((part, index) => {
    const path = '/' + parts.slice(0, index + 1).join('/');
    crumbs.push({
      label: labelFor(part),
      path,
      isLast: index === parts.length - 1,
    });
  });

  return crumbs;
};

// ─── Component ─────────────────────────────────────────────────────────────────

export const Header: React.FC<HeaderProps> = ({ sidebarCollapsed }) => {
  const location  = useLocation();
  const navigate  = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userName, setUserName]             = useState('');
  const [userRole, setUserRole]             = useState('');
  const [userInitials, setUserInitials]     = useState('U');
  const [userEmail, setUserEmail]           = useState('');
  const dropdownRef                         = useRef<HTMLDivElement>(null);

  const breadcrumbs = buildBreadcrumbs(location.pathname);
  const pageTitle   = breadcrumbs[breadcrumbs.length - 1]?.label ?? 'Dashboard';

  useEffect(() => {
    const user = getUserFromStorage();
    if (user) {
      setUserName(getUserName());
      setUserInitials(getUserInitials());
      setUserEmail(user.email || '');
      setUserRole(getUserRole());
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userjwttoken');
    localStorage.removeItem('user');
    setIsDropdownOpen(false);
    window.location.href = '/login';
  };

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    setIsDropdownOpen(false);
    navigate('/settings');
  };

  return (
    <header className={`${styles.header} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
      <div className={styles.headerLeft}>

        {/* ── Dynamic Breadcrumb ── */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && (
                <ChevronRight size={14} className={styles.breadcrumbSeparator} />
              )}
              {crumb.isLast ? (
                <span className={styles.breadcrumbCurrent}>{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className={styles.breadcrumbLink}>
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>

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
          <div className={styles.userInfoWrapper} onClick={() => setIsDropdownOpen(o => !o)}>
            <div className={styles.avatar}>{userInitials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{userName}</span>
            </div>
            <ChevronDown
              size={16}
              className={`${styles.chevron} ${isDropdownOpen ? styles.chevronRotated : ''}`}
            />
          </div>

          {isDropdownOpen && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownAvatar}>{userInitials}</div>
                <div className={styles.dropdownUserInfo}>
                  <span className={styles.dropdownUserName}>{userName}</span>
                  <span className={styles.dropdownUserEmail}>{userEmail}</span>
                </div>
              </div>

              <div className={styles.dropdownDivider} />
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