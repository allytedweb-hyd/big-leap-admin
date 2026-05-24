/* HRMS Type Definitions */

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'employee';
  department: string;
  position: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  department: string;
  position: string;
  manager?: string;
  dateOfJoining: string;
  status: 'active' | 'inactive' | 'on-leave';
  salary: number;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  punchIn?: string;
  punchOut?: string;
  status: 'present' | 'absent' | 'half-day' | 'holiday' | 'weekend';
  workHours?: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedOn: string;
  approvedBy?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'national' | 'company' | 'optional';
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  tax: number;
  netSalary: number;
  status: 'pending' | 'paid';
  paidOn?: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  period: string;
  rating: 1 | 2 | 3 | 4 | 5;
  strengths: string[];
  improvements: string[];
  feedback: string;
  goals: string[];
  createdAt: string;
}

export interface DashboardStats {
  totalEmployees: number;
  pendingLeaveRequests: number;
  upcomingHolidays: Holiday[];
  todayAttendance: {
    present: number;
    absent: number;
    onLeave: number;
  };
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  children?: NavItem[];
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  leaveApprovals: boolean;
  payrollAlerts: boolean;
  performanceReviews: boolean;
  companyAnnouncements: boolean;
}
