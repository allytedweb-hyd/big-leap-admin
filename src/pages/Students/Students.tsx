import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, Filter, GraduationCap, Eye, EyeOff, KeyRound,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_STATUSES = ['Fresher', 'Employed', 'Self-Employed', 'Unemployed'];
const EXPERIENCE_LEVELS = ['0-1 years', '1-3 years', '3-5 years', '5+ years'];
const BATCH_TYPES = ['Morning', 'Afternoon', 'Evening', 'Weekend', 'Weekdays'];
const EDUCATION_OPTIONS = [
  'High School', 'Diploma', 'Bachelor\'s Degree', 'Master\'s Degree', 'PhD', 'Other',
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  _id: string;
  studentName: string;
  email: string;
  mobileNumber: string;
  dob: string;
  currentLocation: string;
  highestEducation: string;
  currentJobStatus: string;
  intrestedCourse: string;
  domain: string;
  experienceLevel: string;
  prefferedBatch: string;
  prefferedBatchTimings: string;
  createdAt: string;
}

const emptyForm = () => ({
  studentName: '',
  email: '',
  mobileNumber: '',
  dob: '',
  currentLocation: '',
  highestEducation: '',
  currentJobStatus: '',
  intrestedCourse: '',
  domain: '',
  experienceLevel: '',
  prefferedBatch: '',
  prefferedBatchTimings: '',
  password: '',
});

// ─── Component ────────────────────────────────────────────────────────────────

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJobStatus, setFilterJobStatus] = useState('');
  const [filterBatch, setFilterBatch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Password reset modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStudentId, setResetStudentId] = useState<string | null>(null);
  const [resetStudentName, setResetStudentName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState(emptyForm());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { fetchStudents(); }, []);
  useEffect(() => { filterStudents(); }, [students, searchQuery, filterJobStatus, filterBatch]);

  // ─── API ──────────────────────────────────────────────────────────────────

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/students');
      setStudents(res.data?.students || []);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  // ─── Filter ───────────────────────────────────────────────────────────────

  const filterStudents = () => {
    let filtered = [...students];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.studentName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.mobileNumber.includes(q)
      );
    }
    if (filterJobStatus) filtered = filtered.filter(s => s.currentJobStatus === filterJobStatus);
    if (filterBatch) filtered = filtered.filter(s => s.prefferedBatch === filterBatch);
    setFilteredStudents(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterJobStatus('');
    setFilterBatch('');
  };

  const hasFilters = searchQuery || filterJobStatus || filterBatch;

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(isEditing ? 'Updating student...' : 'Creating student...');

    // Build payload — exclude empty password on edit
    const payload: Record<string, string> = { ...formData };
    if (isEditing && !payload.password) delete payload.password;

    try {
      if (isEditing && selectedId) {
        await httpClient.put(`/students/${selectedId}`, payload);
        toast.success('Student updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/students', payload);
        toast.success('Student created successfully!', { id: loadingToast });
      }
      setShowModal(false);
      resetForm();
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', { id: loadingToast });
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    const loadingToast = toast.loading('Deleting student...');
    try {
      await httpClient.delete(`/students/${id}`);
      toast.success('Student deleted successfully!', { id: loadingToast });
      fetchStudents();
    } catch {
      toast.error('Failed to delete student', { id: loadingToast });
    }
  };

  // ─── Edit ─────────────────────────────────────────────────────────────────

  const openEditModal = (student: Student) => {
    setIsEditing(true);
    setSelectedId(student._id);
    setFormData({
      studentName: student.studentName,
      email: student.email,
      mobileNumber: student.mobileNumber,
      dob: student.dob ? student.dob.split('T')[0] : '',
      currentLocation: student.currentLocation,
      highestEducation: student.highestEducation,
      currentJobStatus: student.currentJobStatus,
      intrestedCourse: student.intrestedCourse,
      domain: student.domain,
      experienceLevel: student.experienceLevel,
      prefferedBatch: student.prefferedBatch,
      prefferedBatchTimings: student.prefferedBatchTimings,
      password: '',
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setIsEditing(false);
    setSelectedId(null);
    setShowPassword(false);
  };

  // ─── Password Reset ───────────────────────────────────────────────────────

  const openResetModal = (student: Student) => {
    setResetStudentId(student._id);
    setResetStudentName(student.studentName);
    setNewPassword('');
    setShowNewPassword(false);
    setShowResetModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    const loadingToast = toast.loading('Resetting password...');
    try {
      await httpClient.patch(`/students/${resetStudentId}/reset-password`, { newPassword });
      toast.success('Password reset successfully!', { id: loadingToast });
      setShowResetModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset password', { id: loadingToast });
    }
  };

  // ─── Pagination ───────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedData = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateStr: string) =>
    dateStr ? new Date(dateStr).toLocaleDateString('en-IN') : 'N/A';

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.employees}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Students</h1>
          <p>Manage student registrations and profile details</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by name, email or mobile..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.filterSelect}>
              <Filter size={18} className={styles.filterIcon} />
              <select
                value={filterJobStatus}
                onChange={e => setFilterJobStatus(e.target.value)}
                className={styles.orgSelect}
              >
                <option value="">All Job Statuses</option>
                {JOB_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className={styles.filterSelect}>
              <Filter size={18} className={styles.filterIcon} />
              <select
                value={filterBatch}
                onChange={e => setFilterBatch(e.target.value)}
                className={styles.orgSelect}
              >
                <option value="">All Batches</option>
                {BATCH_TYPES.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button
                className={styles.clearFiltersBtn}
                onClick={clearFilters}
                title="Clear filters"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            className={styles.addBtn}
            onClick={() => { resetForm(); setShowModal(true); }}
          >
            <Plus size={18} /> Add Student
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Students:</span>
          <span className={styles.statValue}>{students.length}</span>
        </div>
        {hasFilters && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredStudents.length}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Mobile</th>
              <th>Location</th>
              <th>Course / Domain</th>
              <th>Batch</th>
              <th>Job Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    <span className="ml-2">Loading students...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="text-gray-500">
                    {hasFilters ? 'No students match the current filters' : 'No students found'}
                  </div>
                </td>
              </tr>
            ) : paginatedData.map(student => (
              <tr key={student._id}>
                <td>
                  <div className={styles.employeeCell}>
                    {/* Avatar with initials */}
                    <div
                      className={styles.avatar}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 14,
                        borderRadius: '50%',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(student.studentName)}
                    </div>
                    <div className={styles.employeeInfo}>
                      <span className={styles.employeeName}>{student.studentName}</span>
                      <span className={styles.employeeEmail}>{student.email}</span>
                    </div>
                  </div>
                </td>
                <td>{student.mobileNumber}</td>
                <td>
                  <div className={styles.deptText}>{student.currentLocation}</div>
                  <div className={styles.roleText}>{formatDate(student.dob)}</div>
                </td>
                <td>
                  <div className={styles.deptText}>{student.intrestedCourse}</div>
                  <div className={styles.roleText}>{student.domain}</div>
                </td>
                <td>
                  <div className={styles.deptText}>{student.prefferedBatch}</div>
                  <div className={styles.roleText}>{student.prefferedBatchTimings}</div>
                </td>
                <td>
                  <span className={styles.orgBadge}>{student.currentJobStatus}</span>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <KeyRound
                      size={17}
                      onClick={() => openResetModal(student)}
                      className={styles.editIcon}
                      title="Reset Password"
                      style={{ color: '#f59e0b' }}
                    />
                    <Edit
                      size={18}
                      onClick={() => openEditModal(student)}
                      className={styles.editIcon}
                      title="Edit Student"
                    />
                    <Trash2
                      size={18}
                      onClick={() => handleDelete(student._id)}
                      className={styles.deleteIcon}
                      title="Delete Student"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredStudents.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of{' '}
              {filteredStudents.length} students
            </div>
            <div className={styles.paginationControls}>
              <button
                className={styles.pageBtn}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button className={`${styles.pageBtn} ${styles.active}`}>
                {currentPage}
              </button>
              <button
                className={styles.pageBtn}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ADD / EDIT MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 860, width: '95vw' }}>

            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <GraduationCap size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} Student
              </h2>
              <X size={20} onClick={() => setShowModal(false)} style={{ cursor: 'pointer' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ maxHeight: '74vh', overflowY: 'auto' }}>
                <div className={styles.formGrid}>

                  {/* ── Personal Info ── */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Full Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      placeholder="e.g. Ravi Kumar"
                      value={formData.studentName}
                      onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Email <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="email"
                      className={styles.formInput}
                      required
                      placeholder="e.g. ravi@email.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Mobile Number <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      className={styles.formInput}
                      required
                      placeholder="10-digit mobile"
                      maxLength={10}
                      value={formData.mobileNumber}
                      onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Date of Birth <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className={styles.formInput}
                      required
                      value={formData.dob}
                      onChange={e => setFormData({ ...formData, dob: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Current Location <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      placeholder="e.g. Hyderabad"
                      value={formData.currentLocation}
                      onChange={e => setFormData({ ...formData, currentLocation: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Highest Education <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      className={styles.formSelect}
                      required
                      value={formData.highestEducation}
                      onChange={e => setFormData({ ...formData, highestEducation: e.target.value })}
                    >
                      <option value="">Select Education</option>
                      {EDUCATION_OPTIONS.map(ed => (
                        <option key={ed} value={ed}>{ed}</option>
                      ))}
                    </select>
                  </div>

                  {/* ── Professional Info ── */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Current Job Status <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      className={styles.formSelect}
                      required
                      value={formData.currentJobStatus}
                      onChange={e => setFormData({ ...formData, currentJobStatus: e.target.value })}
                    >
                      <option value="">Select Status</option>
                      {JOB_STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Experience Level <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      className={styles.formSelect}
                      required
                      value={formData.experienceLevel}
                      onChange={e => setFormData({ ...formData, experienceLevel: e.target.value })}
                    >
                      <option value="">Select Experience</option>
                      {EXPERIENCE_LEVELS.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  {/* ── Course Info ── */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Interested Course <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      placeholder="e.g. Full Stack Development"
                      value={formData.intrestedCourse}
                      onChange={e => setFormData({ ...formData, intrestedCourse: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Domain <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      placeholder="e.g. Web Development"
                      value={formData.domain}
                      onChange={e => setFormData({ ...formData, domain: e.target.value })}
                    />
                  </div>

                  {/* ── Batch Info ── */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Preferred Batch <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      className={styles.formSelect}
                      required
                      value={formData.prefferedBatch}
                      onChange={e => setFormData({ ...formData, prefferedBatch: e.target.value })}
                    >
                      <option value="">Select Batch</option>
                      {BATCH_TYPES.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Preferred Batch Timings <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      placeholder="e.g. 9:00 AM - 11:00 AM"
                      value={formData.prefferedBatchTimings}
                      onChange={e => setFormData({ ...formData, prefferedBatchTimings: e.target.value })}
                    />
                  </div>

                  {/* ── Password ── */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Password
                      {!isEditing && <span style={{ color: 'red' }}> *</span>}
                      {isEditing && (
                        <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>
                          (leave blank to keep current)
                        </span>
                      )}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={styles.formInput}
                        required={!isEditing}
                        placeholder="Min. 8 characters"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        style={{ paddingRight: 42 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        style={{
                          position: 'absolute', right: 12, top: '50%',
                          transform: 'translateY(-50%)', background: 'none',
                          border: 'none', cursor: 'pointer', color: '#888',
                        }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {isEditing ? 'Update' : 'Save'} Student
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PASSWORD RESET MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showResetModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 440, width: '95vw' }}>

            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <KeyRound size={18} style={{ marginRight: 8 }} />
                Reset Password
              </h2>
              <X
                size={20}
                onClick={() => setShowResetModal(false)}
                style={{ cursor: 'pointer' }}
              />
            </div>

            <form onSubmit={handleResetPassword}>
              <div className={styles.modalBody}>
                <p style={{ marginBottom: 16, color: '#555', fontSize: 14 }}>
                  Setting new password for{' '}
                  <strong>{resetStudentName}</strong>
                </p>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    New Password <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className={styles.formInput}
                      required
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      style={{ paddingRight: 42 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(p => !p)}
                      style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer', color: '#888',
                      }}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowResetModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Reset Password
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default Students;
