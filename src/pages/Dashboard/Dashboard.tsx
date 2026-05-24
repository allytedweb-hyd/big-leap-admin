// pages/Dashboard/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import { Card, CardContent } from '../../components/ui/Card/Card';
import {
  Users,
  FileText,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  LogIn,
  LogOut,
  Filter,
  Building,
  RefreshCw,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalEmployees: number;
  pendingLeaves: number;
  presentToday: number;
  upcomingHolidays: number;
  absentToday: number;
  onLeaveToday: number;
  attendancePercentage: number;
}

interface LeaveRequest {
  _id: string;
  employee_id: {
    _id: string;
    full_name: string;
    email: string;
    image?: string;
    employee_id: string;
  };
  reason: string;
  leave_details: Array<{
    leave_date: string;
    leave_type: string;
    status: string;
  }>;
  created_at: string;
}

interface Holiday {
  _id: string;
  holidayName: string;
  date: string;
  holidayType: string;
  organisationId: string;
  status: string;
}

interface Attendance {
  _id: string;
  employee_id: string;
  employeeDetails?: {
    full_name: string;
    email: string;
    image?: string;
    employee_id: string;
  };
  clock_in: string;
  clock_out: string | null;
  status: string;
  is_wfh: boolean;
  session_hours?: number;
}

interface Organization {
  _id: string;
  name: string;
  code?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface AttendanceResponse {
  attendance: Attendance[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface LeaveResponse {
  leaves: LeaveRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface HolidayResponse {
  holidays: Holiday[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface OverviewResponse {
  stats: DashboardStats;
  recentAttendance: Attendance[];
  recentLeaves: LeaveRequest[];
  upcomingHolidays: Holiday[];
}

const Dashboard: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    pendingLeaves: 0,
    presentToday: 0,
    upcomingHolidays: 0,
    absentToday: 0,
    onLeaveToday: 0,
    attendancePercentage: 0,
  });
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState({
    organizations: false,
    overview: false,
    leaves: false,
    holidays: false,
    attendance: false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch organizations on component mount
  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Fetch dashboard overview when organization is selected
  useEffect(() => {
    if (selectedOrg) {
      fetchDashboardOverview();
    }
  }, [selectedOrg]);

  const fetchOrganizations = async () => {
    setLoading(prev => ({ ...prev, organizations: true }));
    try {
      const res = await httpClient.get<ApiResponse<Organization[]>>('/org/get-all-orgs');
      const orgs = res.data?.data || [];
      setOrganizations(orgs);
      if (orgs.length > 0) {
        setSelectedOrg(orgs[0]._id); // Select first org by default
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(prev => ({ ...prev, organizations: false }));
    }
  };

  const fetchDashboardOverview = async () => {
    setLoading(prev => ({ ...prev, overview: true }));
    setRefreshing(true);
    try {
      const res = await httpClient.get<ApiResponse<OverviewResponse>>(`/dashboard/overview/${selectedOrg}`);
      const data = res.data?.data;
      
      setStats(data.stats);
      setTodayAttendance(data.recentAttendance || []);
      setLeaveRequests(data.recentLeaves || []);
      setHolidays(data.upcomingHolidays || []);
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(prev => ({ ...prev, overview: false }));
      setRefreshing(false);
    }
  };

  const fetchTodayAttendance = async () => {
    setLoading(prev => ({ ...prev, attendance: true }));
    try {
      const res = await httpClient.get<ApiResponse<AttendanceResponse>>(`/dashboard/today-attendance/${selectedOrg}?limit=5`);
      const data = res.data?.data;
      setTodayAttendance(data.attendance || []);
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      toast.error('Failed to load today\'s attendance');
    } finally {
      setLoading(prev => ({ ...prev, attendance: false }));
    }
  };

  const fetchPendingLeaves = async () => {
    setLoading(prev => ({ ...prev, leaves: true }));
    try {
      const res = await httpClient.get<ApiResponse<LeaveResponse>>(`/dashboard/pending-leaves/${selectedOrg}?limit=5`);
      const data = res.data?.data;
      setLeaveRequests(data.leaves || []);
    } catch (error) {
      console.error('Error fetching pending leaves:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(prev => ({ ...prev, leaves: false }));
    }
  };

  const fetchUpcomingHolidays = async () => {
    setLoading(prev => ({ ...prev, holidays: true }));
    try {
      const res = await httpClient.get<ApiResponse<HolidayResponse>>(`/dashboard/upcoming-holidays/${selectedOrg}?limit=4`);
      const data = res.data?.data;
      setHolidays(data.holidays || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast.error('Failed to load holidays');
    } finally {
      setLoading(prev => ({ ...prev, holidays: false }));
    }
  };

  const handleApproveLeave = async (leaveId: string, detailIndex: number) => {
    try {
      await httpClient.put(`/dashboard/approve-leave/${leaveId}`, {
        detailIndex,
        organisationId: selectedOrg,
        approvedBy: 'current-user-id', // You might want to get this from auth context
      });
      toast.success('Leave approved successfully');
      
      // Refresh relevant data
      await Promise.all([
        fetchPendingLeaves(),
        fetchDashboardOverview(),
      ]);
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error('Failed to approve leave');
    }
  };

  const handleRejectLeave = async (leaveId: string, detailIndex: number) => {
    try {
      await httpClient.put(`/dashboard/reject-leave/${leaveId}`, {
        detailIndex,
        organisationId: selectedOrg,
        rejectedBy: 'current-user-id', // You might want to get this from auth context
      });
      toast.success('Leave rejected successfully');
      
      // Refresh relevant data
      await Promise.all([
        fetchPendingLeaves(),
        fetchDashboardOverview(),
      ]);
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Failed to reject leave');
    }
  };

  const handleRefresh = () => {
    if (selectedOrg) {
      fetchDashboardOverview();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate().toString(),
      month: date.toLocaleString('en-US', { month: 'short' }),
      full: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
    };
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getLeaveTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      cl: 'Casual Leave',
      hf: 'Half Day',
      wfh: 'Work From Home',
      lop: 'Loss of Pay',
    };
    return types[type] || type;
  };

  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: styles.pending,
      approved: styles.approved,
      rejected: styles.rejected,
      Present: styles.approved,
      CasualLeave: styles.pending,
      LossOfPay: styles.rejected,
      HalfDay: styles.pending,
      WorkFromHome: styles.pending,
    };
    return statusMap[status] || '';
  };

  return (
    <div className={styles.dashboard}>
      {/* Welcome Section with Organization Filter */}
      <div className={styles.welcomeSection}>
        <div className={styles.welcomeText}>
          <h1>{getGreeting()}, Admin! 👋</h1>
          <p>{currentTime.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
          <button 
            onClick={handleRefresh}
            className={`${styles.punchBtn} ${refreshing ? styles.refreshing : ''}`}
            disabled={refreshing || !selectedOrg}
            style={{ 
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)'
            }}
          >
            <RefreshCw size={16} className={refreshing ? styles.spin : ''} />
            Refresh
          </button>
          
          <div className={styles.filterSelect}>
            <Filter size={18} className={styles.filterIcon} />
            <select 
              value={selectedOrg} 
              onChange={(e) => setSelectedOrg(e.target.value)}
              className={styles.orgSelect}
              disabled={loading.organizations}
            >
              <option value="">Select Organization</option>
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name} {org.code ? `(${org.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedOrg ? (
        <>
          {/* Loading State for Overview */}
          {loading.overview ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
              <div className={styles.spinner}></div>
              <p style={{ marginTop: '16px' }}>Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.blue}`}>
                    <Users size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Total Employees</div>
                    <div className={styles.statValue}>{stats.totalEmployees}</div>
                    <div className={`${styles.statChange} ${styles.positive}`}>
                      <TrendingUp size={12} />
                      Active workforce
                    </div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.green}`}>
                    <LogIn size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Present Today</div>
                    <div className={styles.statValue}>{stats.presentToday}</div>
                    <div className={`${styles.statChange} ${styles.positive}`}>
                      <TrendingUp size={12} />
                      {stats.attendancePercentage}% attendance
                    </div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.orange}`}>
                    <LogOut size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>On Leave Today</div>
                    <div className={styles.statValue}>{stats.onLeaveToday}</div>
                    <div className={styles.statChange}>
                      {stats.absentToday} absent
                    </div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.purple}`}>
                    <FileText size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Pending Leave Requests</div>
                    <div className={styles.statValue}>{stats.pendingLeaves}</div>
                    <div className={`${styles.statChange} ${stats.pendingLeaves > 0 ? styles.negative : styles.positive}`}>
                      {stats.pendingLeaves > 0 ? (
                        <><TrendingDown size={12} /> Requires attention</>
                      ) : (
                        'All clear'
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.blue}`}>
                    <Calendar size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Upcoming Holidays</div>
                    <div className={styles.statValue}>{stats.upcomingHolidays}</div>
                    <div className={styles.statChange}>
                      Next: {holidays[0]?.holidayName || 'No upcoming'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Attendance Table */}
              <Card>
                <CardContent>
                  <div className={styles.sectionTitle}>
                    <span>Today's Attendance</span>
                    <span className={styles.viewAll} onClick={fetchTodayAttendance}>
                      View All
                    </span>
                  </div>
                  {loading.attendance ? (
                    <div className={styles.loading}>Loading attendance...</div>
                  ) : todayAttendance.length > 0 ? (
                    <table className={styles.leaveTable}>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Clock In</th>
                          <th>Clock Out</th>
                          <th>Status</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayAttendance.map((attendance) => (
                          <tr key={attendance._id}>
                            <td>
                              <div className={styles.employeeCell}>
                                <div className={styles.employeeAvatar}>
                                  {attendance.employeeDetails?.full_name 
                                    ? getInitials(attendance.employeeDetails.full_name)
                                    : 'NA'}
                                </div>
                                <div>
                                  <div>{attendance.employeeDetails?.full_name || 'N/A'}</div>
                                  <small style={{ color: 'var(--color-text-muted)' }}>
                                    {attendance.employeeDetails?.email || ''}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>
                              {attendance.clock_in ? (
                                <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <LogIn size={14} />
                                  {formatTime(attendance.clock_in)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)' }}>Not clocked in</span>
                              )}
                            </td>
                            <td>
                              {attendance.clock_out ? (
                                <span style={{ color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <LogOut size={14} />
                                  {formatTime(attendance.clock_out)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)' }}>Not clocked out</span>
                              )}
                            </td>
                            <td>
                              <span className={`${styles.status} ${getStatusClass(attendance.status)}`}>
                                {attendance.status}
                              </span>
                            </td>
                            <td>
                              {attendance.is_wfh && (
                                <span className={styles.wfhBadge}>WFH</span>
                              )}
                              {attendance.session_hours && (
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: '4px' }}>
                                  {attendance.session_hours.toFixed(1)}h
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className={styles.noData}>No attendance records for today</div>
                  )}
                </CardContent>
              </Card>

              {/* Content Grid for Leave Requests and Holidays */}
              <div className={styles.contentGrid}>
                {/* Leave Requests */}
                <Card>
                  <CardContent>
                    <div className={styles.sectionTitle}>
                      <span>Recent Leave Requests</span>
                      <span className={styles.viewAll} onClick={fetchPendingLeaves}>
                        View All
                      </span>
                    </div>
                    {loading.leaves ? (
                      <div className={styles.loading}>Loading leave requests...</div>
                    ) : leaveRequests.length > 0 ? (
                      <table className={styles.leaveTable}>
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaveRequests.map((request) => (
                            request.leave_details?.map((detail, idx) => (
                              <tr key={`${request._id}-${idx}`}>
                                <td>
                                  <div className={styles.employeeCell}>
                                    <div className={styles.employeeAvatar}>
                                      {getInitials(request.employee_id?.full_name || '')}
                                    </div>
                                    <div>
                                      <div>{request.employee_id?.full_name}</div>
                                      <small style={{ color: 'var(--color-text-muted)' }}>
                                        {request.employee_id?.employee_id}
                                      </small>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ textTransform: 'capitalize' }}>
                                  {getLeaveTypeLabel(detail.leave_type)}
                                </td>
                                <td>
                                  {formatDate(detail.leave_date).full}
                                </td>
                                <td>
                                  <span className={`${styles.status} ${getStatusClass(detail.status)}`}>
                                    {detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
                                  </span>
                                </td>
                                <td>
                                  {detail.status === 'pending' && (
                                    <div className={styles.actionBtns}>
                                      <button 
                                        className={`${styles.actionBtn} ${styles.approve}`}
                                        onClick={() => handleApproveLeave(request._id, idx)}
                                        title="Approve"
                                      >
                                        <Check size={14} />
                                      </button>
                                      <button 
                                        className={`${styles.actionBtn} ${styles.reject}`}
                                        onClick={() => handleRejectLeave(request._id, idx)}
                                        title="Reject"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className={styles.noData}>No pending leave requests</div>
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming Holidays */}
                <Card>
                  <CardContent>
                    <div className={styles.sectionTitle}>
                      <span>Upcoming Holidays</span>
                      <span className={styles.viewAll} onClick={fetchUpcomingHolidays}>
                        View Calendar
                      </span>
                    </div>
                    {loading.holidays ? (
                      <div className={styles.loading}>Loading holidays...</div>
                    ) : holidays.length > 0 ? (
                      <div className={styles.holidaysList}>
                        {holidays.map((holiday) => {
                          const { day, month } = formatDate(holiday.date);
                          return (
                            <div key={holiday._id} className={styles.holidayItem}>
                              <div className={styles.holidayDate}>
                                <span className={styles.holidayDay}>{day}</span>
                                <span className={styles.holidayMonth}>{month}</span>
                              </div>
                              <div className={styles.holidayInfo}>
                                <div className={styles.holidayName}>{holiday.holidayName}</div>
                                <div className={styles.holidayType}>
                                  {holiday.holidayType} Holiday
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={styles.noData}>No upcoming holidays</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      ) : (
        <div className={styles.noOrgSelected}>
          <Building size={48} />
          <h3>Select an Organization</h3>
          <p>Please select an organization to view the dashboard</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;