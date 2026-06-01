import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, Code2,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

interface Technology {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = () => ({
  name: '',
});

// Consistent color per technology name (for avatar gradient)
const getGradient = (name: string) => {
  const gradients = [
    'linear-gradient(135deg, #6366f1, #4338ca)',
    'linear-gradient(135deg, #0ea5e9, #0369a1)',
    'linear-gradient(135deg, #10b981, #047857)',
    'linear-gradient(135deg, #f59e0b, #b45309)',
    'linear-gradient(135deg, #ef4444, #b91c1c)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #ec4899, #be185d)',
    'linear-gradient(135deg, #14b8a6, #0f766e)',
  ];
  const index = name.charCodeAt(0) % gradients.length;
  return gradients[index];
};

const TechnologyPage: React.FC = () => {
  const [technologies, setTechnologies]       = useState<Technology[]>([]);
  const [filteredTechs, setFilteredTechs]     = useState<Technology[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');

  const [showModal, setShowModal]             = useState(false);
  const [isEditing, setIsEditing]             = useState(false);
  const [selectedId, setSelectedId]           = useState<string | null>(null);
  const [formData, setFormData]               = useState(emptyForm());

  const [currentPage, setCurrentPage]         = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { fetchTechnologies(); }, []);
  useEffect(() => { filterTechnologies(); }, [technologies, searchQuery]);

  const fetchTechnologies = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/technologies');
      setTechnologies(res.data?.technologies || []);
    } catch {
      toast.error('Failed to load technologies');
    } finally {
      setLoading(false);
    }
  };

  const filterTechnologies = () => {
    let filtered = [...technologies];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.name.toLowerCase().includes(q));
    }
    setFilteredTechs(filtered);
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(isEditing ? 'Updating technology...' : 'Creating technology...');
    try {
      if (isEditing && selectedId) {
        await httpClient.put(`/technologies/${selectedId}`, formData);
        toast.success('Technology updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/technologies', formData);
        toast.success('Technology created successfully!', { id: loadingToast });
      }
      setShowModal(false);
      resetForm();
      fetchTechnologies();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this technology?')) return;
    const loadingToast = toast.loading('Deleting technology...');
    try {
      await httpClient.delete(`/technologies/${id}`);
      toast.success('Technology deleted successfully!', { id: loadingToast });
      fetchTechnologies();
    } catch {
      toast.error('Failed to delete technology', { id: loadingToast });
    }
  };

  const openEditModal = (tech: Technology) => {
    setIsEditing(true);
    setSelectedId(tech._id);
    setFormData({ name: tech.name });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setIsEditing(false);
    setSelectedId(null);
  };

  const totalPages  = Math.max(1, Math.ceil(filteredTechs.length / itemsPerPage));
  const paginatedData = filteredTechs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className={styles.employees}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Technologies</h1>
          <p>Manage technologies displayed across the platform</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by technology name..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <button className={styles.clearFiltersBtn} onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>
          <button
            className={styles.addBtn}
            onClick={() => { resetForm(); setShowModal(true); }}
          >
            <Plus size={18} /> Add Technology
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Technologies:</span>
          <span className={styles.statValue}>{technologies.length}</span>
        </div>
        {searchQuery && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredTechs.length}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Technology</th>
              <th>Added On</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading technologies...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {searchQuery
                    ? 'No technologies match your search'
                    : 'No technologies found. Click "Add Technology" to create one.'}
                </td>
              </tr>
            ) : paginatedData.map((tech, idx) => (
              <tr key={tech._id}>
                <td>
                  <span className={styles.orgBadge} style={{ background: '#f1f5f9', color: '#475569' }}>
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </span>
                </td>
                <td>
                  <div className={styles.employeeCell}>
                    <div
                      className={styles.avatar}
                      style={{
                        background: getGradient(tech.name),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', borderRadius: '50%', flexShrink: 0,
                        fontWeight: 700, fontSize: 14,
                      }}
                    >
                      {tech.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.employeeInfo}>
                      <span className={styles.employeeName}>{tech.name}</span>
                      <span className={styles.employeeEmail}>
                        ID: {tech._id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>
                    {new Date(tech.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>
                    {new Date(tech.updatedAt).toLocaleDateString()}
                  </span>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <Edit
                      size={18}
                      onClick={() => openEditModal(tech)}
                      className={styles.editIcon}
                      title="Edit Technology"
                    />
                    <Trash2
                      size={18}
                      onClick={() => handleDelete(tech._id)}
                      className={styles.deleteIcon}
                      title="Delete Technology"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTechs.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredTechs.length)} of{' '}
              {filteredTechs.length} technologies
            </div>
            <div className={styles.paginationControls}>
              <button
                className={styles.pageBtn}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button className={`${styles.pageBtn} ${styles.active}`}>{currentPage}</button>
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

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 480, width: '95vw' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Code2 size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} Technology
              </h2>
              <X size={20} onClick={() => setShowModal(false)} style={{ cursor: 'pointer' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>

                  {/* Name */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Technology Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      placeholder="e.g., React, Python, Docker..."
                      value={formData.name}
                      onChange={e => setFormData({ name: e.target.value })}
                      autoFocus
                    />
                    <small style={{ color: '#6b7280', marginTop: 4, display: 'block' }}>
                      Must be unique. Displayed as-is across the platform.
                    </small>
                  </div>

                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {isEditing ? 'Update' : 'Save'} Technology
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnologyPage;