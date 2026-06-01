import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import {
  BookOpen, Users, UserCheck, Layers, TrendingUp, TrendingDown,
  IndianRupee, Calendar, Clock, Award, Radio, BarChart2,
  RefreshCw, ArrowUpRight, ArrowDownRight, Minus,
  GraduationCap, Zap, Star,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalCourses: number;
  totalStudents: number;
  totalTrainers: number;
  totalBatches: number;
  totalEnrollments: number;
  totalWorkshops: number;
  totalWorkshopRegistrations: number;
  totalRevenue: number;
  revenueThisMonth: number;
  paidEnrollments: number;
  pendingEnrollments: number;
  newStudentsThisMonth: number;
  newEnrollmentsThisMonth: number;
  growth: { students: number; enrollments: number; revenue: number };
}

interface RecentEnrollment {
  _id: string;
  courseId: { title: string; courseThumbnailImage: string; coursePrice: number } | null;
  studentId: { studentName: string; email: string } | null;
  totalFee: number;
  paidamount: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: string;
}

interface RecentStudent {
  _id: string;
  studentName: string;
  email: string;
  mobileNumber: string;
  currentJobStatus: string | null;
  createdAt: string;
}

interface UpcomingBatch {
  _id: string;
  courseId: { title: string; courseThumbnailImage: string } | null;
  trainersId: { trainerName: string; profileImage: string | null } | null;
  batchStartDate: string;
  batchTimings: string;
  studentsId: string[];
}

interface UpcomingWorkshop {
  _id: string;
  workshopHeading: string;
  date: string;
  time: string;
  platform: string;
}

interface PopularCourse {
  _id: string;
  title: string;
  thumbnail: string;
  price: number;
  enrollmentCount: number;
}

interface ChartPoint {
  label: string;
  enrollments: number;
  students: number;
  revenue: number;
}

interface DashboardData {
  stats: Stats;
  recentStudents: RecentStudent[];
  recentEnrollments: RecentEnrollment[];
  upcomingBatches: UpcomingBatch[];
  upcomingWorkshops: UpcomingWorkshop[];
  popularCourses: PopularCourse[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

const fmtRupee = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const paymentColor = (s: string) =>
  s === 'paid' ? '#16a34a' : s === 'failed' ? '#dc2626' : '#d97706';

const paymentBg = (s: string) =>
  s === 'paid' ? '#dcfce7' : s === 'failed' ? '#fee2e2' : '#fef3c7';

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  growth?: number;
  accent: string;
  accentLight: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sub, growth, accent, accentLight }) => (
  <div style={{
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: '20px 22px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    transition: 'box-shadow 0.2s',
  }}
    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)')}
  >
    <div style={{
      width: 48, height: 48, borderRadius: 12,
      background: accentLight,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: accent, flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1.1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        {growth !== undefined ? (
          <>
            {growth > 0
              ? <ArrowUpRight size={13} color="#16a34a" />
              : growth < 0
              ? <ArrowDownRight size={13} color="#dc2626" />
              : <Minus size={13} color="#6b7280" />}
            <span style={{ color: growth > 0 ? '#16a34a' : growth < 0 ? '#dc2626' : '#6b7280', fontWeight: 600 }}>
              {Math.abs(growth)}%
            </span>
            <span style={{ color: '#9ca3af' }}>vs last month</span>
          </>
        ) : (
          <span style={{ color: '#9ca3af' }}>{sub}</span>
        )}
      </div>
    </div>
  </div>
);

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────

const MiniBarChart: React.FC<{ data: ChartPoint[]; field: 'enrollments' | 'students' | 'revenue'; color: string }> = ({ data, field, color }) => {
  const max = Math.max(...data.map(d => d[field]), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div
            title={`${d.label}: ${field === 'revenue' ? fmtRupee(d[field]) : d[field]}`}
            style={{
              width: '100%',
              height: `${Math.max(4, (d[field] / max) * 40)}px`,
              background: color,
              borderRadius: '3px 3px 0 0',
              transition: 'height 0.4s ease',
              cursor: 'default',
              opacity: i === data.length - 1 ? 1 : 0.5 + (i / data.length) * 0.5,
            }}
          />
          <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>{d.label.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; badge?: number }> = ({ title, icon, badge }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
    <div style={{ color: '#6366f1' }}>{icon}</div>
    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h3>
    {badge !== undefined && (
      <span style={{
        marginLeft: 'auto',
        background: '#e0e7ff', color: '#4338ca',
        borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 600,
      }}>
        {badge}
      </span>
    )}
  </div>
);

// ─── Dashboard Component ──────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const [overviewRes, chartRes] = await Promise.all([
        httpClient.get('/dashboard/overview'),
        httpClient.get('/dashboard/enrollment-chart'),
      ]);
      setData(overviewRes.data?.data);
      setChartData(chartRes.data?.data || []);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        <p style={{ color: '#6b7280', fontSize: 14 }}>Loading dashboard...</p>
      </div>
    );
  }

  if (!data) return null;

  const { stats, recentStudents, recentEnrollments, upcomingBatches, upcomingWorkshops, popularCourses } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Welcome Bar ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
        borderRadius: 16, padding: '22px 28px', color: '#fff',
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            {getGreeting()}, Admin! 👋
          </div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.newStudentsThisMonth}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>New Students this month</div>
          </div>
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.3)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.newEnrollmentsThisMonth}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Enrollments this month</div>
          </div>
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.3)' }} />
          <button
            onClick={fetchAll}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat Cards Row 1 ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          icon={<BookOpen size={22} />}
          label="Total Courses"
          value={stats.totalCourses}
          sub="Published courses"
          accent="#6366f1" accentLight="#e0e7ff"
        />
        <StatCard
          icon={<Users size={22} />}
          label="Total Students"
          value={fmt(stats.totalStudents)}
          growth={stats.growth.students}
          accent="#0ea5e9" accentLight="#e0f2fe"
        />
        <StatCard
          icon={<UserCheck size={22} />}
          label="Total Trainers"
          value={stats.totalTrainers}
          sub="Active trainers"
          accent="#f97316" accentLight="#fff7ed"
        />
        <StatCard
          icon={<Layers size={22} />}
          label="Active Batches"
          value={stats.totalBatches}
          sub={`${upcomingBatches.length} upcoming`}
          accent="#8b5cf6" accentLight="#f5f3ff"
        />
      </div>

      {/* ── Stat Cards Row 2 ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          icon={<GraduationCap size={22} />}
          label="Total Enrollments"
          value={fmt(stats.totalEnrollments)}
          growth={stats.growth.enrollments}
          accent="#10b981" accentLight="#d1fae5"
        />
        <StatCard
          icon={<IndianRupee size={22} />}
          label="Total Revenue"
          value={fmtRupee(stats.totalRevenue)}
          growth={stats.growth.revenue}
          accent="#f59e0b" accentLight="#fef3c7"
        />
        <StatCard
          icon={<Zap size={22} />}
          label="Workshops"
          value={stats.totalWorkshops}
          sub={`${stats.totalWorkshopRegistrations} registrations`}
          accent="#ec4899" accentLight="#fce7f3"
        />
        <StatCard
          icon={<Award size={22} />}
          label="Pending Payments"
          value={stats.pendingEnrollments}
          sub={`${stats.paidEnrollments} paid`}
          accent="#ef4444" accentLight="#fee2e2"
        />
      </div>

      {/* ── Chart + Popular Courses ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>

        {/* Chart card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <SectionHeader title="6-Month Growth Overview" icon={<BarChart2 size={18} />} />
          {chartData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Enrollment bars */}
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>
                  Enrollments
                </div>
                <MiniBarChart data={chartData} field="enrollments" color="#6366f1" />
              </div>
              {/* Student bars */}
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>
                  New Students
                </div>
                <MiniBarChart data={chartData} field="students" color="#0ea5e9" />
              </div>
              {/* Revenue bars */}
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>
                  Revenue (₹)
                </div>
                <MiniBarChart data={chartData} field="revenue" color="#f59e0b" />
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 20, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
                {[
                  { color: '#6366f1', label: 'Enrollments' },
                  { color: '#0ea5e9', label: 'Students' },
                  { color: '#f59e0b', label: 'Revenue' },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0' }}>No chart data available</div>
          )}
        </div>

        {/* Popular Courses */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <SectionHeader title="Popular Courses" icon={<Star size={18} />} badge={popularCourses.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {popularCourses.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0' }}>No data</div>
            )}
            {popularCourses.map((course, i) => (
              <div key={course._id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10, background: '#f9fafb',
                border: '1px solid #f3f4f6',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: ['#e0e7ff', '#d1fae5', '#fef3c7', '#fce7f3', '#e0f2fe'][i] || '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13,
                  color: ['#4338ca', '#047857', '#b45309', '#9d174d', '#0369a1'][i] || '#374151',
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {course.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                    {fmtRupee(course.price)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#6366f1' }}>{course.enrollmentCount}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>students</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Enrollments ──────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <SectionHeader title="Recent Enrollments" icon={<GraduationCap size={18} />} badge={recentEnrollments.length} />
        {recentEnrollments.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '24px 0' }}>No enrollments yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Student', 'Course', 'Total Fee', 'Paid', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentEnrollments.map((e) => (
                  <tr key={e._id} style={{ borderBottom: '1px solid #f3f4f6' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 700,
                        }}>
                          {e.studentId ? initials(e.studentId.studentName) : '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{e.studentId?.studentName || '—'}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{e.studentId?.email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151', maxWidth: 200 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {e.courseId?.title || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151', fontWeight: 500 }}>
                      {fmtRupee(e.totalFee)}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151', fontWeight: 500 }}>
                      {fmtRupee(e.paidamount)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: paymentBg(e.paymentStatus),
                        color: paymentColor(e.paymentStatus),
                        textTransform: 'capitalize',
                      }}>
                        {e.paymentStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 12 }}>
                      {fmtDate(e.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Upcoming Batches + Workshops ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Upcoming Batches */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <SectionHeader title="Upcoming Batches" icon={<Calendar size={18} />} badge={upcomingBatches.length} />
          {upcomingBatches.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '24px 0' }}>No upcoming batches</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcomingBatches.map(batch => (
                <div key={batch._id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10,
                  border: '1px solid #e5e7eb', background: '#fafafa',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff',
                  }}>
                    <BookOpen size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {batch.courseId?.title || '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <UserCheck size={10} /> {batch.trainersId?.trainerName || '—'}
                      </span>
                      <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} /> {batch.batchTimings}
                      </span>
                      <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Users size={10} /> {batch.studentsId.length} students
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>
                      {new Date(batch.batchStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>
                      {new Date(batch.batchStartDate).getFullYear()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Workshops */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <SectionHeader title="Upcoming Workshops" icon={<Radio size={18} />} badge={upcomingWorkshops.length} />
          {upcomingWorkshops.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '24px 0' }}>No upcoming workshops</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcomingWorkshops.map((ws, i) => (
                <div key={ws._id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 10,
                  border: '1px solid #e5e7eb', background: '#fafafa',
                }}>
                  {/* Date block */}
                  <div style={{
                    width: 44, flexShrink: 0, textAlign: 'center',
                    background: i === 0 ? '#ec4899' : '#f9fafb',
                    border: `1px solid ${i === 0 ? '#ec4899' : '#e5e7eb'}`,
                    borderRadius: 10, padding: '6px 4px',
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? '#fff' : '#111827', lineHeight: 1 }}>
                      {new Date(ws.date).getDate()}
                    </div>
                    <div style={{ fontSize: 10, color: i === 0 ? 'rgba(255,255,255,0.8)' : '#9ca3af', fontWeight: 600 }}>
                      {new Date(ws.date).toLocaleString('en-US', { month: 'short' })}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ws.workshopHeading}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                      <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} /> {ws.time}
                      </span>
                      <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Zap size={10} /> {ws.platform}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Students ─────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <SectionHeader title="Recent Students" icon={<Users size={18} />} badge={recentStudents.length} />
        {recentStudents.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '24px 0' }}>No students yet</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {recentStudents.map((student) => (
              <div key={student._id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 10,
                border: '1px solid #e5e7eb', background: '#fafafa',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                }}>
                  {initials(student.studentName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {student.studentName}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {student.email}
                  </div>
                  {student.currentJobStatus && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99, marginTop: 3, display: 'inline-block',
                      background: '#e0f2fe', color: '#0369a1',
                    }}>
                      {student.currentJobStatus}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>
                  {fmtDate(student.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;