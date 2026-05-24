import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import styles from './Layout.module.css';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  // Making children optional fixes the ts(2741) error in App.tsx
  children?: React.ReactNode; 
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className={styles.layout}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />
      {/* <div className={styles.wrapper}> */}
        <Header sidebarCollapsed={sidebarCollapsed} />
        <main className={`${styles.main} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
          {/* Outlet renders the child route elements (Dashboard, Employees, etc.)
            The 'children ||' part ensures backward compatibility.
          */}
          {children || <Outlet />}
        </main>
      {/* </div> */}
    </div>
  );
};

export default Layout;

// import React, { useState } from 'react';
// import styles from './Layout.module.css';
// import { Sidebar } from './Sidebar';
// import { Header } from './Header';

// interface LayoutProps {
//   children: React.ReactNode;
// }

// export const Layout: React.FC<LayoutProps> = ({ children }) => {
//   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

//   const handleToggleSidebar = () => {
//     setSidebarCollapsed(!sidebarCollapsed);
//   };

//   return (
//     <div className={styles.layout}>
//       <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />
//       <Header sidebarCollapsed={sidebarCollapsed} />
//       <main className={`${styles.main} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
//         {children}
//       </main>
//     </div>
//   );
// };

// export default Layout;
