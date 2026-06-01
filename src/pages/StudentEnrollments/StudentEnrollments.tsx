import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, BookOpen, IndianRupee, BadgeCheck, Clock, XCircle,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Course {
  _id: string;
  title: string;
  coursePrice: number;
}

interface Student {
  _id: string;
  studentName: string;
  email: string;
}

type PaymentStatus = 'pending' | 'paid' | 'failed';

interface Enrollment {
  _id: string;
  courseId: Course | string;
  studentId: Student | string;
  totalFee: number;
  paidamount: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Empty form factory ───────────────────────────────────────────────────────

const emptyForm = () => ({
  courseId: '',
  studentId: '',
  totalFee: '',
  paidAmount: '',
  paymentStatus: 'pending' as PaymentStatus,
});

// ─── Status badge config ──────────────────────────────────────────────────────

const statusConfig: Record<PaymentStatus, { bg: string; color: string; icon: React.ReactNode }> = {
  paid: { bg: '#dcfce7', color: '#15803d', icon: <BadgeCheck size={13} /> },
  pending: { bg: '#fef9c3', color: '#a16207', icon: <Clock size={13} /> },
  failed: { bg: '#fee2e2', color: '#b91c1c', icon: <XCircle size={13} /> },
};

// ─── Component ────────────────────────────────────────────────────────────────

const Enrollments: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCourse, setFilterCourse] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm());

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // ─── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchEnrollments();
    fetchCourses();
    fetchStudents();
  }, []);

  useEffect(() => {
    filterEnrollments();
  }, [enrollments, searchQuery, filterStatus, filterCourse]);

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/enrollments');
      setEnrollments(res.data?.enrollments || []);
    } catch {
      toast.error('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await httpClient.get('/courses');
      setCourses(res.data?.courses || []);
    } catch {
      console.error('Failed to load courses');
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await httpClient.get('/students');
      setStudents(res.data?.students || []);
    } catch {
      console.error('Failed to load students');
    }
  };

  // ─── Filtering ────────────────────────────────────────────────────────────

  const filterEnrollments = () => {
    let filtered = [...enrollments];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => {
        const studentName =
          typeof e.studentId === 'object' ? (e.studentId as Student).name.toLowerCase() : '';
        const studentEmail =
          typeof e.studentId === 'object' ? (e.studentId as Student).email.toLowerCase() : '';
        const courseTitle =
          typeof e.courseId === 'object' ? (e.courseId as Course).title.toLowerCase() : '';
        return studentName.includes(q) || studentEmail.includes(q) || courseTitle.includes(q);
      });
    }

    if (filterStatus) {
      filtered = filtered.filter(e => e.paymentStatus === filterStatus);
    }

    if (filterCourse) {
      filtered = filtered.filter(e => {
        const id = typeof e.courseId === 'object' ? (e.courseId as Course)._id : e.courseId;
        return id === filterCourse;
      });
    }

    setFilteredEnrollments(filtered);
    setCurrentPage(1);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getCourseName = (e: Enrollment) =>
    typeof e.courseId === 'object' && e.courseId !== null
      ? (e.courseId as Course).title ?? '—'
      : '—';

  const getStudentName = (e: Enrollment) =>
    typeof e.studentId === 'object' && e.studentId !== null
      ? (e.studentId as Student).studentName ?? '—'
      : '—';

  const getStudentEmail = (e: Enrollment) =>
    typeof e.studentId === 'object' && e.studentId !== null
      ? (e.studentId as Student).email ?? ''
      : '';

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getDueAmount = (e: Enrollment) => Math.max(0, e.totalFee - e.paidamount);

  // ─── Form submit ──────────────────────────────────────────────────────────

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();

    if (!isEditing && !formData.courseId) {
      toast.error('Please select a course'); return;
    }
    if (!isEditing && !formData.studentId) {
      toast.error('Please select a student'); return;
    }
    if (!formData.totalFee || Number(formData.totalFee) < 0) {
      toast.error('Please enter a valid total fee'); return;
    }
    if (!formData.paidAmount || Number(formData.paidAmount) < 0) {
      toast.error('Please enter a valid paid amount'); return;
    }
    if (Number(formData.paidAmount) > Number(formData.totalFee)) {
      toast.error('Paid amount cannot exceed total fee'); return;
    }

    const loadingToast = toast.loading(isEditing ? 'Updating enrollment...' : 'Creating enrollment...');

    try {
      const payload = {
        totalFee: Number(formData.totalFee),
        paidAmount: Number(formData.paidAmount),
        paymentStatus: formData.paymentStatus,
        ...(!isEditing && { courseId: formData.courseId, studentId: formData.studentId }),
      };

      if (isEditing && selectedId) {
        await httpClient.put(`/enrollments/${selectedId}`, payload);
        toast.success('Enrollment updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/enrollments', payload);
        toast.success('Enrollment created successfully!', { id: loadingToast });
      }

      setShowModal(false);
      resetForm();
      fetchEnrollments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', { id: loadingToast });
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Are you sure you want to delete enrollment for "${label}"?`)) return;
    const loadingToast = toast.loading('Deleting enrollment...');
    try {
      await httpClient.delete(`/enrollments/${id}`);
      toast.success('Enrollment deleted successfully!', { id: loadingToast });
      fetchEnrollments();
    } catch {
      toast.error('Failed to delete enrollment', { id: loadingToast });
    }
  };

  // ─── Open edit modal ──────────────────────────────────────────────────────

  const openEditModal = (enrollment: Enrollment) => {
    setIsEditing(true);
    setSelectedId(enrollment._id);
    setFormData({
      courseId: typeof enrollment.courseId === 'object' ? (enrollment.courseId as Course)._id : enrollment.courseId as string,
      studentId: typeof enrollment.studentId === 'object' ? (enrollment.studentId as Student)._id : enrollment.studentId as string,
      totalFee: String(enrollment.totalFee),
      paidAmount: String(enrollment.paidamount),
      paymentStatus: enrollment.paymentStatus,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setIsEditing(false);
    setSelectedId(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterCourse('');
  };

  // ─── Pagination ───────────────────────────────────────────────────────────

  const hasFilters = searchQuery || filterStatus || filterCourse;
  const totalPages = Math.max(1, Math.ceil(filteredEnrollments.length / itemsPerPage));
  const paginatedData = filteredEnrollments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.employees}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Enrollments</h1>
          <p>Manage course enrollments and payment tracking</p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>

            {/* Search */}
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by student or course..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter by course */}
            <div className={styles.filterSelect}>
              <select
                value={filterCourse}
                onChange={e => setFilterCourse(e.target.value)}
                className={styles.orgSelect}
              >
                <option value="">All Courses</option>
                {courses.map(c => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
            </div>

            {/* Filter by status */}
            <div className={styles.filterSelect}>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className={styles.orgSelect}
              >
                <option value="">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {hasFilters && (
              <button className={styles.clearFiltersBtn} onClick={clearFilters} title="Clear filters">
                <X size={16} />
              </button>
            )}
          </div>

          <button className={styles.addBtn} onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={18} /> Add Enrollment
          </button>
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Enrollments:</span>
          <span className={styles.statValue}>{enrollments.length}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Paid:</span>
          <span className={styles.statValue} style={{ color: '#15803d' }}>
            {enrollments.filter(e => e.paymentStatus === 'paid').length}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Pending:</span>
          <span className={styles.statValue} style={{ color: '#a16207' }}>
            {enrollments.filter(e => e.paymentStatus === 'pending').length}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Failed:</span>
          <span className={styles.statValue} style={{ color: '#b91c1c' }}>
            {enrollments.filter(e => e.paymentStatus === 'failed').length}
          </span>
        </div>
        {hasFilters && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredEnrollments.length}</span>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Student</th>
              <th>Course</th>
              <th>Total Fee</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Status</th>
              <th>Enrolled On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    <span className="ml-2">Loading enrollments...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {hasFilters
                    ? 'No enrollments match your filters'
                    : 'No enrollments found. Click "Add Enrollment" to create one.'}
                </td>
              </tr>
            ) : (
              paginatedData.map((enrollment, index) => {
                const status = statusConfig[enrollment.paymentStatus];
                const due = getDueAmount(enrollment);
                return (
                  <tr key={enrollment._id}>

                    {/* # */}
                    <td>
                      <span className={styles.orgBadge} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </span>
                    </td>

                    {/* Student */}
                    <td>
                      <div className={styles.employeeCell}>
                        <div
                          className={styles.avatar}
                          style={{
                            background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', borderRadius: '50%', flexShrink: 0,
                          }}
                        >
                          {(getStudentName(enrollment) || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.employeeInfo}>
                          <span className={styles.employeeName}>{getStudentName(enrollment)}</span>
                          <span className={styles.employeeEmail}>{getStudentEmail(enrollment)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Course */}
                    <td>
                      <div className={styles.employeeCell}>
                        <BookOpen size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                        <span className={styles.deptText} style={{ marginLeft: 6 }}>
                          {getCourseName(enrollment)}
                        </span>
                      </div>
                    </td>

                    {/* Total Fee */}
                    <td>
                      <div className={styles.employeeCell}>
                        <IndianRupee size={13} style={{ color: '#6b7280' }} />
                        <span className={styles.deptText}>{formatCurrency(enrollment.totalFee)}</span>
                      </div>
                    </td>

                    {/* Paid */}
                    <td>
                      <span className={styles.deptText} style={{ color: '#15803d', fontWeight: 600 }}>
                        {formatCurrency(enrollment.paidamount)}
                      </span>
                    </td>

                    {/* Due */}
                    <td>
                      <span
                        className={styles.deptText}
                        style={{ color: due > 0 ? '#b91c1c' : '#15803d', fontWeight: 600 }}
                      >
                        {due > 0 ? formatCurrency(due) : '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className={styles.orgBadge}
                        style={{
                          background: status.bg,
                          color: status.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          textTransform: 'capitalize',
                        }}
                      >
                        {status.icon}
                        {enrollment.paymentStatus}
                      </span>
                    </td>

                    {/* Date */}
                    <td>
                      <div className={styles.deptText}>
                        {new Date(enrollment.createdAt).toLocaleDateString('en-IN')}
                      </div>
                      <div className={styles.roleText}>
                        {new Date(enrollment.createdAt).toLocaleTimeString()}
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className={styles.actionButtons}>
                        <Edit
                          size={18}
                          onClick={() => openEditModal(enrollment)}
                          className={styles.editIcon}
                          title="Edit Enrollment"
                        />
                        <Trash2
                          size={18}
                          onClick={() => handleDelete(enrollment._id, getStudentName(enrollment))}
                          className={styles.deleteIcon}
                          title="Delete Enrollment"
                        />
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredEnrollments.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredEnrollments.length)} of{' '}
              {filteredEnrollments.length} enrollments
            </div>
            <div className={styles.paginationControls}>
              <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft size={16} />
              </button>
              <button className={`${styles.pageBtn} ${styles.active}`}>{currentPage}</button>
              <button className={styles.pageBtn} disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 560, width: '95vw' }}>

            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <BookOpen size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} Enrollment
              </h2>
              <X size={20} onClick={() => { setShowModal(false); resetForm(); }} style={{ cursor: 'pointer' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className={styles.formGrid}>

                  {/* Course — disabled on edit */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Course <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      className={styles.formSelect}
                      required={!isEditing}
                      disabled={isEditing}
                      value={formData.courseId}
                      onChange={e => {
                        const course = courses.find(c => c._id === e.target.value);
                        setFormData({
                          ...formData,
                          courseId: e.target.value,
                          totalFee: course ? String(course.coursePrice) : formData.totalFee,
                        });
                      }}
                    >
                      <option value="">Select a course</option>
                      {courses.map(c => (
                        <option key={c._id} value={c._id}>{c.title}</option>
                      ))}
                    </select>
                    {isEditing && (
                      <small style={{ color: '#6b7280', marginTop: 4, display: 'block' }}>
                        Course cannot be changed after enrollment is created.
                      </small>
                    )}
                  </div>

                  {/* Student — disabled on edit */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Student <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      className={styles.formSelect}
                      required={!isEditing}
                      disabled={isEditing}
                      value={formData.studentId}
                      onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                    >
                      <option value="">Select a student</option>
                      {students.map(s => (
                        <option key={s._id} value={s._id}>{s.name} — {s.email}</option>
                      ))}
                    </select>
                  </div>

                  {/* Total Fee */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Total Fee (₹) <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={styles.formInput}
                      required
                      placeholder="e.g., 15000"
                      value={formData.totalFee}
                      onChange={e => setFormData({ ...formData, totalFee: e.target.value })}
                    />
                  </div>

                  {/* Paid Amount */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Paid Amount (₹) <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={formData.totalFee || undefined}
                      className={styles.formInput}
                      required
                      placeholder="e.g., 5000"
                      value={formData.paidAmount}
                      onChange={e => setFormData({ ...formData, paidAmount: e.target.value })}
                    />
                  </div>

                  {/* Payment Status */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>Payment Status</label>
                    <select
                      className={styles.formSelect}
                      value={formData.paymentStatus}
                      onChange={e => setFormData({ ...formData, paymentStatus: e.target.value as PaymentStatus })}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  {/* Live due preview */}
                  {formData.totalFee && formData.paidAmount && (
                    <div
                      style={{
                        gridColumn: '1 / -1',
                        background: '#f8fafc',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: '10px 14px',
                        display: 'flex',
                        gap: 24,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Total</div>
                        <div style={{ fontWeight: 700, color: '#111827' }}>
                          {formatCurrency(Number(formData.totalFee))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Paid</div>
                        <div style={{ fontWeight: 700, color: '#15803d' }}>
                          {formatCurrency(Number(formData.paidAmount))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Due</div>
                        <div style={{ fontWeight: 700, color: Number(formData.totalFee) - Number(formData.paidAmount) > 0 ? '#b91c1c' : '#15803d' }}>
                          {formatCurrency(Math.max(0, Number(formData.totalFee) - Number(formData.paidAmount)))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {isEditing ? 'Update' : 'Save'} Enrollment
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default Enrollments;