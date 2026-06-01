import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Employees from './pages/Employees/Employees';
import Courses from './pages/Courses/Courses';
import Students from './pages/Students/Students';
import Holidays from './pages/Holidays/Holidays';
import Organizations from './pages/Organization/Organization';
import Departments from './pages/Departments/Departments';
import Roles from './pages/Roles/Roles';
import Services from './pages/Service/ServiceMaster';
import Placeholder from './pages/Placeholder/Placeholder';
import Login from './pages/Auth/Login';
import Workshops from './pages/Workshop/Workshop';
import WorkshopRegistrations from './pages/Workshop/WorkshopRegistraions';
import Enquiries from './pages/Enquiries/Enquiries';
import FAQPage from './pages/Faq/FAQPage';
import TestimonialsPage from './pages/Testimonials/Testimonials';
import TechstackHeading from './pages/TechstackHeading/TechstackHeading';
import Techstack from './pages/TechstackHeading/TechStack';
import Trainers from './pages/Trainers/Trainers';
import StudentEnrollments from './pages/StudentEnrollments/StudentEnrollments';
import Batches from './pages/Batches/Batches';
import ManageBatches from './pages/Batches/ManageBatch';
import Admins from './pages/Admins/Admins';
import TechnologyPage from './pages/Technology/Technology';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem("userjwttoken"));

  const handleLogin = (userData: any) => {
    setIsAuthenticated(true);
  };

  return (
    <BrowserRouter>
      {/* Move Toaster here - outside Routes but inside BrowserRouter */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#10b981',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
      
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />} 
        />

        <Route
          path="/"
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="courses" element={<Courses />} />
          <Route path="students" element={<Students />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="departments" element={<Departments />} />
          <Route path="roles" element={<Roles />} />
          <Route path="workshops" element={<Workshops />} />
          <Route path="workshop-registrations" element={<WorkshopRegistrations />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="faqs" element={<FAQPage />} />
          <Route path="testimonials" element={<TestimonialsPage />} />
          <Route path="leave" element={<Placeholder title="Leave" description="Manage approvals." />} />
          <Route path="holidays" element={<Holidays />} />
          <Route path="services-master" element={<Services />} />
          <Route path="payroll" element={<Placeholder title="Payroll" description="View payslips." />} />
          <Route path="settings" element={<Placeholder title="Settings" description="Manage preferences." />} />
          <Route path="techstack-heading" element={<TechstackHeading />} />
          <Route path="techstack" element={<Techstack />} />
          <Route path="trainers" element={<Trainers />} />
          <Route path="students-enrollments" element={<StudentEnrollments />} />
          <Route path="batches" element={<Batches />} />
          <Route path="manage-batches/:batchId" element={<ManageBatches />} />
          <Route path="manage-admins" element={<Admins />} />
          <Route path="manage-technology" element={<TechnologyPage />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;