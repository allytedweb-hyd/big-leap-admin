import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, BookOpen, Image as ImageIcon,
} from 'lucide-react';
import { httpClient, imgUrl } from '../../lib/httpClient';
import toast from 'react-hot-toast';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Subject {
  _id: string;
  subjectName: string;
  image: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Empty form factory ───────────────────────────────────────────────────────

const emptyForm = () => ({
  subjectName: '',
  image: null as File | null,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

// handles both { message } and express-validator { errors: [{ msg }] }
const getErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message ||
  err?.response?.data?.errors?.[0]?.msg ||
  fallback;

const getImageUrl = (image: string) => `${imgUrl}/assessments-subjects/${image}`;

// ─── Thumbnail with fallback ──────────────────────────────────────────────────

const SubjectThumb: React.FC<{ image: string; name: string; size?: number }> = ({
  image,
  name,
  size = 44,
}) => {
  const [failed, setFailed] = useState(false);

  if (failed || !image) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1, #4338ca)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={getImageUrl(image)}
      alt={name}
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        objectFit: 'cover',
        borderRadius: 10,
        border: '1px solid #e5e7eb',
        flexShrink: 0,
      }}
    />
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const AssessmentSubjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    filterSubjects();
  }, [subjects, searchQuery]);

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/assessments-subjects', {
        params: { limit: 'all' },
      });
      setSubjects(res.data?.subjects || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load subjects'));
    } finally {
      setLoading(false);
    }
  };

  // ─── Filtering ────────────────────────────────────────────────────────────

  const filterSubjects = () => {
    let filtered = [...subjects];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => s.subjectName.toLowerCase().includes(q));
    }

    setFilteredSubjects(filtered);
    setCurrentPage(1);
  };

  // ─── Image handling ───────────────────────────────────────────────────────

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files are allowed (JPEG, PNG, GIF, WEBP)');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      e.target.value = '';
      return;
    }

    setFormData(prev => ({ ...prev, image: file }));
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ─── Form submit ──────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.subjectName.trim()) {
      toast.error('Please enter subject name');
      return;
    }
    // image is required only when creating
    if (!isEditing && !formData.image) {
      toast.error('Please choose a subject image');
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading(
      isEditing ? 'Updating subject...' : 'Creating subject...',
    );

    try {
      const submitData = new FormData();
      submitData.append('subjectName', formData.subjectName.trim());
      if (formData.image) {
        submitData.append('image', formData.image);
      }

      if (isEditing && selectedId) {
        await httpClient.put(`/assessments-subjects/${selectedId}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Subject updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/assessments-subjects', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Subject created successfully!', { id: loadingToast });
      }

      setShowModal(false);
      resetForm();
      fetchSubjects();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Operation failed'), { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    const loadingToast = toast.loading('Deleting subject...');
    try {
      await httpClient.delete(`/assessments-subjects/${id}`);
      toast.success('Subject deleted successfully!', { id: loadingToast });
      fetchSubjects();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete subject'), { id: loadingToast });
    }
  };

  // ─── Open edit modal ──────────────────────────────────────────────────────

  const openEditModal = (subject: Subject) => {
    setIsEditing(true);
    setSelectedId(subject._id);
    setFormData({ subjectName: subject.subjectName, image: null });
    setPreviewImage(subject.image ? getImageUrl(subject.image) : null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setPreviewImage(null);
    setIsEditing(false);
    setSelectedId(null);
  };

  // ─── Pagination ───────────────────────────────────────────────────────────

  const hasFilters = !!searchQuery;
  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / itemsPerPage));
  const paginatedData = filteredSubjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.employees}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Assessment Subjects</h1>
          <p>Manage subjects like Aptitude, Reasoning and English Ability</p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by subject name..."
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
            <Plus size={18} /> Add Subject
          </button>
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Subjects:</span>
          <span className={styles.statValue}>{subjects.length}</span>
        </div>
        {hasFilters && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredSubjects.length}</span>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Image</th>
              <th>Subject Name</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    <span className="ml-2">Loading subjects...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {hasFilters
                    ? 'No subjects match your search'
                    : 'No subjects found. Click "Add Subject" to create one.'}
                </td>
              </tr>
            ) : (
              paginatedData.map((subject, index) => (
                <tr key={subject._id}>

                  {/* # */}
                  <td>
                    <span
                      className={styles.orgBadge}
                      style={{ background: '#e0e7ff', color: '#4338ca' }}
                    >
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </span>
                  </td>

                  {/* Image */}
                  <td>
                    <SubjectThumb image={subject.image} name={subject.subjectName} />
                  </td>

                  {/* Name */}
                  <td>
                    <div className={styles.employeeCell}>
                      <div className={styles.employeeInfo}>
                        <span className={styles.employeeName}>{subject.subjectName}</span>
                        <span className={styles.employeeEmail}>
                          ID: {subject._id.slice(-8)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td>
                    <div className={styles.deptText}>
                      {new Date(subject.createdAt).toLocaleDateString('en-IN')}
                    </div>
                    <div className={styles.roleText}>
                      {new Date(subject.createdAt).toLocaleTimeString()}
                    </div>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className={styles.actionButtons}>
                      <Edit
                        size={18}
                        onClick={() => openEditModal(subject)}
                        className={styles.editIcon}
                        title="Edit Subject"
                      />
                      <Trash2
                        size={18}
                        onClick={() => handleDelete(subject._id, subject.subjectName)}
                        className={styles.deleteIcon}
                        title="Delete Subject"
                      />
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredSubjects.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredSubjects.length)} of{' '}
              {filteredSubjects.length} subjects
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
          <div className={styles.modal} style={{ maxWidth: 520, width: '95vw' }}>

            {/* Modal header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <BookOpen size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} Subject
              </h2>
              <X size={20} onClick={closeModal} style={{ cursor: 'pointer' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className={styles.formGrid}>

                  {/* ── Subject Name ─────────────────────────────────────── */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Subject Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      maxLength={100}
                      placeholder="e.g., Quantitative Aptitude"
                      value={formData.subjectName}
                      onChange={e => setFormData({ ...formData, subjectName: e.target.value })}
                    />
                  </div>

                  {/* ── Subject Image ────────────────────────────────────── */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Subject Image{' '}
                      {isEditing ? (
                        <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span>
                      ) : (
                        <span style={{ color: 'red' }}>*</span>
                      )}
                    </label>
                    <div className={styles.imageUploadContainer}>
                      <input
                        type="file"
                        id="subjectImage"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="subjectImage" className={styles.uploadButton}>
                        <ImageIcon size={18} />
                        &nbsp;Choose Image
                      </label>
                      <small style={{ color: '#6b7280', marginLeft: 12 }}>
                        Max 5 MB (JPEG, PNG, GIF, WEBP)
                      </small>
                    </div>

                    {/* Preview */}
                    {previewImage && (
                      <div style={{ marginTop: 16 }}>
                        <img
                          src={previewImage}
                          alt="Preview"
                          style={{
                            width: 96,
                            height: 96,
                            objectFit: 'cover',
                            borderRadius: 12,
                            border: '2px solid #e5e7eb',
                          }}
                        />
                        {isEditing && !formData.image && (
                          <small style={{ display: 'block', marginTop: 8, color: '#6b7280' }}>
                            Current image shown. Upload a new image to replace it.
                          </small>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Modal footer */}
              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {isEditing ? 'Update' : 'Save'} Subject
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default AssessmentSubjects;