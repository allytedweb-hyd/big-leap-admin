import React, { useState, useEffect } from 'react';
import styles from './Employees.module.css';
import courseStyles from './Courses.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, Camera, Filter, BookOpen,
  ChevronDown, ChevronUp, Video, Minus, FileText, HelpCircle
} from 'lucide-react';
import { httpClient, imgUrl } from '../../lib/httpClient';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lesson {
  title: string;
  videoUrl: string;
  duration: number | string;
  liveSessionLink: string;
  LiveSessionDate: string; // datetime-local value
}

interface Chapter {
  title: string;
  lessons: Lesson[];
}

interface Course {
  _id: string;
  technology?: { _id: string; name: string };
  title?: string;
  descriptionOne?: string;
  descriptionTwo?: string;
  demoUrl?: string;
  learningOutcomesDescription?: string;
  learningOutcomesPoints?: string[];
  curriculum?: Chapter[];
  coursePrice?: number;
  hoursOfContent?: number;
  modules?: number;
  projects?: number;
  keyHighlights?: string[];
  courseThumbnailImage?: string;
  curriculumKey?: string;
  createdAt?: string;
  isActive: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyLesson = (): Lesson => ({
  title: '',
  videoUrl: '',
  duration: '',
  liveSessionLink: '',
  LiveSessionDate: '',
});

const emptyChapter = (): Chapter => ({ title: '', lessons: [emptyLesson()] });

const emptyForm = () => ({
  technology: '',
  title: '',
  descriptionOne: '',
  demoUrl: '',
  descriptionTwo: '',
  learningOutcomesDescription: '',
  coursePrice: '' as number | string,
  hoursOfContent: '' as number | string,
  modules: '' as number | string,
  projects: '' as number | string,
});

// DB date → datetime-local value (YYYY-MM-DDTHH:mm) in the user's LOCAL time
const toDatetimeLocal = (val?: string | Date): string => {
  if (!val) return '';
  const d = new Date(val as string);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const isBlankLesson = (ls: Lesson) =>
  !ls.title.trim() &&
  !ls.videoUrl.trim() &&
  !String(ls.duration ?? '').trim() &&
  !ls.liveSessionLink.trim() &&
  !ls.LiveSessionDate;

// ─── Component ────────────────────────────────────────────────────────────────

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [technologies, setTechnologies] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTech, setSelectedTech] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Thumbnail
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Curriculum Key
  const [curriculumKeyFile, setCurriculumKeyFile] = useState<File | null>(null);
  const [curriculumKeyName, setCurriculumKeyName] = useState<string | null>(null);

  // Dynamic sections
  const [curriculum, setCurriculum] = useState<Chapter[]>([emptyChapter()]);
  const [learningOutcomesPoints, setLearningOutcomesPoints] = useState<string[]>(['']);
  const [keyHighlights, setKeyHighlights] = useState<string[]>(['']);

  // Collapsed chapters UI
  const [collapsedChapters, setCollapsedChapters] = useState<Record<number, boolean>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [formData, setFormData] = useState(emptyForm());

  useEffect(() => { fetchTechnologies(); fetchCourses(); }, []);
  useEffect(() => { filterCourses(); }, [courses, selectedTech, searchQuery]);

  // ─── API ────────────────────────────────────────────────────────────────────

  const fetchTechnologies = async () => {
    try {
      const res = await httpClient.get('/technologies');
      setTechnologies(res.data?.technologies || []);
    } catch {
      toast.error('Failed to load technologies');
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      const res = await httpClient.patch(`/courses/${id}/toggle-status`);
      const updated = res.data?.course;
      setCourses(prev => prev.map(c => c._id === id ? { ...c, isActive: updated.isActive } : c));
      toast.success(res.data?.message || 'Status updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/courses');
      setCourses(res.data?.courses || []);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  // ─── Filter ─────────────────────────────────────────────────────────────────

  const filterCourses = () => {
    let filtered = [...courses];
    if (selectedTech) filtered = filtered.filter(c => c.technology?._id === selectedTech);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => (c.title || '').toLowerCase().includes(q));
    }
    setFilteredCourses(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => { setSelectedTech(''); setSearchQuery(''); };

  // ─── Thumbnail ──────────────────────────────────────────────────────────────

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); }
  };

  const removeImage = () => { setSelectedFile(null); setPreviewUrl(null); };

  // ─── Curriculum Key ───────────────────────────────────────────────────────

  const handleCurriculumKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setCurriculumKeyFile(file); setCurriculumKeyName(file.name); }
  };

  const removeCurriculumKey = () => {
    setCurriculumKeyFile(null);
    setCurriculumKeyName(null);
  };

  // ─── Curriculum ──────────────────────────────────────────────────────────────

  const addChapter = () => setCurriculum(prev => [...prev, emptyChapter()]);

  const removeChapter = async (ci: number) => {
    const result = await Swal.fire({
      title: 'Remove this chapter?',
      text: `Chapter ${ci + 1} and all its lessons will be removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      setCurriculum(prev => prev.filter((_, i) => i !== ci));
      toast.success(`Chapter ${ci + 1} removed`);
    }
  };

  const updateChapterTitle = (ci: number, value: string) =>
    setCurriculum(prev => prev.map((ch, i) => i === ci ? { ...ch, title: value } : ch));

  const addLesson = (ci: number) =>
    setCurriculum(prev => prev.map((ch, i) =>
      i === ci ? { ...ch, lessons: [...ch.lessons, emptyLesson()] } : ch
    ));

  const removeLesson = async (ci: number, li: number) => {
    const result = await Swal.fire({
      title: 'Remove this lesson?',
      text: `Lesson ${li + 1} in Chapter ${ci + 1} will be removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      setCurriculum(prev => prev.map((ch, i) =>
        i === ci ? { ...ch, lessons: ch.lessons.filter((_, j) => j !== li) } : ch
      ));
      toast.success(`Lesson ${li + 1} removed`);
    }
  };

  const updateLesson = (ci: number, li: number, field: keyof Lesson, value: string) =>
    setCurriculum(prev => prev.map((ch, i) =>
      i === ci
        ? { ...ch, lessons: ch.lessons.map((ls, j) => j === li ? { ...ls, [field]: value } : ls) }
        : ch
    ));

  const toggleChapter = (ci: number) =>
    setCollapsedChapters(prev => ({ ...prev, [ci]: !prev[ci] }));

  // ─── Learning Outcomes ────────────────────────────────────────────────────────

  const addOutcome = () => setLearningOutcomesPoints(prev => [...prev, '']);
  const removeOutcome = (i: number) => setLearningOutcomesPoints(prev => prev.filter((_, idx) => idx !== i));
  const updateOutcome = (i: number, val: string) =>
    setLearningOutcomesPoints(prev => prev.map((v, idx) => idx === i ? val : v));

  // ─── Key Highlights ───────────────────────────────────────────────────────────

  const addHighlight = () => setKeyHighlights(prev => [...prev, '']);
  const removeHighlight = (i: number) => setKeyHighlights(prev => prev.filter((_, idx) => idx !== i));
  const updateHighlight = (i: number, val: string) =>
    setKeyHighlights(prev => prev.map((v, idx) => idx === i ? val : v));

  // ─── Submit (no validation — empty fields are sent as-is) ────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const loadingToast = toast.loading(isEditing ? 'Updating course...' : 'Creating course...');
    const data = new FormData();

    // Every simple field is always sent (even when empty) so that clearing a
    // field in the edit form actually clears it in the database.
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value === null || value === undefined ? '' : String(value).trim());
    });

    // Arrays are sent as JSON strings so an empty list ("[]") can be sent too
    data.append(
      'learningOutcomesPoints',
      JSON.stringify(learningOutcomesPoints.map(v => v.trim()).filter(Boolean))
    );
    data.append(
      'keyHighlights',
      JSON.stringify(keyHighlights.map(v => v.trim()).filter(Boolean))
    );

    // Curriculum: drop completely blank lessons/chapters, keep everything else
    const cleanedCurriculum = curriculum
      .map(ch => ({
        title: ch.title.trim(),
        lessons: ch.lessons
          .filter(ls => !isBlankLesson(ls))
          .map(ls => {
            const date = ls.LiveSessionDate ? new Date(ls.LiveSessionDate) : null;
            return {
              title: ls.title.trim(),
              videoUrl: ls.videoUrl.trim(),
              duration: Number(ls.duration) || 0,
              liveSessionLink: ls.liveSessionLink.trim(),
              ...(date && !isNaN(date.getTime()) ? { LiveSessionDate: date.toISOString() } : {}),
            };
          }),
      }))
      .filter(ch => ch.title || ch.lessons.length > 0);

    data.append('curriculum', JSON.stringify(cleanedCurriculum));

    if (selectedFile) data.append('courseThumbnailImage', selectedFile);
    if (curriculumKeyFile) data.append('curriculumKey', curriculumKeyFile);

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (isEditing && selectedId) {
        await httpClient.put(`/courses/${selectedId}`, data, config);
        toast.success('Course updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/courses', data, config);
        toast.success('Course created successfully!', { id: loadingToast });
      }

      setShowModal(false);
      resetForm();
      fetchCourses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', { id: loadingToast });
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete this course?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    const loadingToast = toast.loading('Deleting course...');
    try {
      await httpClient.delete(`/courses/${id}`);
      toast.success('Course deleted successfully!', { id: loadingToast });
      fetchCourses();
    } catch {
      toast.error('Failed to delete course', { id: loadingToast });
    }
  };

  // ─── Edit ────────────────────────────────────────────────────────────────────

  const openEditModal = (course: Course) => {
    setIsEditing(true);
    setSelectedId(course._id);
    setFormData({
      technology: course.technology?._id || '',
      title: course.title ?? '',
      descriptionOne: course.descriptionOne ?? '',
      demoUrl: course.demoUrl ?? '',
      descriptionTwo: course.descriptionTwo ?? '',
      learningOutcomesDescription: course.learningOutcomesDescription ?? '',
      coursePrice: course.coursePrice ?? '',
      hoursOfContent: course.hoursOfContent ?? '',
      modules: course.modules ?? '',
      projects: course.projects ?? '',
    });
    setCurriculum(
      course.curriculum?.length
        ? course.curriculum.map(ch => ({
            title: ch.title ?? '',
            lessons: ch.lessons?.length
              ? ch.lessons.map(ls => ({
                  title: ls.title ?? '',
                  videoUrl: ls.videoUrl || '',
                  duration: ls.duration || '',
                  liveSessionLink: ls.liveSessionLink || '',
                  LiveSessionDate: toDatetimeLocal(ls.LiveSessionDate),
                }))
              : [emptyLesson()],
          }))
        : [emptyChapter()]
    );
    setLearningOutcomesPoints(
      course.learningOutcomesPoints?.length ? [...course.learningOutcomesPoints] : ['']
    );
    setKeyHighlights(
      course.keyHighlights?.length ? [...course.keyHighlights] : ['']
    );
    setCollapsedChapters({});
    setPreviewUrl(
      course.courseThumbnailImage
        ? `${imgUrl}/courses/${course.courseThumbnailImage}`
        : null
    );
    setSelectedFile(null);
    setCurriculumKeyFile(null);
    setCurriculumKeyName(course.curriculumKey || null);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setCurriculum([emptyChapter()]);
    setLearningOutcomesPoints(['']);
    setKeyHighlights(['']);
    setCollapsedChapters({});
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsEditing(false);
    setSelectedId(null);
    setCurriculumKeyFile(null);
    setCurriculumKeyName(null);
  };

  // ─── Pagination ──────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / itemsPerPage));
  const paginatedData = filteredCourses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={styles.employees}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Courses</h1>
          <p>Manage course catalog and curriculum structure</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by course title..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={styles.filterSelect}>
              <Filter size={18} className={styles.filterIcon} />
              <select
                value={selectedTech}
                onChange={e => setSelectedTech(e.target.value)}
                className={styles.orgSelect}
              >
                <option value="">All Technologies</option>
                {technologies.map((tech: any) => (
                  <option key={tech._id} value={tech._id}>{tech.name}</option>
                ))}
              </select>
            </div>
            {(selectedTech || searchQuery) && (
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
            <Plus size={18} /> Add Course
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Courses:</span>
          <span className={styles.statValue}>{courses.length}</span>
        </div>
        {selectedTech && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredCourses.length}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Course</th>
              <th>Technology</th>
              <th>Price</th>
              <th>Content</th>
              <th>Modules &amp; Projects</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-2">Loading courses...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="text-gray-500">
                    {selectedTech ? 'No courses found for this technology' : 'No courses found'}
                  </div>
                </td>
              </tr>
            ) : paginatedData.map(course => (
              <tr key={course._id}>
                <td>
                  <div className={styles.employeeCell}>
                    <div
                      className={styles.avatar}
                      style={{ borderRadius: 8, overflow: 'hidden', background: '#f5f5f5' }}
                    >
                      {course.courseThumbnailImage ? (
                        <img
                          src={`${imgUrl}/courses/${course.courseThumbnailImage}`}
                          alt={course.title || 'Course thumbnail'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          <BookOpen size={20} color="#aaa" />
                        </div>
                      )}
                    </div>
                    <div className={styles.employeeInfo}>
                      <span className={styles.employeeName}>{course.title || 'Untitled course'}</span>
                      <span className={styles.employeeEmail}>
                        {course.curriculum?.length || 0} chapters · {course.hoursOfContent ?? 0}h content
                      </span>
                    </div>
                  </div>
                </td>
                <td><span className={styles.orgBadge}>{course.technology?.name || 'N/A'}</span></td>
                <td><strong>₹{(course.coursePrice ?? 0).toLocaleString()}</strong></td>
                <td>
                  <div className={styles.deptText}>{course.hoursOfContent ?? 0}h content</div>
                  <div className={styles.roleText}>{course.curriculum?.length || 0} chapters</div>
                </td>
                <td>
                  <div className={styles.deptText}>{course.modules ?? 0} modules</div>
                  <div className={styles.roleText}>{course.projects ?? 0} projects</div>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => toggleStatus(course._id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      background: course.isActive ? '#dcfce7' : '#fee2e2',
                      color: course.isActive ? '#16a34a' : '#dc2626',
                    }}
                    title={course.isActive ? 'Click to deactivate' : 'Click to activate'}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: course.isActive ? '#16a34a' : '#dc2626',
                      }}
                    />
                    {course.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <HelpCircle
                      size={18}
                      onClick={() => navigate(`/admin/courses/${course._id}/quiz`)}
                      className={styles.editIcon}
                      style={{ cursor: 'pointer' }}
                    />
                    <Edit size={18} onClick={() => openEditModal(course)} className={styles.editIcon} />
                    <Trash2 size={18} onClick={() => handleDelete(course._id)} className={styles.deleteIcon} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCourses.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredCourses.length)} of{' '}
              {filteredCourses.length} courses
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

      {/* ═══════════════════════════════ MODAL ═══════════════════════════════ */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 920, width: '95vw' }}>

            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{isEditing ? 'Edit' : 'Add'} Course</h2>
              <X size={20} onClick={() => setShowModal(false)} style={{ cursor: 'pointer' }} />
            </div>

            {/* noValidate turns off ALL browser-side validation (type=url, min, step, etc.) */}
            <form onSubmit={handleSubmit} noValidate>
              <div className={styles.modalBody} style={{ maxHeight: '74vh', overflowY: 'auto' }}>

                {/* ── Thumbnail + Technology ── */}
                <div style={{ display: 'flex', gap: 20, marginBottom: 20, alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, textAlign: 'center' }}>
                    <div className={styles.imagePreviewWrapper}>
                      <div className={styles.imagePlaceholder} style={{ width: 160, height: 100, borderRadius: 10 }}>
                        {previewUrl ? (
                          <>
                            <img src={previewUrl} alt="Thumbnail" className={styles.imgPreview} style={{ borderRadius: 10, objectFit: 'cover' }} />
                            <button type="button" className={styles.removeImageBtn} onClick={removeImage}><X size={14} /></button>
                          </>
                        ) : (
                          <label htmlFor="thumbnail-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#aaa' }}>
                            <Camera size={28} />
                            <span style={{ fontSize: 11 }}>Thumbnail</span>
                          </label>
                        )}
                      </div>
                      <label htmlFor="thumbnail-upload" className={styles.imageUploadLabel} style={{ cursor: 'pointer', display: 'block', marginTop: 5 }}>
                        {isEditing ? 'Change Thumbnail' : 'Upload Thumbnail'}
                      </label>
                    </div>
                    <input id="thumbnail-upload" type="file" accept="image/*" hidden onChange={handleImageChange} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Technology</label>
                      <select
                        className={styles.formSelect}
                        value={formData.technology}
                        onChange={e => setFormData({ ...formData, technology: e.target.value })}
                      >
                        <option value="">Select Technology</option>
                        {technologies.map((tech: any) => (
                          <option key={tech._id} value={tech._id}>{tech.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── Curriculum Key ── */}
                <div className={styles.formGroup} style={{ marginBottom: 20 }}>
                  <label className={styles.formLabel}>
                    Curriculum Key{' '}
                    <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}>(PDF or DOCX)</span>
                  </label>
                  {curriculumKeyName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 8, background: '#f9f9f9' }}>
                      <FileText size={18} color="#6366f1" style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {curriculumKeyName}
                      </span>
                      <label htmlFor="curriculum-key-upload" className={styles.imageUploadLabel} style={{ cursor: 'pointer', margin: 0, whiteSpace: 'nowrap', fontSize: 12 }}>
                        Replace
                      </label>
                      <button type="button" onClick={removeCurriculumKey} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444', padding: 2, flexShrink: 0 }}>
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="curriculum-key-upload" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1.5px dashed #d1d5db', borderRadius: 8, cursor: 'pointer', background: '#fafafa' }}>
                      <FileText size={20} color="#aaa" />
                      <span style={{ fontSize: 13, color: '#aaa' }}>Click to upload curriculum key (PDF or DOCX)</span>
                    </label>
                  )}
                  <input
                    id="curriculum-key-upload"
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    hidden
                    onChange={handleCurriculumKeyChange}
                  />
                </div>

                {/* ── Basic Info (all optional) ── */}
                <div className={styles.formGrid}>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>Course Title</label>
                    <input type="text" className={styles.formInput} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>Description One</label>
                    <textarea className={styles.formInput} rows={3} value={formData.descriptionOne} onChange={e => setFormData({ ...formData, descriptionOne: e.target.value })} style={{ resize: 'vertical' }} />
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>Description Two</label>
                    <textarea className={styles.formInput} rows={3} value={formData.descriptionTwo} onChange={e => setFormData({ ...formData, descriptionTwo: e.target.value })} style={{ resize: 'vertical' }} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Demo URL</label>
                    <input type="text" className={styles.formInput} value={formData.demoUrl} onChange={e => setFormData({ ...formData, demoUrl: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Course Price (₹)</label>
                    <input type="number" className={styles.formInput} value={formData.coursePrice} onChange={e => setFormData({ ...formData, coursePrice: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Hours of Content</label>
                    <input type="number" className={styles.formInput} step="any" value={formData.hoursOfContent} onChange={e => setFormData({ ...formData, hoursOfContent: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Modules</label>
                    <input type="number" className={styles.formInput} value={formData.modules} onChange={e => setFormData({ ...formData, modules: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Projects</label>
                    <input type="number" className={styles.formInput} value={formData.projects} onChange={e => setFormData({ ...formData, projects: e.target.value })} />
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>Learning Outcomes Description</label>
                    <textarea className={styles.formInput} rows={2} value={formData.learningOutcomesDescription} onChange={e => setFormData({ ...formData, learningOutcomesDescription: e.target.value })} style={{ resize: 'vertical' }} />
                  </div>
                </div>

                {/* ── Learning Outcomes Points ── */}
                <div className={courseStyles.sectionBlock}>
                  <div className={courseStyles.sectionHeader}>
                    <span className={courseStyles.sectionTitle}>Learning Outcomes Points</span>
                    <button type="button" className={courseStyles.addItemBtn} onClick={addOutcome}><Plus size={14} /> Add Point</button>
                  </div>
                  <div className={courseStyles.tagList}>
                    {learningOutcomesPoints.map((point, i) => (
                      <div key={i} className={courseStyles.tagRow}>
                        <span className={courseStyles.tagIndex}>{i + 1}</span>
                        <input type="text" className={styles.formInput} placeholder="e.g. Understand core concepts of the subject" value={point} onChange={e => updateOutcome(i, e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
                        {learningOutcomesPoints.length > 1 && (
                          <button type="button" className={courseStyles.removeTagBtn} onClick={() => removeOutcome(i)}><Minus size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Key Highlights ── */}
                <div className={courseStyles.sectionBlock}>
                  <div className={courseStyles.sectionHeader}>
                    <span className={courseStyles.sectionTitle}>Key Highlights</span>
                    <button type="button" className={courseStyles.addItemBtn} onClick={addHighlight}><Plus size={14} /> Add Highlight</button>
                  </div>
                  <div className={courseStyles.tagList}>
                    {keyHighlights.map((highlight, i) => (
                      <div key={i} className={courseStyles.tagRow}>
                        <span className={courseStyles.tagIndex}>{i + 1}</span>
                        <input type="text" className={styles.formInput} placeholder="e.g. Lifetime access to course materials" value={highlight} onChange={e => updateHighlight(i, e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
                        {keyHighlights.length > 1 && (
                          <button type="button" className={courseStyles.removeTagBtn} onClick={() => removeHighlight(i)}><Minus size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Curriculum ── */}
                <div className={courseStyles.sectionBlock}>
                  <div className={courseStyles.sectionHeader}>
                    <span className={courseStyles.sectionTitle}>Curriculum</span>
                    <button type="button" className={courseStyles.addItemBtn} onClick={addChapter}><Plus size={14} /> Add Chapter</button>
                  </div>

                  <div className={courseStyles.chapterList}>
                    {curriculum.map((chapter, ci) => (
                      <div key={ci} className={courseStyles.chapterCard}>

                        {/* Chapter header */}
                        <div className={courseStyles.chapterHeader}>
                          <div className={courseStyles.chapterBadge}>{ci + 1}</div>
                          <input
                            type="text"
                            className={`${styles.formInput} ${courseStyles.chapterTitleInput}`}
                            placeholder={`Chapter ${ci + 1} title`}
                            value={chapter.title}
                            onChange={e => updateChapterTitle(ci, e.target.value)}
                          />
                          <div className={courseStyles.chapterActions}>
                            <span className={courseStyles.lessonCount}>
                              {chapter.lessons.length} lesson{chapter.lessons.length !== 1 ? 's' : ''}
                            </span>
                            <button type="button" className={courseStyles.collapseBtn} onClick={() => toggleChapter(ci)} title={collapsedChapters[ci] ? 'Expand' : 'Collapse'}>
                              {collapsedChapters[ci] ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                            </button>
                            {curriculum.length > 1 && (
                              <button type="button" className={courseStyles.removeChapterBtn} onClick={() => removeChapter(ci)} title="Remove chapter">
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Lessons */}
                        {!collapsedChapters[ci] && (
                          <div className={courseStyles.lessonsArea}>
                            <div className={courseStyles.lessonsGrid}>
                              {chapter.lessons.map((lesson, li) => (
                                <div key={li} className={courseStyles.lessonCard}>

                                  <div className={courseStyles.lessonCardHeader}>
                                    <div className={courseStyles.lessonIconWrap}>
                                      <Video size={13} />
                                    </div>
                                    <span className={courseStyles.lessonLabel}>Lesson {li + 1}</span>
                                    {chapter.lessons.length > 1 && (
                                      <button type="button" className={courseStyles.removeLessonBtn} onClick={() => removeLesson(ci, li)} title="Remove lesson">
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>

                                  <div className={courseStyles.lessonFields}>
                                    <input
                                      type="text"
                                      className={`${styles.formInput} ${courseStyles.lessonInput}`}
                                      placeholder="Lesson title"
                                      value={lesson.title}
                                      onChange={e => updateLesson(ci, li, 'title', e.target.value)}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>

                            <button type="button" className={courseStyles.addLessonBtn} onClick={() => addLesson(ci)}>
                              <Plus size={14} /> Add Lesson to Chapter {ci + 1}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>{/* end modalBody */}

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">{isEditing ? 'Update' : 'Save'} Course</Button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;