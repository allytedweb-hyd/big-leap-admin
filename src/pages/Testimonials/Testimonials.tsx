import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import { Search, Plus, ChevronLeft, ChevronRight, X, Trash2, Edit, Star } from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

const COLORS = [
  { label: 'Blue', value: '4285F4' },
  { label: 'Pink', value: 'E91E63' },
  { label: 'Orange', value: 'FF9800' },
  { label: 'Purple', value: '9C27B0' },
  { label: 'Cyan', value: '00BCD4' },
  { label: 'Green', value: '4CAF50' },
  { label: 'Red', value: 'F44336' },
  { label: 'Indigo', value: '3F51B5' },
];

interface Testimonial {
  _id: string;
  name: string;
  text: string;
  color: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = () => ({
  name: '',
  text: '',
  color: '4285F4',
  order: 0,
  isActive: true,
});

const Testimonials: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [filtered, setFiltered] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { fetchTestimonials(); }, []);
  useEffect(() => { applyFilter(); }, [testimonials, searchQuery]);

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/testimonials/all');
      setTestimonials(res.data?.testimonials || []);
    } catch (err) {
      toast.error('Failed to load testimonials');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    let data = [...testimonials];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((t) =>
        t.name.toLowerCase().includes(q) || t.text.toLowerCase().includes(q)
      );
    }
    setFiltered(data);
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(isEditing ? 'Updating...' : 'Saving...');
    try {
      if (isEditing && selectedId) {
        await httpClient.put(`/testimonials/${selectedId}`, formData);
        toast.success('Testimonial updated!', { id: loadingToast });
      } else {
        await httpClient.post('/testimonials', formData);
        toast.success('Testimonial added!', { id: loadingToast });
      }
      setShowModal(false);
      resetForm();
      fetchTestimonials();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this testimonial?')) return;
    const loadingToast = toast.loading('Deleting...');
    try {
      await httpClient.delete(`/testimonials/${id}`);
      toast.success('Deleted successfully!', { id: loadingToast });
      fetchTestimonials();
    } catch (err) {
      toast.error('Failed to delete', { id: loadingToast });
    }
  };

  const handleToggleActive = async (t: Testimonial) => {
    try {
      await httpClient.put(`/testimonials/${t._id}`, { ...t, isActive: !t.isActive });
      toast.success(`${!t.isActive ? 'Activated' : 'Deactivated'}`);
      fetchTestimonials();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const openEditModal = (t: Testimonial) => {
    setIsEditing(true);
    setSelectedId(t._id);
    setFormData({ name: t.name, text: t.text, color: t.color, order: t.order, isActive: t.isActive });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setIsEditing(false);
    setSelectedId(null);
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className={styles.employees}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Testimonials</h1>
          <p>Manage student testimonials shown on the website</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by name or review..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <button className={styles.clearFiltersBtn} onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>
          <button className={styles.addBtn} onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={18} /> Add Testimonial
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total:</span>
          <span className={styles.statValue}>{testimonials.length}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Active:</span>
          <span className={styles.statValue}>{testimonials.filter((t) => t.isActive).length}</span>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Review</th>
              <th>Order</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                {searchQuery ? 'No results found' : 'No testimonials yet. Click "Add Testimonial" to create one.'}
              </td></tr>
            ) : paginated.map((t) => (
              <tr key={t._id}>
                <td>
                  <div className={styles.employeeCell}>
                    <div
                      className={styles.avatar}
                      style={{
                        background: `#${t.color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 14,
                        borderRadius: '50%', flexShrink: 0,
                      }}
                    >
                      {getInitials(t.name)}
                    </div>
                    <div className={styles.employeeInfo}>
                      <span className={styles.employeeName}>{t.name}</span>
                    </div>
                  </div>
                </td>
                <td style={{ maxWidth: 340, fontSize: 13, color: '#555' }}>
                  {t.text.length > 100 ? t.text.substring(0, 100) + '...' : t.text}
                </td>
                <td>
                  <span className={styles.orgBadge} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                    #{t.order}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handleToggleActive(t)}
                    className={styles.orgBadge}
                    style={{
                      background: t.isActive ? '#dcfce7' : '#fee2e2',
                      color: t.isActive ? '#16a34a' : '#dc2626',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {t.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <Edit size={18} onClick={() => openEditModal(t)} className={styles.editIcon} title="Edit" />
                    <Trash2 size={18} onClick={() => handleDelete(t._id)} className={styles.deleteIcon} title="Delete" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
            </div>
            <div className={styles.paginationControls}>
              <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                <ChevronLeft size={16} />
              </button>
              <button className={`${styles.pageBtn} ${styles.active}`}>{currentPage}</button>
              <button className={styles.pageBtn} disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 620, width: '95vw' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Star size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} Testimonial
              </h2>
              <X size={20} onClick={() => setShowModal(false)} style={{ cursor: 'pointer' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className={styles.formGrid}>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Student Name <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      placeholder="e.g. Ravi Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Avatar Color</label>
                    <select
                      className={styles.formSelect}
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    >
                      {COLORS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>Review Text <span style={{ color: 'red' }}>*</span></label>
                    <textarea
                      className={styles.formInput}
                      required
                      rows={4}
                      placeholder="Write the student's testimonial here..."
                      value={formData.text}
                      onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Display Order</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      min={0}
                      placeholder="0"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    />
                    <small style={{ color: '#6b7280', marginTop: 4, display: 'block' }}>Lower = shown first</small>
                  </div>

                  <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 24 }}>
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <label htmlFor="isActive" className={styles.formLabel} style={{ margin: 0, cursor: 'pointer' }}>
                      Show on website (Active)
                    </label>
                  </div>

                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">{isEditing ? 'Update' : 'Save'} Testimonial</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Testimonials;