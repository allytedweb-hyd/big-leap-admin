// components/Layout/Sidebar/Sidebar.tsx
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
  Building2,
  Briefcase,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  HelpCircle,
  Star,
  Cpu,           // Tech Stack (parent)
  Code2,         // Tech Stack item / Manage Technology
  Heading,       // Tech Stack Heading
  CalendarDays,  // Batches (parent)
  LayoutList,    // Manage Batches / Batches list
  UserRound,     // Students (parent)
  ClipboardList, // Student Enrollments
  Hammer,        // Workshop (parent)
  PenSquare,     // Workshop Registrations
  KeyRound,      // Manage Admins
  Database,      // Master (parent)
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();

  const [isMasterOpen,   setIsMasterOpen]   = useState(false);
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
  const [isTechOpen,     setIsTechOpen]     = useState(false);
  const [isStudentsOpen, setIsStudentsOpen] = useState(false);
  const [isBatchesOpen,  setIsBatchesOpen]  = useState(false);

  // ── Active-route helpers ──────────────────────────────────────────────────────
  const isActive    = (path: string) => location.pathname === path;
  const isUnderPath = (paths: string[]) => paths.some(p => location.pathname.startsWith(p));

  const isMasterActive   = isUnderPath(['/manage-admins', '/manage-technology']);
  const isWorkshopActive = isUnderPath(['/workshops', '/workshop-registrations']);
  const isTechActive     = isUnderPath(['/techstack', '/techstack-heading']);
  const isStudentsActive = isUnderPath(['/students']);
  const isBatchesActive  = isUnderPath(['/batches']);

  // ── Reusable dropdown component ───────────────────────────────────────────────
  const NavDropdown: React.FC<{
    icon: React.ReactNode;
    label: string;
    isOpen: boolean;
    isGroupActive: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }> = ({ icon, label, isOpen, isGroupActive, onToggle: toggle, children }) => (
    <div className={styles.navGroup}>
      <button
        onClick={() => !collapsed && toggle()}
        className={`${styles.navItem} ${styles.dropdownToggle} ${isGroupActive ? styles.active : ''}`}
      >
        <span className={styles.navIcon}>{icon}</span>
        {!collapsed && (
          <>
            <span className={styles.navLabel}>{label}</span>
            <ChevronDown
              size={16}
              className={`${styles.chevron} ${isOpen ? styles.chevronRotate : ''}`}
            />
          </>
        )}
      </button>

      <div className={`${styles.dropdownWrapper} ${isOpen && !collapsed ? styles.show : ''}`}>
        <div className={styles.dropdownContent}>
          {children}
        </div>
      </div>
    </div>
  );

  // ── Reusable dropdown item ────────────────────────────────────────────────────
  const DropdownLink: React.FC<{
    to: string;
    icon: React.ReactNode;
    label: string;
  }> = ({ to, icon, label }) => (
    <Link
      to={to}
      className={`${styles.dropdownItem} ${isActive(to) ? styles.activeChild : ''}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );

  // ── Reusable top-level nav link ───────────────────────────────────────────────
  const NavLink: React.FC<{
    to: string;
    icon: React.ReactNode;
    label: string;
    exact?: boolean;
  }> = ({ to, icon, label, exact = true }) => {
    const active = exact ? isActive(to) : location.pathname.startsWith(to);
    return (
      <Link to={to} className={`${styles.navItem} ${active ? styles.active : ''}`}>
        <span className={styles.navIcon}>{icon}</span>
        {!collapsed && <span className={styles.navLabel}>{label}</span>}
      </Link>
    );
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>

      {/* Logo */}
      <div className={styles.logo}>
        <img src="/assets/images/logo1.png" alt="Logo" width={150} height={75} />
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navSection}>
          <div className={styles.navSectionTitle}>Main Menu</div>

          {/* Dashboard */}
          <NavLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />

          {/* Courses */}
          <NavLink to="/courses" icon={<BookOpen size={20} />} label="Courses" />

          {/* Trainers */}
          <NavLink to="/trainers" icon={<GraduationCap size={20} />} label="Trainers" />

          {/* Batches */}
          <NavDropdown
            icon={<CalendarDays size={20} />}
            label="Batches"
            isOpen={isBatchesOpen}
            isGroupActive={isBatchesActive}
            onToggle={() => setIsBatchesOpen(o => !o)}
          >
            <DropdownLink to="/batches" icon={<LayoutList size={16} />} label="All Batches" />
          </NavDropdown>

          {/* Students */}
          <NavDropdown
            icon={<UserRound size={20} />}
            label="Students"
            isOpen={isStudentsOpen}
            isGroupActive={isStudentsActive}
            onToggle={() => setIsStudentsOpen(o => !o)}
          >
            <DropdownLink to="/students-enrollments" icon={<ClipboardList size={16} />} label="Student Enrollments" />
            <DropdownLink to="/students"             icon={<Users size={16} />}         label="Students" />
          </NavDropdown>

          {/* Enquiries */}
          <NavLink to="/enquiries" icon={<MessageSquare size={20} />} label="Enquiries" />

          {/* FAQs */}
          <NavLink to="/faqs" icon={<HelpCircle size={20} />} label="FAQs" />

          {/* Testimonials */}
          <NavLink to="/testimonials" icon={<Star size={20} />} label="Testimonials" />

          {/* Workshop */}
          <NavDropdown
            icon={<Hammer size={20} />}
            label="Workshop"
            isOpen={isWorkshopOpen}
            isGroupActive={isWorkshopActive}
            onToggle={() => setIsWorkshopOpen(o => !o)}
          >
            <DropdownLink to="/workshops"              icon={<Hammer size={16} />}      label="Workshops" />
            <DropdownLink to="/workshop-registrations" icon={<PenSquare size={16} />}   label="Registrations" />
          </NavDropdown>

          {/* Tech Stack */}
          <NavDropdown
            icon={<Cpu size={20} />}
            label="Tech Stack"
            isOpen={isTechOpen}
            isGroupActive={isTechActive}
            onToggle={() => setIsTechOpen(o => !o)}
          >
            <DropdownLink to="/techstack-heading" icon={<Heading size={16} />} label="Tech Stack Heading" />
            <DropdownLink to="/techstack"         icon={<Code2 size={16} />}   label="Tech Stack" />
          </NavDropdown>

          {/* Master */}
          <NavDropdown
            icon={<Database size={20} />}
            label="Master"
            isOpen={isMasterOpen}
            isGroupActive={isMasterActive}
            onToggle={() => setIsMasterOpen(o => !o)}
          >
            <DropdownLink to="/manage-admins"      icon={<KeyRound size={16} />}   label="Manage Admins" />
            <DropdownLink to="/manage-technology"  icon={<Code2 size={16} />}      label="Manage Technology" />
          </NavDropdown>

        </div>
      </nav>

      {/* Collapse Button */}
      <button className={styles.collapseBtn} onClick={onToggle}>
        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
};

export default Sidebar;