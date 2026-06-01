import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, UserRound, Image as ImageIcon, Phone, Mail,
} from 'lucide-react';
import { httpClient, imgUrl } from '../../lib/httpClient';
import toast from 'react-hot-toast';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Trainer {
  _id: string;
  trainerName: string;
  email: string;
  mobileNumber: string;
  profileImage: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Empty form factory ───────────────────────────────────────────────────────

const emptyForm = () => ({
  trainerName: '',
  email: '',
  mobileNumber: '',
  profileImage: null as File | null,
});

// ─── Component ────────────────────────────────────────────────────────────────

const Trainers: React.FC = () => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [filteredTrainers, setFilteredTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchTrainers();
  }, []);

  useEffect(() => {
    filterTrainers();
  }, [trainers, searchQuery]);

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchTrainers = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/trainers');
      setTrainers(res.data?.trainers || []);
    } catch {
      toast.error('Failed to load trainers');
    } finally {
      setLoading(false);
    }
  };

  // ─── Filtering ────────────────────────────────────────────────────────────

  const filterTrainers = () => {
    let filtered = [...trainers];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.trainerName.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.mobileNumber.includes(q),
      );
    }

    setFilteredTrainers(filtered);
    setCurrentPage(1);
  };

  // ─── Image handling ───────────────────────────────────────────────────────

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files are allowed (JPEG, PNG, GIF, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setFormData(prev => ({ ...prev, profileImage: file }));
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ─── Form submit ──────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.trainerName.trim()) {
      toast.error('Please enter trainer name');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Please enter email');
      return;
    }
    if (!formData.mobileNumber.trim()) {
      toast.error('Please enter mobile number');
      return;
    }

    const loadingToast = toast.loading(
      isEditing ? 'Updating trainer...' : 'Creating trainer...',
    );

    try {
      const submitData = new FormData();
      submitData.append('trainerName', formData.trainerName.trim());
      submitData.append('email', formData.email.trim());
      submitData.append('mobileNumber', formData.mobileNumber.trim());
      if (formData.profileImage) {
        submitData.append('profileImage', formData.profileImage);
      }

      if (isEditing && selectedId) {
        await httpClient.put(`/trainers/${selectedId}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Trainer updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/trainers', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Trainer created successfully!', { id: loadingToast });
      }

      setShowModal(false);
      resetForm();
      fetchTrainers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', { id: loadingToast });
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    const loadingToast = toast.loading('Deleting trainer...');
    try {
      await httpClient.delete(`/trainers/${id}`);
      toast.success('Trainer deleted successfully!', { id: loadingToast });
      fetchTrainers();
    } catch {
      toast.error('Failed to delete trainer', { id: loadingToast });
    }
  };

  // ─── Open edit modal ──────────────────────────────────────────────────────

  const openEditModal = (trainer: Trainer) => {
    setIsEditing(true);
    setSelectedId(trainer._id);
    setFormData({
      trainerName: trainer.trainerName,
      email: trainer.email,
      mobileNumber: trainer.mobileNumber,
      profileImage: null,
    });
    setPreviewImage(
      trainer.profileImage ? `${imgUrl}/trainers/${trainer.profileImage}` : null,
    );
    setShowModal(true);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData(emptyForm());
    setPreviewImage(null);
    setIsEditing(false);
    setSelectedId(null);
  };

  const getImageUrl = (profileImage: string) =>
    `${imgUrl}/trainers/${profileImage}`;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  // ─── Pagination ───────────────────────────────────────────────────────────

  const hasFilters = !!searchQuery;
  const totalPages = Math.max(1, Math.ceil(filteredTrainers.length / itemsPerPage));
  const paginatedData = filteredTrainers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.employees}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Trainers</h1>
          <p>Manage trainers, their contact info and profile images</p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            {/* Search */}
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
            <Plus size={18} /> Add Trainer
          </button>
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Trainers:</span>
          <span className={styles.statValue}>{trainers.length}</span>
        </div>
        {hasFilters && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredTrainers.length}</span>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Profile</th>
              <th>Trainer Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    <span className="ml-2">Loading trainers...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {hasFilters
                    ? 'No trainers match your search'
                    : 'No trainers found. Click "Add Trainer" to create one.'}
                </td>
              </tr>
            ) : (
              paginatedData.map((trainer, index) => (
                <tr key={trainer._id}>

                  {/* # */}
                  <td>
                    <span
                      className={styles.orgBadge}
                      style={{ background: '#e0e7ff', color: '#4338ca' }}
                    >
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </span>
                  </td>

                  {/* Profile Image */}
                  <td>
                    <div className={styles.avatar}>
                      {trainer.profileImage ? (
                        <img
                          src={getImageUrl(trainer.profileImage)}
                          alt={trainer.trainerName}
                          style={{
                            width: '40px',
                            height: '40px',
                            objectFit: 'cover',
                            borderRadius: '50%',
                          }}
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(trainer.trainerName)}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Name */}
                  <td>
                    <div className={styles.employeeCell}>
                      <div
                        className={styles.avatar}
                        style={{
                          background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          borderRadius: '50%',
                          flexShrink: 0,
                        }}
                      >
                        <UserRound size={16} />
                      </div>
                      <div className={styles.employeeInfo}>
                        <span className={styles.employeeName}>{trainer.trainerName}</span>
                        <span className={styles.employeeEmail}>
                          ID: {trainer._id.slice(-8)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td>
                    <div className={styles.employeeCell}>
                      <Mail size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                      <span className={styles.deptText} style={{ marginLeft: 6 }}>
                        {trainer.email}
                      </span>
                    </div>
                  </td>

                  {/* Mobile */}
                  <td>
                    <div className={styles.employeeCell}>
                      <Phone size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                      <span className={styles.deptText} style={{ marginLeft: 6 }}>
                        {trainer.mobileNumber}
                      </span>
                    </div>
                  </td>

                  {/* Date */}
                  <td>
                    <div className={styles.deptText}>
                      {new Date(trainer.createdAt).toLocaleDateString('en-IN')}
                    </div>
                    <div className={styles.roleText}>
                      {new Date(trainer.createdAt).toLocaleTimeString()}
                    </div>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className={styles.actionButtons}>
                      <Edit
                        size={18}
                        onClick={() => openEditModal(trainer)}
                        className={styles.editIcon}
                        title="Edit Trainer"
                      />
                      <Trash2
                        size={18}
                        onClick={() => handleDelete(trainer._id, trainer.trainerName)}
                        className={styles.deleteIcon}
                        title="Delete Trainer"
                      />
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredTrainers.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredTrainers.length)} of{' '}
              {filteredTrainers.length} trainers
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
          <div className={styles.modal} style={{ maxWidth: 560, width: '95vw' }}>

            {/* Modal header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <UserRound size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} Trainer
              </h2>
              <X
                size={20}
                onClick={() => { setShowModal(false); resetForm(); }}
                style={{ cursor: 'pointer' }}
              />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className={styles.formGrid}>

                  {/* ── Trainer Name ─────────────────────────────────────── */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Trainer Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      placeholder="e.g., Rahul Sharma"
                      value={formData.trainerName}
                      onChange={e => setFormData({ ...formData, trainerName: e.target.value })}
                    />
                  </div>

                  {/* ── Email ────────────────────────────────────────────── */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Email <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="email"
                      className={styles.formInput}
                      required
                      placeholder="e.g., rahul@example.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  {/* ── Mobile ───────────────────────────────────────────── */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Mobile Number <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      className={styles.formInput}
                      required
                      placeholder="e.g., +919876543210"
                      value={formData.mobileNumber}
                      onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                    />
                    <small style={{ color: '#6b7280', marginTop: 4, display: 'block' }}>
                      Include country code, e.g. +91 for India
                    </small>
                  </div>

                  {/* ── Profile Image ─────────────────────────────────────── */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Profile Image{' '}
                      <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <div className={styles.imageUploadContainer}>
                      <input
                        type="file"
                        id="profileImage"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="profileImage" className={styles.uploadButton}>
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
                            width: '80px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '50%',
                            border: '2px solid #e5e7eb',
                          }}
                        />
                        {isEditing && !formData.profileImage && (
                          <small style={{ display: 'block', marginTop: 8, color: '#6b7280' }}>
                            Current photo shown. Upload a new image to replace it.
                          </small>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Modal footer */}
              <div className={styles.modalFooter}>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {isEditing ? 'Update' : 'Save'} Trainer
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default Trainers;