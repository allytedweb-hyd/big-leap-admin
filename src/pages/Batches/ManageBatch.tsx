import React, { useState, useEffect, useCallback } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, BookOpen, ChevronDown, ChevronUp,
  Video, Clock, Link, CalendarDays, ArrowLeft,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useParams, useNavigate } from 'react-router-dom';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface CourseLesson {
  _id: string;
  title: string;
}

interface CourseChapter {
  _id: string;
  title: string;
  lessons: CourseLesson[];
}

interface BatchOption {
  value: string;
  label: string;
  courseId: string;
}

interface FormLesson {
  lessonId: string;
  lessonTitle: string;
  videoUrl: string;
  duration: string;
  liveSessionLink: string;
  liveSessionDate: Date | null;
}

interface FormChapter {
  chapterId: string;
  chapterTitle: string;
  lessons: FormLesson[];
  expanded: boolean;
}

interface ManageBatchLesson {
  lessonId: string;
  lessonTitle: string;
  videoUrl: string;
  duration: number;
  liveSessionLink: string;
  liveSessionDate: string | null;
}

interface ManageBatchChapter {
  chapterId: string;
  chapterTitle: string;
  lessons: ManageBatchLesson[];
}

interface ManageBatch {
  _id: string;
  batchId: { _id: string; batchStartDate: string; batchTimings: string };
  courseId: { _id: string; title: string };
  curriculum: ManageBatchChapter[];
  createdAt: string;
}

interface SelectOption {
  value: string;
  label: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildFormCurriculum = (chapters: CourseChapter[]): FormChapter[] =>
  chapters.map(ch => ({
    chapterId: ch._id,
    chapterTitle: ch.title,
    expanded: true,
    lessons: ch.lessons.map(l => ({
      lessonId: l._id,
      lessonTitle: l.title,
      videoUrl: '',
      duration: '',
      liveSessionLink: '',
      liveSessionDate: null,
    })),
  }));

const rebuildFormFromSaved = (curriculum: ManageBatchChapter[]): FormChapter[] =>
  curriculum.map(ch => ({
    chapterId: ch.chapterId,
    chapterTitle: ch.chapterTitle,
    expanded: true,
    lessons: ch.lessons.map(l => ({
      lessonId: l.lessonId,
      lessonTitle: l.lessonTitle,
      videoUrl: l.videoUrl || '',
      duration: l.duration ? String(l.duration) : '',
      liveSessionLink: l.liveSessionLink || '',
      liveSessionDate: l.liveSessionDate ? new Date(l.liveSessionDate) : null,
    })),
  }));

// ─── react-select styles ──────────────────────────────────────────────────────

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
    backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#eef2ff' : '#fff',
    color: state.isSelected ? '#fff' : '#111827',
  }),
  placeholder: (base: any) => ({ ...base, color: '#9ca3af', fontSize: '14px' }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
};

// ─── Component ────────────────────────────────────────────────────────────────

const ManageBatches: React.FC = () => {
  // ── Route params ────────────────────────────────────────────────────────────
  // When navigated from Batches table: /manage-batches/:batchId
  // When accessed directly (list view): /manage-batches
  const { batchId: routeBatchId } = useParams<{ batchId?: string }>();
  const navigate = useNavigate();

  // Is this page in "direct batch" mode (came from Batches → Manage button)?
  const isDirectMode = !!routeBatchId;

  const [manageBatches, setManageBatches] = useState<ManageBatch[]>([]);
  const [filteredData, setFilteredData] = useState<ManageBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [batchOptions, setBatchOptions] = useState<BatchOption[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [selectedBatch, setSelectedBatch] = useState<BatchOption | null>(null);
  const [curriculum, setCurriculum] = useState<FormChapter[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  // Info about the batch when in direct mode
  const [directBatchInfo, setDirectBatchInfo] = useState<{
    label: string;
    courseId: string;
    existingManageId: string | null;
  } | null>(null);
  const [directPageLoading, setDirectPageLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isDirectMode) {
      // Direct mode: load batch info + check if curriculum already exists
      loadDirectBatch(routeBatchId!);
    } else {
      // List mode: fetch all manage-batches and batch dropdown options
      fetchManageBatches();
      fetchBatchOptions();
    }
  }, [routeBatchId]);

  useEffect(() => {
    let filtered = [...manageBatches];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        mb =>
          mb.courseId?.title?.toLowerCase().includes(q) ||
          mb.batchId?.batchTimings?.toLowerCase().includes(q),
      );
    }
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [manageBatches, searchQuery]);

  // ─── Direct mode: load a specific batch ──────────────────────────────────

  const loadDirectBatch = async (bId: string) => {
    setDirectPageLoading(true);
    try {
      // 1. Fetch the batch details
      const batchRes = await httpClient.get(`/batches/${bId}`);
      const batch = batchRes.data?.batch || batchRes.data;

      const batchLabel = `${batch.courseId?.title || 'Course'} — ${batch.batchTimings} (${new Date(batch.batchStartDate).toLocaleDateString('en-IN')})`;
      const courseId = batch.courseId?._id || batch.courseId;

      // 2. Check if a manage-batch already exists for this batch
      let existingManageId: string | null = null;
      let existingCurriculum: ManageBatchChapter[] | null = null;
      try {
        const mbRes = await httpClient.get(`/manage-batches/batch/${bId}`);
        const mb = mbRes.data?.manageBatch;
        if (mb) {
          existingManageId = mb._id;
          existingCurriculum = mb.curriculum;
        }
      } catch {
        // 404 means no curriculum yet — that's fine
      }

      setDirectBatchInfo({ label: batchLabel, courseId, existingManageId });

      const batchOption: BatchOption = { value: bId, label: batchLabel, courseId };
      setSelectedBatch(batchOption);

      if (existingCurriculum) {
        // Already has curriculum → open in edit mode
        setCurriculum(rebuildFormFromSaved(existingCurriculum));
        setIsEditing(true);
        setSelectedId(existingManageId);
      } else {
        // No curriculum yet → fetch course curriculum and open in create mode
        await loadCourseCurriculum(courseId);
        setIsEditing(false);
        setSelectedId(null);
      }

      setShowModal(true);
    } catch (err: any) {
      toast.error('Failed to load batch details');
    } finally {
      setDirectPageLoading(false);
    }
  };

  // ─── Fetch manage batches list ────────────────────────────────────────────

  const fetchManageBatches = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/manage-batches');
      setManageBatches(res.data?.manageBatches || []);
    } catch {
      toast.error('Failed to load managed batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchOptions = async () => {
    try {
      const res = await httpClient.get('/batches');
      const batches = res.data?.batches || [];
      setBatchOptions(
        batches.map((b: any) => ({
          value: b._id,
          label: `${b.courseId?.title || 'Course'} — ${b.batchTimings} (${new Date(b.batchStartDate).toLocaleDateString('en-IN')})`,
          courseId: b.courseId?._id || '',
        })),
      );
    } catch {
      toast.error('Failed to load batches');
    }
  };

  // ─── Load course curriculum by courseId ───────────────────────────────────

  const loadCourseCurriculum = async (courseId: string) => {
    setLoadingCurriculum(true);
    try {
      const res = await httpClient.get(`/courses/${courseId}`);
      const courseCurriculum: CourseChapter[] =
        res.data?.course?.curriculum || res.data?.curriculum || [];
      setCurriculum(buildFormCurriculum(courseCurriculum));
    } catch {
      toast.error('Failed to fetch course curriculum');
      setCurriculum([]);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  // ─── When batch is selected (list-mode modal only) ────────────────────────

  const handleBatchSelect = useCallback(async (opt: BatchOption | null) => {
    setSelectedBatch(opt);
    setCurriculum([]);
    if (!opt?.courseId) return;
    await loadCourseCurriculum(opt.courseId);
  }, []);

  // ─── Lesson field update ──────────────────────────────────────────────────

  const updateLesson = (
    chapterIdx: number,
    lessonIdx: number,
    field: keyof FormLesson,
    value: any,
  ) => {
    setCurriculum(prev =>
      prev.map((ch, ci) =>
        ci !== chapterIdx
          ? ch
          : {
              ...ch,
              lessons: ch.lessons.map((l, li) =>
                li !== lessonIdx ? l : { ...l, [field]: value },
              ),
            },
      ),
    );
  };

  const toggleChapter = (idx: number) => {
    setCurriculum(prev =>
      prev.map((ch, i) => (i === idx ? { ...ch, expanded: !ch.expanded } : ch)),
    );
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing && !selectedBatch)
      return toast.error('Please select a batch');
    if (curriculum.length === 0)
      return toast.error('Curriculum is empty');

    const payload = {
      ...(isEditing
        ? {}
        : {
            batchId: selectedBatch!.value,
            courseId: selectedBatch!.courseId,
          }),
      curriculum: curriculum.map(ch => ({
        chapterId: ch.chapterId,
        chapterTitle: ch.chapterTitle,
        lessons: ch.lessons.map(l => ({
          lessonId: l.lessonId,
          lessonTitle: l.lessonTitle,
          videoUrl: l.videoUrl,
          duration: l.duration ? parseFloat(l.duration) : 0,
          liveSessionLink: l.liveSessionLink,
          liveSessionDate: l.liveSessionDate?.toISOString() || null,
        })),
      })),
    };

    const loadingToast = toast.loading(
      isEditing ? 'Updating curriculum...' : 'Saving curriculum...',
    );

    try {
      if (isEditing && selectedId) {
        await httpClient.put(`/manage-batches/${selectedId}`, payload);
        toast.success('Curriculum updated!', { id: loadingToast });
      } else {
        await httpClient.post('/manage-batches', payload);
        toast.success('Curriculum saved!', { id: loadingToast });
      }

      setShowModal(false);
      resetForm();

      if (isDirectMode) {
        // Go back to batches list after saving
        navigate('/batches');
      } else {
        fetchManageBatches();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', {
        id: loadingToast,
      });
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete curriculum for "${label}"?`)) return;
    const t = toast.loading('Deleting...');
    try {
      await httpClient.delete(`/manage-batches/${id}`);
      toast.success('Deleted successfully!', { id: t });
      fetchManageBatches();
    } catch {
      toast.error('Failed to delete', { id: t });
    }
  };

  const openEditModal = (mb: ManageBatch) => {
    setIsEditing(true);
    setSelectedId(mb._id);
    setCurriculum(rebuildFormFromSaved(mb.curriculum));
    setSelectedBatch({
      value: mb.batchId._id,
      label: `${mb.courseId?.title} — ${mb.batchId.batchTimings}`,
      courseId: mb.courseId._id,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setSelectedBatch(null);
    setCurriculum([]);
    setIsEditing(false);
    setSelectedId(null);
  };

  // ─── Pagination ───────────────────────────────────────────────────────────

  const hasFilters = !!searchQuery;
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // ─── Direct mode: show a loading/redirect page ────────────────────────────

  if (isDirectMode) {
    return (
      <div className={styles.employees}>
        {/* Back button */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              onClick={() => navigate('/batches')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6366f1', fontWeight: 500, fontSize: 14, marginBottom: 6,
              }}
            >
              <ArrowLeft size={16} /> Back to Batches
            </button>
            <h1>Manage Curriculum</h1>
            <p>{directBatchInfo?.label || 'Loading batch...'}</p>
          </div>
        </div>

        {/* Loading state */}
        {directPageLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', gap: 12, color: '#6b7280' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            <span>Loading batch curriculum...</span>
          </div>
        )}

        {/* Inline curriculum form (no modal in direct mode) */}
        {!directPageLoading && showModal && (
          <div style={{ width: '100%' }}>
            <div
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* Form header */}
              <div
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <BookOpen size={20} style={{ color: '#6366f1' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>
                    {isEditing ? 'Edit' : 'Add'} Curriculum
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    {selectedBatch?.label}
                  </div>
                </div>
                {isEditing && (
                  <span style={{
                    marginLeft: 'auto',
                    background: '#dcfce7', color: '#166534',
                    borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 600,
                  }}>
                    Editing existing curriculum
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ padding: '20px 24px' }}>
                  <CurriculumEditor
                    curriculum={curriculum}
                    loadingCurriculum={loadingCurriculum}
                    selectedBatch={selectedBatch}
                    toggleChapter={toggleChapter}
                    updateLesson={updateLesson}
                    styles={styles}
                  />
                </div>

                <div
                  style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12,
                    background: '#f9fafb',
                  }}
                >
                  <Button variant="secondary" type="button" onClick={() => navigate('/batches')}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={curriculum.length === 0}>
                    {isEditing ? 'Update' : 'Save'} Curriculum
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── List mode (default /manage-batches page) ─────────────────────────────

  return (
    <div className={styles.employees}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Manage Batches</h1>
          <p>Assign video URLs, durations and live session details per lesson</p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by course or timings..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {hasFilters && (
              <button className={styles.clearFiltersBtn} onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>

          <button className={styles.addBtn} onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={18} /> Add Curriculum
          </button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total:</span>
          <span className={styles.statValue}>{manageBatches.length}</span>
        </div>
        {hasFilters && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredData.length}</span>
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
              <th>Batch Timings</th>
              <th>Start Date</th>
              <th>Chapters</th>
              <th>Lessons</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    <span className="ml-2">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {hasFilters ? 'No results match your search' : 'No curricula yet. Click "Add Curriculum" to start.'}
                </td>
              </tr>
            ) : (
              paginatedData.map((mb, index) => (
                <tr key={mb._id}>
                  <td>
                    <span className={styles.orgBadge} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </span>
                  </td>
                  <td>
                    <div className={styles.employeeCell}>
                      <div className={styles.avatar} style={{
                        background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', borderRadius: '50%', flexShrink: 0,
                      }}>
                        <BookOpen size={16} />
                      </div>
                      <div className={styles.employeeInfo}>
                        <span className={styles.employeeName}>{mb.courseId?.title || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className={styles.deptText}>{mb.batchId?.batchTimings || '—'}</span></td>
                  <td>
                    <span className={styles.deptText}>
                      {mb.batchId?.batchStartDate
                        ? new Date(mb.batchId.batchStartDate).toLocaleDateString('en-IN')
                        : '—'}
                    </span>
                  </td>
                  <td>
                    <span className={styles.orgBadge} style={{ background: '#fef3c7', color: '#92400e' }}>
                      {mb.curriculum?.length ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className={styles.orgBadge} style={{ background: '#dcfce7', color: '#166534' }}>
                      {mb.curriculum?.reduce((acc, ch) => acc + (ch.lessons?.length ?? 0), 0)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.deptText}>{new Date(mb.createdAt).toLocaleDateString('en-IN')}</div>
                    <div className={styles.roleText}>{new Date(mb.createdAt).toLocaleTimeString()}</div>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <Edit size={18} onClick={() => openEditModal(mb)} className={styles.editIcon} title="Edit" />
                      <Trash2 size={18} onClick={() => handleDelete(mb._id, mb.courseId?.title || mb._id)} className={styles.deleteIcon} title="Delete" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filteredData.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredData.length)} of{' '}
              {filteredData.length}
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

      {/* ── Modal (list mode only) ──────────────────────────────────────────── */}
      {showModal && !isDirectMode && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 720, width: '95vw' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <BookOpen size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} Batch Curriculum
              </h2>
              <X size={20} onClick={() => { setShowModal(false); resetForm(); }} style={{ cursor: 'pointer' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className={styles.formGrid}>

                  {/* Batch selector (create only) */}
                  {!isEditing && (
                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                      <label className={styles.formLabel}>
                        Select Batch <span style={{ color: 'red' }}>*</span>
                      </label>
                      <Select
                        options={batchOptions}
                        value={selectedBatch}
                        onChange={opt => handleBatchSelect(opt as BatchOption | null)}
                        placeholder="Choose a batch to load its curriculum..."
                        isClearable
                        styles={selectStyles}
                        menuPortalTarget={document.body}
                      />
                      <small style={{ color: '#6b7280', marginTop: 4, display: 'block' }}>
                        Selecting a batch auto-loads its course chapters and lessons below.
                      </small>
                    </div>
                  )}

                  {/* Batch label (edit mode) */}
                  {isEditing && selectedBatch && (
                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                      <label className={styles.formLabel}>Batch</label>
                      <div className={styles.formInput} style={{ background: '#f9fafb', color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BookOpen size={16} style={{ color: '#6366f1' }} />
                        {selectedBatch.label}
                      </div>
                    </div>
                  )}

                  <div style={{ gridColumn: '1 / -1' }}>
                    <CurriculumEditor
                      curriculum={curriculum}
                      loadingCurriculum={loadingCurriculum}
                      selectedBatch={selectedBatch}
                      toggleChapter={toggleChapter}
                      updateLesson={updateLesson}
                      styles={styles}
                    />
                  </div>

                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={curriculum.length === 0}>
                  {isEditing ? 'Update' : 'Save'} Curriculum
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Extracted curriculum editor (shared between modal and inline) ─────────────

interface CurriculumEditorProps {
  curriculum: FormChapter[];
  loadingCurriculum: boolean;
  selectedBatch: BatchOption | null;
  toggleChapter: (idx: number) => void;
  updateLesson: (ci: number, li: number, field: any, value: any) => void;
  styles: any;
}

const CurriculumEditor: React.FC<CurriculumEditorProps> = ({
  curriculum,
  loadingCurriculum,
  selectedBatch,
  toggleChapter,
  updateLesson,
  styles,
}) => {
  if (loadingCurriculum) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 inline-block" />
        <span style={{ marginLeft: 8 }}>Loading curriculum...</span>
      </div>
    );
  }

  if (selectedBatch && curriculum.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280', background: '#f9fafb', borderRadius: 8 }}>
        No chapters/lessons found for this course. Add them in the Courses section first.
      </div>
    );
  }

  if (curriculum.length === 0) return null;

  return (
    <div>
      <label className={styles.formLabel} style={{ marginBottom: 12, display: 'block' }}>
        Curriculum — fill in lesson details
      </label>

      {curriculum.map((chapter, chIdx) => (
        <div
          key={chapter.chapterId}
          style={{ border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}
        >
          {/* Chapter header */}
          <div
            onClick={() => toggleChapter(chIdx)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', background: '#f3f4f6', cursor: 'pointer', userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 28, height: 28, borderRadius: 6,
                background: '#f97316', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {chIdx + 1}
              </span>
              <span style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
                {chapter.chapterTitle}
              </span>
              <span style={{
                background: '#e0e7ff', color: '#4338ca',
                borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 500,
              }}>
                {chapter.lessons.length} lesson{chapter.lessons.length !== 1 ? 's' : ''}
              </span>
            </div>
            {chapter.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {/* Lessons */}
          {chapter.expanded && (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {chapter.lessons.map((lesson, lIdx) => (
                <div
                  key={lesson.lessonId}
                  style={{ background: '#fff8f1', border: '1px solid #fed7aa', borderRadius: 8, padding: '14px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 6,
                      background: '#f97316', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Video size={13} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#92400e' }}>
                      Lesson {lIdx + 1}: {lesson.lessonTitle}
                    </span>
                  </div>

                  {/* 4-col grid: Video URL (2 cols) | Duration | Live URL | Live Date (full row) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1.5fr', gap: '10px 14px' }}>

                    {/* Video URL — spans cols 1-2 */}
                    <div style={{ gridColumn: '1 / 3' }}>
                      <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Video size={12} /> Video URL
                      </label>
                      <input
                        type="url"
                        className={styles.formInput}
                        placeholder="https://..."
                        value={lesson.videoUrl}
                        onChange={e => updateLesson(chIdx, lIdx, 'videoUrl', e.target.value)}
                      />
                    </div>

                    {/* Duration — col 3 */}
                    <div>
                      <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> Duration (min)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className={styles.formInput}
                        placeholder="e.g. 45"
                        value={lesson.duration}
                        onChange={e => updateLesson(chIdx, lIdx, 'duration', e.target.value)}
                      />
                    </div>

                    {/* Live Session URL — col 4 */}
                    <div>
                      <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Link size={12} /> Live Session URL
                      </label>
                      <input
                        type="url"
                        className={styles.formInput}
                        placeholder="https://meet..."
                        value={lesson.liveSessionLink}
                        onChange={e => updateLesson(chIdx, lIdx, 'liveSessionLink', e.target.value)}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CalendarDays size={12} /> Live Session Date & Time
                      </label>
                      <DatePicker
                        selected={lesson.liveSessionDate}
                        onChange={(date: Date | null) => updateLesson(chIdx, lIdx, 'liveSessionDate', date)}
                        showTimeSelect
                        dateFormat="dd/MM/yyyy HH:mm"
                        timeFormat="HH:mm"
                        placeholderText="Select date & time"
                        className={styles.formInput}
                        popperPlacement="bottom-start"
                      />
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ManageBatches;