import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, Filter, Calendar, Clock, Video, BookOpen, ListChecks,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_OPTIONS = ['Zoom', 'Google Meet', 'Microsoft Teams', 'YouTube', 'Other'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Workshop {
  _id: string;
  workshopHeading: string;
  date: string;
  time: string;
  platform: string;
  whatYouWillLearn: string[];
  createdAt: string;
  updatedAt: string;
}

const emptyForm = () => ({
  workshopHeading: '',
  date: '',
  time: '',
  platform: '',
  whatYouWillLearn: [''],
});

// ─── Component ────────────────────────────────────────────────────────────────

const Workshops: React.FC = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [filteredWorkshops, setFilteredWorkshops] = useState<Workshop[]>([]);

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [formData, setFormData] = useState(emptyForm());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { fetchWorkshops(); }, []);
  useEffect(() => { filterWorkshops(); }, [workshops, searchQuery, filterPlatform]);

  // ─── API ──────────────────────────────────────────────────────────────────

  const fetchWorkshops = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/workshops');
      setWorkshops(res.data?.workshops || []);
    } catch {
      toast.error('Failed to load workshops');
    } finally {
      setLoading(false);
    }
  };

  // ─── Filter ───────────────────────────────────────────────────────────────

  const filterWorkshops = () => {
    let filtered = [...workshops];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(w =>
        w.workshopHeading.toLowerCase().includes(q) ||
        w.platform.toLowerCase().includes(q) ||
        w.whatYouWillLearn.some(item => item.toLowerCase().includes(q))
      );
    }
    if (filterPlatform) filtered = filtered.filter(w => w.platform === filterPlatform);
    setFilteredWorkshops(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterPlatform('');
  };

  const hasFilters = searchQuery || filterPlatform;

  // ─── Handle Learning Points ───────────────────────────────────────────────

  const handleLearningPointChange = (index: number, value: string) => {
    const updated = [...formData.whatYouWillLearn];
    updated[index] = value;
    setFormData({ ...formData, whatYouWillLearn: updated });
  };

  const addLearningPoint = () => {
    setFormData({
      ...formData,
      whatYouWillLearn: [...formData.whatYouWillLearn, ''],
    });
  };

  const removeLearningPoint = (index: number) => {
    if (formData.whatYouWillLearn.length === 1) {
      toast.error('At least one learning point is required');
      return;
    }
    const updated = formData.whatYouWillLearn.filter((_, i) => i !== index);
    setFormData({ ...formData, whatYouWillLearn: updated });
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate learning points
    const validPoints = formData.whatYouWillLearn.filter(p => p.trim());
    if (validPoints.length === 0) {
      toast.error('Please add at least one learning point');
      return;
    }

    const payload = {
      ...formData,
      whatYouWillLearn: validPoints,
    };

    const loadingToast = toast.loading(isEditing ? 'Updating workshop...' : 'Creating workshop...');

    try {
      if (isEditing && selectedId) {
        await httpClient.put(`/workshops/${selectedId}`, payload);
        toast.success('Workshop updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/workshops', payload);
        toast.success('Workshop created successfully!', { id: loadingToast });
      }
      setShowModal(false);
      resetForm();
      fetchWorkshops();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', { id: loadingToast });
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this workshop?')) return;
    const loadingToast = toast.loading('Deleting workshop...');
    try {
      await httpClient.delete(`/workshops/${id}`);
      toast.success('Workshop deleted successfully!', { id: loadingToast });
      fetchWorkshops();
    } catch {
      toast.error('Failed to delete workshop', { id: loadingToast });
    }
  };

  // ─── Edit ─────────────────────────────────────────────────────────────────

  const openEditModal = (workshop: Workshop) => {
    setIsEditing(true);
    setSelectedId(workshop._id);
    setFormData({
      workshopHeading: workshop.workshopHeading,
      date: workshop.date,
      time: workshop.time,
      platform: workshop.platform,
      whatYouWillLearn: workshop.whatYouWillLearn.length ? workshop.whatYouWillLearn : [''],
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setIsEditing(false);
    setSelectedId(null);
  };

  // ─── Pagination ───────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filteredWorkshops.length / itemsPerPage));
  const paginatedData = filteredWorkshops.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'zoom': return <Video size={14} />;
      case 'google meet': return <Video size={14} />;
      default: return <Video size={14} />;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.employees}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Workshops</h1>
          <p>Manage workshops and training sessions</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by heading, platform or learning points..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.filterSelect}>
              <Filter size={18} className={styles.filterIcon} />
              <select
                value={filterPlatform}
                onChange={e => setFilterPlatform(e.target.value)}
                className={styles.orgSelect}
              >
                <option value="">All Platforms</option>
                {PLATFORM_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
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
            <Plus size={18} /> Add Workshop
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Workshops:</span>
          <span className={styles.statValue}>{workshops.length}</span>
        </div>
        {hasFilters && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredWorkshops.length}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Workshop</th>
              <th>Date & Time</th>
              <th>Platform</th>
              <th>What You'll Learn</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    <span className="ml-2">Loading workshops...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="text-gray-500">
                    {hasFilters ? 'No workshops match the current filters' : 'No workshops found'}
                  </div>
                </td>
              </tr>
            ) : paginatedData.map(workshop => (
              <tr key={workshop._id}>
                <td>
                  <div className={styles.employeeCell}>
                    <div
                      className={styles.avatar}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
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
                      <BookOpen size={16} />
                    </div>
                    <div className={styles.employeeInfo}>
                      <span className={styles.employeeName}>{workshop.workshopHeading}</span>
                      <span className={styles.employeeEmail}>
                        Created: {new Date(workshop.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.deptText}>
                    <Calendar size={14} style={{ display: 'inline', marginRight: 6 }} />
                    {formatDate(workshop.date)}
                  </div>
                  <div className={styles.roleText}>
                    <Clock size={14} style={{ display: 'inline', marginRight: 6 }} />
                    {workshop.time}
                  </div>
                </td>
                <td>
                  <span className={styles.orgBadge} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                    {getPlatformIcon(workshop.platform)} {workshop.platform}
                  </span>
                </td>
                <td>
                  <div className={styles.deptText}>
                    {workshop.whatYouWillLearn.slice(0, 2).map((point, idx) => (
                      <div key={idx} style={{ fontSize: 12, marginBottom: 2 }}>
                        • {point.length > 40 ? point.substring(0, 40) + '...' : point}
                      </div>
                    ))}
                    {workshop.whatYouWillLearn.length > 2 && (
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        +{workshop.whatYouWillLearn.length - 2} more
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <Edit
                      size={18}
                      onClick={() => openEditModal(workshop)}
                      className={styles.editIcon}
                      title="Edit Workshop"
                    />
                    <Trash2
                      size={18}
                      onClick={() => handleDelete(workshop._id)}
                      className={styles.deleteIcon}
                      title="Delete Workshop"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredWorkshops.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredWorkshops.length)} of{' '}
              {filteredWorkshops.length} workshops
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
          <div className={styles.modal} style={{ maxWidth: 760, width: '95vw' }}>

            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <BookOpen size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} Workshop
              </h2>
              <X size={20} onClick={() => setShowModal(false)} style={{ cursor: 'pointer' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ maxHeight: '74vh', overflowY: 'auto' }}>
                <div className={styles.formGrid}>

                  {/* ── Workshop Heading ── */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Workshop Heading <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      placeholder="e.g., Mastering React & Next.js"
                      value={formData.workshopHeading}
                      onChange={e => setFormData({ ...formData, workshopHeading: e.target.value })}
                    />
                  </div>

                  {/* ── Date and Time ── */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Date <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className={styles.formInput}
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Time <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="time"
                      className={styles.formInput}
                      required
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>

                  {/* ── Platform ── */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Platform <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      className={styles.formSelect}
                      required
                      value={formData.platform}
                      onChange={e => setFormData({ ...formData, platform: e.target.value })}
                    >
                      <option value="">Select Platform</option>
                      {PLATFORM_OPTIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* ── What You Will Learn ── */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      What You'll Learn <span style={{ color: 'red' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {formData.whatYouWillLearn.map((point, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <ListChecks size={18} style={{ color: '#6b7280', flexShrink: 0 }} />
                          <input
                            type="text"
                            className={styles.formInput}
                            required={idx === 0}
                            placeholder={`Learning point ${idx + 1}`}
                            value={point}
                            onChange={e => handleLearningPointChange(idx, e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => removeLearningPoint(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#ef4444',
                              padding: 8,
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addLearningPoint}
                        style={{
                          background: 'none',
                          border: '1px dashed #cbd5e1',
                          borderRadius: 8,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          color: '#6366f1',
                          fontSize: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                      >
                        <Plus size={16} /> Add another learning point
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
                  {isEditing ? 'Update' : 'Save'} Workshop
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default Workshops;