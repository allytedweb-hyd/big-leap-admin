import React, { useState, useEffect } from 'react';
import styles from './Employees.module.css';
import courseStyles from './Courses.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, Camera, Filter, BookOpen,
  ChevronDown, ChevronUp, Video, Minus
} from 'lucide-react';
import { httpClient, imgUrl } from '../../lib/httpClient';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lesson {
  title: string;
  videoUrl: string;
  duration: number | string;
}

interface Chapter {
  title: string;
  lessons: Lesson[];
}

interface Course {
  _id: string;
  technology?: { _id: string; name: string };
  title: string;
  descriptionOne: string;
  descriptionTwo: string;
  demoUrl: string;
  learningOutcomesDescription: string;
  learningOutcomesPoints: string[];
  curriculum: Chapter[];
  coursePrice: number;
  hoursOfContent: number;
  modules: number;
  projects: number;
  keyHighlights: string[];
  courseThumbnailImage: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyLesson = (): Lesson => ({ title: '', videoUrl: '', duration: '' });
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

// ─── Component ────────────────────────────────────────────────────────────────

const Courses: React.FC = () => {
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

  const fetchCourses = async () => {
    setLoading(true);
    try {
      // ✅ Correct endpoint: GET /courses
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
    if (searchQuery) filtered = filtered.filter(c =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
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

  // ─── Curriculum ──────────────────────────────────────────────────────────────

  const addChapter = () => setCurriculum(prev => [...prev, emptyChapter()]);

  const removeChapter = (ci: number) =>
    setCurriculum(prev => prev.filter((_, i) => i !== ci));

  const updateChapterTitle = (ci: number, value: string) =>
    setCurriculum(prev => prev.map((ch, i) => i === ci ? { ...ch, title: value } : ch));

  const addLesson = (ci: number) =>
    setCurriculum(prev => prev.map((ch, i) =>
      i === ci ? { ...ch, lessons: [...ch.lessons, emptyLesson()] } : ch
    ));

  const removeLesson = (ci: number, li: number) =>
    setCurriculum(prev => prev.map((ch, i) =>
      i === ci ? { ...ch, lessons: ch.lessons.filter((_, j) => j !== li) } : ch
    ));

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

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile && !isEditing) {
      toast.error('Course thumbnail image is required.');
      return;
    }

    for (let ci = 0; ci < curriculum.length; ci++) {
      if (!curriculum[ci].title.trim()) {
        toast.error(`Chapter ${ci + 1} title is required.`); return;
      }
      for (let li = 0; li < curriculum[ci].lessons.length; li++) {
        if (!curriculum[ci].lessons[li].title.trim()) {
          toast.error(`Lesson ${li + 1} title in Chapter ${ci + 1} is required.`); return;
        }
      }
    }

    const loadingToast = toast.loading(isEditing ? 'Updating course...' : 'Creating course...');
    const data = new FormData();

    // Append scalar fields
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        data.append(key, value.toString());
      }
    });

    // Append arrays using [] notation so Express parses them as arrays
    learningOutcomesPoints
      .filter(v => v.trim())
      .forEach(v => data.append('learningOutcomesPoints[]', v));

    keyHighlights
      .filter(v => v.trim())
      .forEach(v => data.append('keyHighlights[]', v));

    // Curriculum as JSON string — controller parses it back
    data.append('curriculum', JSON.stringify(
      curriculum.map(ch => ({
        title: ch.title,
        lessons: ch.lessons.map(ls => ({
          title: ls.title,
          videoUrl: ls.videoUrl,
          duration: ls.duration ? Number(ls.duration) : 0,
        })),
      }))
    ));

    if (selectedFile) data.append('courseThumbnailImage', selectedFile);

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (isEditing && selectedId) {
        // ✅ Correct endpoint: PUT /courses/:id
        await httpClient.put(`/courses/${selectedId}`, data, config);
        toast.success('Course updated successfully!', { id: loadingToast });
      } else {
        // ✅ Correct endpoint: POST /courses
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
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    const loadingToast = toast.loading('Deleting course...');
    try {
      // ✅ Correct endpoint: DELETE /courses/:id
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
      title: course.title,
      descriptionOne: course.descriptionOne,
      demoUrl: course.demoUrl,
      descriptionTwo: course.descriptionTwo,
      learningOutcomesDescription: course.learningOutcomesDescription,
      coursePrice: course.coursePrice,
      hoursOfContent: course.hoursOfContent,
      modules: course.modules,
      projects: course.projects,
    });
    setCurriculum(
      course.curriculum?.length
        ? course.curriculum.map(ch => ({
            title: ch.title,
            lessons: ch.lessons?.length
              ? ch.lessons.map(ls => ({
                  title: ls.title,
                  videoUrl: ls.videoUrl || '',
                  duration: ls.duration || '',
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
              <th>Modules / Projects</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-2">Loading courses...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
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
                          alt={course.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                        }}>
                          <BookOpen size={20} color="#aaa" />
                        </div>
                      )}
                    </div>
                    <div className={styles.employeeInfo}>
                      <span className={styles.employeeName}>{course.title}</span>
                      <span className={styles.employeeEmail}>
                        {course.curriculum?.length || 0} chapters · {course.hoursOfContent}h content
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={styles.orgBadge}>{course.technology?.name || 'N/A'}</span>
                </td>
                <td>
                  <strong>₹{course.coursePrice?.toLocaleString()}</strong>
                </td>
                <td>
                  <div className={styles.deptText}>{course.hoursOfContent}h content</div>
                  <div className={styles.roleText}>{course.curriculum?.length || 0} chapters</div>
                </td>
                <td>
                  <div className={styles.deptText}>{course.modules} modules</div>
                  <div className={styles.roleText}>{course.projects} projects</div>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <Edit
                      size={18}
                      onClick={() => openEditModal(course)}
                      className={styles.editIcon}
                    />
                    <Trash2
                      size={18}
                      onClick={() => handleDelete(course._id)}
                      className={styles.deleteIcon}
                    />
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

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 920, width: '95vw' }}>

            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {isEditing ? 'Edit' : 'Add'} Course
              </h2>
              <X
                size={20}
                onClick={() => setShowModal(false)}
                style={{ cursor: 'pointer' }}
              />
            </div>

            <form onSubmit={handleSubmit}>
              <div
                className={styles.modalBody}
                style={{ maxHeight: '74vh', overflowY: 'auto' }}
              >

                {/* ── Thumbnail + Technology row ── */}
                <div style={{
                  display: 'flex',
                  gap: 20,
                  marginBottom: 20,
                  alignItems: 'flex-start',
                }}>
                  {/* Thumbnail */}
                  <div style={{ flexShrink: 0, textAlign: 'center' }}>
                    <div className={styles.imagePreviewWrapper}>
                      <div
                        className={styles.imagePlaceholder}
                        style={{ width: 160, height: 100, borderRadius: 10 }}
                      >
                        {previewUrl ? (
                          <>
                            <img
                              src={previewUrl}
                              alt="Thumbnail"
                              className={styles.imgPreview}
                              style={{ borderRadius: 10, objectFit: 'cover' }}
                            />
                            <button
                              type="button"
                              className={styles.removeImageBtn}
                              onClick={removeImage}
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <label
                            htmlFor="thumbnail-upload"
                            style={{
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 4,
                              color: '#aaa',
                            }}
                          >
                            <Camera size={28} />
                            <span style={{ fontSize: 11 }}>Thumbnail</span>
                          </label>
                        )}
                      </div>
                      <label
                        htmlFor="thumbnail-upload"
                        className={styles.imageUploadLabel}
                        style={{ cursor: 'pointer', display: 'block', marginTop: 5 }}
                      >
                        {isEditing ? 'Change Thumbnail' : 'Upload Thumbnail'}
                        {!isEditing && <span style={{ color: 'red' }}> *</span>}
                      </label>
                    </div>
                    <input
                      id="thumbnail-upload"
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleImageChange}
                    />
                  </div>

                  {/* Technology */}
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

                {/* ── Basic Info ── */}
                <div className={styles.formGrid}>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Course Title <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Description One <span style={{ color: 'red' }}>*</span>
                    </label>
                    <textarea
                      className={styles.formInput}
                      required
                      rows={3}
                      value={formData.descriptionOne}
                      onChange={e => setFormData({ ...formData, descriptionOne: e.target.value })}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Description Two <span style={{ color: 'red' }}>*</span>
                    </label>
                    <textarea
                      className={styles.formInput}
                      required
                      rows={3}
                      value={formData.descriptionTwo}
                      onChange={e => setFormData({ ...formData, descriptionTwo: e.target.value })}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Demo URL <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="url"
                      className={styles.formInput}
                      required
                      value={formData.demoUrl}
                      onChange={e => setFormData({ ...formData, demoUrl: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Course Price (₹) <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className={styles.formInput}
                      required
                      min={0}
                      value={formData.coursePrice}
                      onChange={e => setFormData({ ...formData, coursePrice: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Hours of Content <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className={styles.formInput}
                      required
                      min={0.5}
                      step={0.5}
                      value={formData.hoursOfContent}
                      onChange={e => setFormData({ ...formData, hoursOfContent: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Modules <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className={styles.formInput}
                      required
                      min={1}
                      value={formData.modules}
                      onChange={e => setFormData({ ...formData, modules: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Projects <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className={styles.formInput}
                      required
                      min={0}
                      value={formData.projects}
                      onChange={e => setFormData({ ...formData, projects: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Learning Outcomes Description <span style={{ color: 'red' }}>*</span>
                    </label>
                    <textarea
                      className={styles.formInput}
                      required
                      rows={2}
                      value={formData.learningOutcomesDescription}
                      onChange={e =>
                        setFormData({ ...formData, learningOutcomesDescription: e.target.value })
                      }
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    LEARNING OUTCOMES POINTS
                ══════════════════════════════════════════════════════════ */}
                <div className={courseStyles.sectionBlock}>
                  <div className={courseStyles.sectionHeader}>
                    <span className={courseStyles.sectionTitle}>
                      Learning Outcomes Points
                    </span>
                    <button
                      type="button"
                      className={courseStyles.addItemBtn}
                      onClick={addOutcome}
                    >
                      <Plus size={14} /> Add Point
                    </button>
                  </div>
                  <div className={courseStyles.tagList}>
                    {learningOutcomesPoints.map((point, i) => (
                      <div key={i} className={courseStyles.tagRow}>
                        <span className={courseStyles.tagIndex}>{i + 1}</span>
                        <input
                          type="text"
                          className={styles.formInput}
                          placeholder="e.g. Understand core concepts of the subject"
                          value={point}
                          onChange={e => updateOutcome(i, e.target.value)}
                          style={{ flex: 1, marginBottom: 0 }}
                        />
                        {learningOutcomesPoints.length > 1 && (
                          <button
                            type="button"
                            className={courseStyles.removeTagBtn}
                            onClick={() => removeOutcome(i)}
                          >
                            <Minus size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    KEY HIGHLIGHTS
                ══════════════════════════════════════════════════════════ */}
                <div className={courseStyles.sectionBlock}>
                  <div className={courseStyles.sectionHeader}>
                    <span className={courseStyles.sectionTitle}>Key Highlights</span>
                    <button
                      type="button"
                      className={courseStyles.addItemBtn}
                      onClick={addHighlight}
                    >
                      <Plus size={14} /> Add Highlight
                    </button>
                  </div>
                  <div className={courseStyles.tagList}>
                    {keyHighlights.map((highlight, i) => (
                      <div key={i} className={courseStyles.tagRow}>
                        <span className={courseStyles.tagIndex}>{i + 1}</span>
                        <input
                          type="text"
                          className={styles.formInput}
                          placeholder="e.g. Lifetime access to course materials"
                          value={highlight}
                          onChange={e => updateHighlight(i, e.target.value)}
                          style={{ flex: 1, marginBottom: 0 }}
                        />
                        {keyHighlights.length > 1 && (
                          <button
                            type="button"
                            className={courseStyles.removeTagBtn}
                            onClick={() => removeHighlight(i)}
                          >
                            <Minus size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    CURRICULUM
                ══════════════════════════════════════════════════════════ */}
                <div className={courseStyles.sectionBlock}>
                  <div className={courseStyles.sectionHeader}>
                    <span className={courseStyles.sectionTitle}>Curriculum</span>
                    <button
                      type="button"
                      className={courseStyles.addItemBtn}
                      onClick={addChapter}
                    >
                      <Plus size={14} /> Add Chapter
                    </button>
                  </div>

                  <div className={courseStyles.chapterList}>
                    {curriculum.map((chapter, ci) => (
                      <div key={ci} className={courseStyles.chapterCard}>

                        {/* Chapter header row */}
                        <div className={courseStyles.chapterHeader}>
                          <div className={courseStyles.chapterBadge}>{ci + 1}</div>
                          <input
                            type="text"
                            className={`${styles.formInput} ${courseStyles.chapterTitleInput}`}
                            placeholder={`Chapter ${ci + 1} title *`}
                            value={chapter.title}
                            onChange={e => updateChapterTitle(ci, e.target.value)}
                          />
                          <div className={courseStyles.chapterActions}>
                            <span className={courseStyles.lessonCount}>
                              {chapter.lessons.length} lesson{chapter.lessons.length !== 1 ? 's' : ''}
                            </span>
                            <button
                              type="button"
                              className={courseStyles.collapseBtn}
                              onClick={() => toggleChapter(ci)}
                              title={collapsedChapters[ci] ? 'Expand' : 'Collapse'}
                            >
                              {collapsedChapters[ci]
                                ? <ChevronDown size={15} />
                                : <ChevronUp size={15} />}
                            </button>
                            {curriculum.length > 1 && (
                              <button
                                type="button"
                                className={courseStyles.removeChapterBtn}
                                onClick={() => removeChapter(ci)}
                                title="Remove chapter"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Lessons area */}
                        {!collapsedChapters[ci] && (
                          <div className={courseStyles.lessonsArea}>
                            <div className={courseStyles.lessonsGrid}>
                              {chapter.lessons.map((lesson, li) => (
                                <div key={li} className={courseStyles.lessonCard}>
                                  <div className={courseStyles.lessonCardHeader}>
                                    <div className={courseStyles.lessonIconWrap}>
                                      <Video size={13} />
                                    </div>
                                    <span className={courseStyles.lessonLabel}>
                                      Lesson {li + 1}
                                    </span>
                                    {chapter.lessons.length > 1 && (
                                      <button
                                        type="button"
                                        className={courseStyles.removeLessonBtn}
                                        onClick={() => removeLesson(ci, li)}
                                        title="Remove lesson"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>
                                  <div className={courseStyles.lessonFields}>
                                    <input
                                      type="text"
                                      className={`${styles.formInput} ${courseStyles.lessonInput}`}
                                      placeholder="Lesson title *"
                                      value={lesson.title}
                                      onChange={e =>
                                        updateLesson(ci, li, 'title', e.target.value)
                                      }
                                    />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <input
                                        type="url"
                                        className={`${styles.formInput} ${courseStyles.lessonInput}`}
                                        placeholder="Video URL"
                                        value={lesson.videoUrl}
                                        onChange={e =>
                                          updateLesson(ci, li, 'videoUrl', e.target.value)
                                        }
                                        style={{ flex: 2 }}
                                      />
                                      <input
                                        type="number"
                                        className={`${styles.formInput} ${courseStyles.lessonInput}`}
                                        placeholder="Duration (min)"
                                        min={0}
                                        value={lesson.duration}
                                        onChange={e =>
                                          updateLesson(ci, li, 'duration', e.target.value)
                                        }
                                        style={{ flex: 1 }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              className={courseStyles.addLessonBtn}
                              onClick={() => addLesson(ci)}
                            >
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
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {isEditing ? 'Update' : 'Save'} Course
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
