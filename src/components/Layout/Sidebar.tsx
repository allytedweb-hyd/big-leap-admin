import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import styles from './Sidebar.module.css';

import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Users,
  UserCheck,
  Layers3,
  Database,
  Building2,
  Briefcase,
  ShieldCheck,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
}) => {
  const location = useLocation();
  const [isMasterOpen, setIsMasterOpen] = useState(false);
  const [isWorkshopOpen, setWorkshopDropdown] = useState(false);

  // Master routes
  const masterRoutes = [
    '/organizations',
    '/departments',
    '/roles',
    '/services-master',
  ];
  const workshopRoutes = [
    '/workshops',
    '/workshop-registrations',
  ];

  const isMasterActive = masterRoutes.some((path) =>
    location.pathname.startsWith(path)
  );
    const isWorkshopActive = workshopRoutes.some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <aside
      className={`${styles.sidebar} ${
        collapsed ? styles.collapsed : ''
      }`}
    >
      {/* Logo */}
      <div className={styles.logo}>
        <img
          src="/assets/images/logo1.png"
          alt="Logo"
          width={150}
          height={75}
        />
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {/* Main Menu */}
        <div className={styles.navSection}>
          <div className={styles.navSectionTitle}>
            Main Menu
          </div>

          {/* Dashboard */}
          <Link
            to="/"
            className={`${styles.navItem} ${
              location.pathname === '/' ? styles.active : ''
            }`}
          >
            <span className={styles.navIcon}>
              <LayoutDashboard size={20} />
            </span>

            {!collapsed && (
              <span className={styles.navLabel}>
                Dashboard
              </span>
            )}
          </Link>

          {/* Courses */}
          <Link
            to="/courses"
            className={`${styles.navItem} ${
              location.pathname === '/courses'
                ? styles.active
                : ''
            }`}
          >
            <span className={styles.navIcon}>
              <BookOpen size={20} />
            </span>

            {!collapsed && (
              <span className={styles.navLabel}>
                Courses
              </span>
            )}
          </Link>

          {/* Trainers */}
          <Link
            to="/trainers"
            className={`${styles.navItem} ${
              location.pathname === '/trainers'
                ? styles.active
                : ''
            }`}
          >
            <span className={styles.navIcon}>
              <GraduationCap size={20} />
            </span>

            {!collapsed && (
              <span className={styles.navLabel}>
                Trainers
              </span>
            )}
          </Link>

          {/* Batch Management */}
          <Link
            to="/batches"
            className={`${styles.navItem} ${
              location.pathname === '/batches'
                ? styles.active
                : ''
            }`}
          >
            <span className={styles.navIcon}>
              <Layers3 size={20} />
            </span>

            {!collapsed && (
              <span className={styles.navLabel}>
                Batch Management
              </span>
            )}
          </Link>

          {/* Students */}
          <Link
            to="/students"
            className={`${styles.navItem} ${
              location.pathname === '/students'
                ? styles.active
                : ''
            }`}
          >
            <span className={styles.navIcon}>
              <Users size={20} />
            </span>

            {!collapsed && (
              <span className={styles.navLabel}>
                Students
              </span>
            )}
          </Link>

          {/* Enrolled Students */}
          <Link
            to="/enrolled-students"
            className={`${styles.navItem} ${
              location.pathname === '/enrolled-students'
                ? styles.active
                : ''
            }`}
          >
            <span className={styles.navIcon}>
              <UserCheck size={20} />
            </span>

            {!collapsed && (
              <span className={styles.navLabel}>
                Enrolled Students
              </span>
            )}
          </Link>
      <div className={styles.navGroup}>
  <button
    onClick={() =>
      !collapsed &&
      setWorkshopDropdown(!isWorkshopOpen)
    }
    className={`${styles.navItem} ${
      styles.dropdownToggle
    } ${isWorkshopActive ? styles.active : ''}`}
  >
    <span className={styles.navIcon}>
      <Database size={20} />
    </span>

    {!collapsed && (
      <>
        <span className={styles.navLabel}>
          Workshop
        </span>

        <ChevronDown
          size={16}
          className={`${styles.chevron} ${
            isWorkshopOpen
              ? styles.chevronRotate
              : ''
          }`}
        />
      </>
    )}
  </button>

  <div
    className={`${styles.dropdownWrapper} ${
      isWorkshopOpen && !collapsed
        ? styles.show
        : ''
    }`}
  >
    <div className={styles.dropdownContent}>
      <Link
        to="/workshops"
        className={`${styles.dropdownItem} ${
          location.pathname === '/workshops'
            ? styles.activeChild
            : ''
        }`}
      >
        <Building2 size={16} />
        <span>Workshop</span>
      </Link>

      <Link
        to="/workshop-registrations"
        className={`${styles.dropdownItem} ${
          location.pathname ===
          '/workshop-registrations'
            ? styles.activeChild
            : ''
        }`}
      >
        <Briefcase size={16} />
        <span>Registration</span>
      </Link>
    </div>
  </div>
</div>
          {/* Master Dropdown */}
          {/* <div className={styles.navGroup}>
            <button
              onClick={() =>
                !collapsed &&
                setIsMasterOpen(!isMasterOpen)
              }
              className={`${styles.navItem} ${
                styles.dropdownToggle
              } ${isMasterActive ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>
                <Database size={20} />
              </span>

              {!collapsed && (
                <>
                  <span className={styles.navLabel}>
                    Master
                  </span>

                  <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${
                      isMasterOpen
                        ? styles.chevronRotate
                        : ''
                    }`}
                  />
                </>
              )}
            </button>

            <div
              className={`${styles.dropdownWrapper} ${
                isMasterOpen && !collapsed
                  ? styles.show
                  : ''
              }`}
            >
              <div className={styles.dropdownContent}>
          
                <Link
                  to="/organizations"
                  className={`${styles.dropdownItem} ${
                    location.pathname ===
                    '/organizations'
                      ? styles.activeChild
                      : ''
                  }`}
                >
                  <Building2 size={16} />
                  <span>Organisation</span>
                </Link>

        
                <Link
                  to="/departments"
                  className={`${styles.dropdownItem} ${
                    location.pathname ===
                    '/departments'
                      ? styles.activeChild
                      : ''
                  }`}
                >
                  <Briefcase size={16} />
                  <span>Department</span>
                </Link>

        
                <Link
                  to="/roles"
                  className={`${styles.dropdownItem} ${
                    location.pathname === '/roles'
                      ? styles.activeChild
                      : ''
                  }`}
                >
                  <ShieldCheck size={16} />
                  <span>Role</span>
                </Link>

          
                <Link
                  to="/services-master"
                  className={`${styles.dropdownItem} ${
                    location.pathname ===
                    '/services-master'
                      ? styles.activeChild 
                      : ''
                  }`}
                >
                  <Wrench size={16} />
                  <span>Assets / Service</span>
                </Link>
              </div>
            </div>
          </div> */}

        </div>

        {/* System Section */}
        {/* <div className={styles.navSection}>
          <div className={styles.navSectionTitle}>
            System
          </div>

          <Link
            to="/settings"
            className={`${styles.navItem} ${
              location.pathname === '/settings'
                ? styles.active
                : ''
            }`}
          >
            <span className={styles.navIcon}>
              <Settings size={20} />
            </span>

            {!collapsed && (
              <span className={styles.navLabel}>
                Settings
              </span>
            )}
          </Link>
        </div> */}
      </nav>

      {/* Collapse Button */}
      <button
        className={styles.collapseBtn}
        onClick={onToggle}
      >
        {collapsed ? (
          <ChevronRight size={20} />
        ) : (
          <ChevronLeft size={20} />
        )}

        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
};

export default Sidebar;