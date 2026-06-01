import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, BookOpen, Users, Clock, Calendar, Settings2,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useNavigate } from 'react-router-dom';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Course {
  _id: string;
  title: string;
  coursePrice?: number;
}

interface Student {
  _id: string;
  studentName: string;
  email: string;
}

interface Trainer {
  _id: string;
  trainerName: string;
  email: string;
}

interface Batch {
  _id: string;
  courseId: { _id: string; title: string } | null;
  studentsId: Student[];
  trainersId: Trainer;
  batchStartDate: string;
  batchTimings: string;
  createdAt: string;
}

interface SelectOption {
  value: string;
  label: string;
}

// ─── Empty form factory ───────────────────────────────────────────────────────

const emptyForm = () => ({
  courseId: null as SelectOption | null,
  studentsId: [] as SelectOption[],
  trainersId: null as SelectOption | null,
  batchStartDate: null as Date | null,
  fromTime: '',
  toTime: '',
});

// ─── react-select custom styles ───────────────────────────────────────────────

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '8px',
    borderColor: state.isFocused ? '#6366f1' : '#e5e7eb',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
    '&:hover': { borderColor: '#6366f1' },
    fontSize: '14px',
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: '14px',
    backgroundColor: state.isSelected
      ? '#6366f1'
      : state.isFocused
      ? '#eef2ff'
      : '#fff',
    color: state.isSelected ? '#fff' : '#111827',
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: '#e0e7ff',
    borderRadius: '6px',
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: '#4338ca',
    fontSize: '13px',
    fontWeight: 500,
  }),
  multiValueRemove: (base: any) => ({
    ...base,
    color: '#4338ca',
    '&:hover': { backgroundColor: '#c7d2fe', color: '#3730a3' },
  }),
  placeholder: (base: any) => ({ ...base, color: '#9ca3af', fontSize: '14px' }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
};

// ─── Component ────────────────────────────────────────────────────────────────

const Batches: React.FC = () => {
  const navigate = useNavigate();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [courseOptions, setCourseOptions] = useState<SelectOption[]>([]);
  const [studentOptions, setStudentOptions] = useState<SelectOption[]>([]);
  const [trainerOptions, setTrainerOptions] = useState<SelectOption[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm());

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchBatches();
    fetchDropdownData();
  }, []);

  useEffect(() => {
    filterBatches();
  }, [batches, searchQuery]);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/batches');
      setBatches(res.data?.batches || []);
    } catch {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [coursesRes, enrollmentsRes, trainersRes] = await Promise.all([
        httpClient.get('/courses'),
        httpClient.get('/enrollments'),
        httpClient.get('/trainers'),
      ]);

      const courses: Course[] = coursesRes.data?.courses ?? coursesRes.data?.data ?? [];
      setCourseOptions(courses.map(c => ({ value: c._id, label: c.title })));

      const enrollments: { studentId: Student }[] =
        enrollmentsRes.data?.enrollments || [];
      const seen = new Set<string>();
      const uniqueStudents: SelectOption[] = [];
      enrollments.forEach(e => {
        if (e.studentId && !seen.has(e.studentId._id)) {
          seen.add(e.studentId._id);
          uniqueStudents.push({
            value: e.studentId._id,
            label: `${e.studentId.studentName} (${e.studentId.email})`,
          });
        }
      });
      setStudentOptions(uniqueStudents);

      const trainers: Trainer[] = trainersRes.data?.trainers || [];
      setTrainerOptions(trainers.map(t => ({ value: t._id, label: t.trainerName })));
    } catch {
      toast.error('Failed to load dropdown data');
    }
  };

  // ─── Filtering ──────────────────────────────────────────────────────────────

  const filterBatches = () => {
    let filtered = [...batches];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        b =>
          b.courseId?.title?.toLowerCase().includes(q) ||
          b.trainersId?.trainerName?.toLowerCase().includes(q) ||
          b.batchTimings?.toLowerCase().includes(q),
      );
    }
    setFilteredBatches(filtered);
    setCurrentPage(1);
  };

  // ─── Form submit ────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.courseId) return toast.error('Please select a course');
    if (!formData.trainersId) return toast.error('Please select a trainer');
    if (formData.studentsId.length === 0)
      return toast.error('Please select at least one student');
    if (!formData.batchStartDate)
      return toast.error('Please select a start date');
    if (!formData.fromTime || !formData.toTime)
      return toast.error('Please set batch timings');

    const batchTimings = `${formData.fromTime} - ${formData.toTime}`;

    const payload = {
      courseId: formData.courseId.value,
      trainersId: formData.trainersId.value,
      studentsId: formData.studentsId.map(s => s.value),
      batchStartDate: formData.batchStartDate.toISOString(),
      batchTimings,
    };

    const loadingToast = toast.loading(
      isEditing ? 'Updating batch...' : 'Creating batch...',
    );

    try {
      if (isEditing && selectedId) {
        await httpClient.put(`/batches/${selectedId}`, payload);
        toast.success('Batch updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/batches', payload);
        toast.success('Batch created successfully!', { id: loadingToast });
      }
      setShowModal(false);
      resetForm();
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', {
        id: loadingToast,
      });
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Are you sure you want to delete this batch "${label}"?`))
      return;
    const loadingToast = toast.loading('Deleting batch...');
    try {
      await httpClient.delete(`/batches/${id}`);
      toast.success('Batch deleted successfully!', { id: loadingToast });
      fetchBatches();
    } catch {
      toast.error('Failed to delete batch', { id: loadingToast });
    }
  };

  // ─── Open edit modal ────────────────────────────────────────────────────────

  const openEditModal = (batch: Batch) => {
    setIsEditing(true);
    setSelectedId(batch._id);
    const [from = '', to = ''] = batch.batchTimings?.split(' - ') ?? [];
    setFormData({
      courseId: batch.courseId
        ? { value: batch.courseId._id, label: batch.courseId.title }
        : null,
      trainersId: batch.trainersId
        ? { value: batch.trainersId._id, label: batch.trainersId.trainerName }
        : null,
      studentsId: (batch.studentsId || []).map(s => ({
        value: s._id,
        label: `${s.studentName} (${s.email})`,
      })),
      batchStartDate: batch.batchStartDate ? new Date(batch.batchStartDate) : null,
      fromTime: from.trim(),
      toTime: to.trim(),
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setIsEditing(false);
    setSelectedId(null);
  };

  // ─── Pagination ─────────────────────────────────────────────────────────────

  const hasFilters = !!searchQuery;
  const totalPages = Math.max(1, Math.ceil(filteredBatches.length / itemsPerPage));
  const paginatedData = filteredBatches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.employees}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Batches</h1>
          <p>Manage batches, assign trainers and students per course</p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by course, trainer or timings..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {hasFilters && (
              <button
                className={styles.clearFiltersBtn}
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            className={styles.addBtn}
            onClick={() => { resetForm(); setShowModal(true); }}
          >
            <Plus size={18} /> Add Batch
          </button>
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Batches:</span>
          <span className={styles.statValue}>{batches.length}</span>
        </div>
        {hasFilters && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredBatches.length}</span>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Course</th>
              <th>Trainer</th>
              <th>Students</th>
              <th>Start Date</th>
              <th>Timings</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    <span className="ml-2">Loading batches...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {hasFilters
                    ? 'No batches match your search'
                    : 'No batches found. Click "Add Batch" to create one.'}
                </td>
              </tr>
            ) : (
              paginatedData.map((batch, index) => (
                <tr key={batch._id}>

                  {/* # */}
                  <td>
                    <span className={styles.orgBadge} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </span>
                  </td>

                  {/* Course */}
                  <td>
                    <div className={styles.employeeCell}>
                      <div
                        className={styles.avatar}
                        style={{
                          background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#fff',
                          borderRadius: '50%', flexShrink: 0,
                        }}
                      >
                        <BookOpen size={16} />
                      </div>
                      <div className={styles.employeeInfo}>
                        <span className={styles.employeeName}>
                          {batch.courseId?.title || '—'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Trainer */}
                  <td>
                    <span className={styles.deptText}>
                      {batch.trainersId?.trainerName || '—'}
                    </span>
                  </td>

                  {/* Students count */}
                  <td>
                    <div className={styles.employeeCell}>
                      <Users size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                      <span className={styles.deptText} style={{ marginLeft: 6 }}>
                        {batch.studentsId?.length ?? 0} student
                        {(batch.studentsId?.length ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </td>

                  {/* Start Date */}
                  <td>
                    <div className={styles.employeeCell}>
                      <Calendar size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                      <span className={styles.deptText} style={{ marginLeft: 6 }}>
                        {batch.batchStartDate
                          ? new Date(batch.batchStartDate).toLocaleDateString('en-IN')
                          : '—'}
                      </span>
                    </div>
                  </td>

                  {/* Timings */}
                  <td>
                    <div className={styles.employeeCell}>
                      <Clock size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                      <span className={styles.deptText} style={{ marginLeft: 6 }}>
                        {batch.batchTimings || '—'}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className={styles.actionButtons}>

                      {/* Manage Curriculum */}
                      <button
                        onClick={() => navigate(`/manage-batches/${batch._id}`)}
                        title="Manage Curriculum"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 6, border: 'none',
                          background: '#fff7ed', color: '#f97316',
                          cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#ffedd5')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff7ed')}
                      >
                        <Settings2 size={14} />
                        Manage
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEditModal(batch)}
                        title="Edit Batch"
                        className={styles.editIcon}
                        style={{
                          background: 'none', border: 'none',
                          cursor: 'pointer', padding: 0,
                          display: 'inline-flex', alignItems: 'center',
                        }}
                      >
                        <Edit size={18} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() =>
                          handleDelete(batch._id, batch.courseId?.title || batch._id)
                        }
                        title="Delete Batch"
                        className={styles.deleteIcon}
                        style={{
                          background: 'none', border: 'none',
                          cursor: 'pointer', padding: 0,
                          display: 'inline-flex', alignItems: 'center',
                        }}
                      >
                        <Trash2 size={18} />
                      </button>

                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredBatches.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredBatches.length)} of{' '}
              {filteredBatches.length} batches
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

      {/* ── Add / Edit Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 600, width: '95vw' }}>

            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <BookOpen size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} Batch
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className={styles.formGrid}>

                  {/* Course */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Course <span style={{ color: 'red' }}>*</span>
                    </label>
                    <Select
                      options={courseOptions}
                      value={formData.courseId}
                      onChange={opt => setFormData(prev => ({ ...prev, courseId: opt }))}
                      placeholder="Select a course..."
                      isClearable
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                    />
                  </div>

                  {/* Trainer */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Trainer <span style={{ color: 'red' }}>*</span>
                    </label>
                    <Select
                      options={trainerOptions}
                      value={formData.trainersId}
                      onChange={opt => setFormData(prev => ({ ...prev, trainersId: opt }))}
                      placeholder="Select a trainer..."
                      isClearable
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                    />
                  </div>

                  {/* Students */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Students <span style={{ color: 'red' }}>*</span>
                      <span style={{ color: '#6b7280', fontWeight: 400, marginLeft: 6 }}>
                        (enrolled students only)
                      </span>
                    </label>
                    <Select
                      isMulti
                      options={studentOptions}
                      value={formData.studentsId}
                      onChange={opts =>
                        setFormData(prev => ({ ...prev, studentsId: opts as SelectOption[] }))
                      }
                      placeholder="Select one or more students..."
                      closeMenuOnSelect={false}
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                    />
                    {formData.studentsId.length > 0 && (
                      <small style={{ color: '#6b7280', marginTop: 4, display: 'block' }}>
                        {formData.studentsId.length} student
                        {formData.studentsId.length !== 1 ? 's' : ''} selected
                      </small>
                    )}
                  </div>

                  {/* Start Date */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Batch Start Date <span style={{ color: 'red' }}>*</span>
                    </label>
                    <DatePicker
                      selected={formData.batchStartDate}
                      onChange={(date: Date | null) =>
                        setFormData(prev => ({ ...prev, batchStartDate: date }))
                      }
                      dateFormat="dd/MM/yyyy"
                      minDate={new Date()}
                      placeholderText="Select start date"
                      className={styles.formInput}
                      wrapperClassName="w-full"
                      popperPlacement="bottom-start"
                    />
                  </div>

                  {/* Timings */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Batch Timings <span style={{ color: 'red' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <small style={{ color: '#6b7280', display: 'block', marginBottom: 4 }}>From</small>
                        <input
                          type="time"
                          className={styles.formInput}
                          value={formData.fromTime}
                          onChange={e => setFormData(prev => ({ ...prev, fromTime: e.target.value }))}
                          required
                        />
                      </div>
                      <span style={{ marginTop: 20, color: '#6b7280', fontWeight: 600 }}>→</span>
                      <div style={{ flex: 1 }}>
                        <small style={{ color: '#6b7280', display: 'block', marginBottom: 4 }}>To</small>
                        <input
                          type="time"
                          className={styles.formInput}
                          value={formData.toTime}
                          onChange={e => setFormData(prev => ({ ...prev, toTime: e.target.value }))}
                          required
                          min={formData.fromTime || undefined}
                        />
                      </div>
                    </div>
                    {formData.fromTime && formData.toTime && (
                      <small style={{ color: '#4338ca', marginTop: 6, display: 'block', fontWeight: 500 }}>
                        🕐 {formData.fromTime} – {formData.toTime}
                      </small>
                    )}
                  </div>

                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {isEditing ? 'Update' : 'Save'} Batch
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default Batches;