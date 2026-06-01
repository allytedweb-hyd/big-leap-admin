import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, Hash, Code2,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

interface TechStack {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = () => ({
  name: '',
});

const TechStacks: React.FC = () => {
  const [techStacks, setTechStacks] = useState<TechStack[]>([]);
  const [filteredTechStacks, setFilteredTechStacks] = useState<TechStack[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm());

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { fetchTechStacks(); }, []);
  useEffect(() => { filterTechStacks(); }, [techStacks, searchQuery]);

  const fetchTechStacks = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/techstacks-heading');
      setTechStacks(res.data?.techStacks || []);
    } catch {
      toast.error('Failed to load tech stacks');
    } finally {
      setLoading(false);
    }
  };

  const filterTechStacks = () => {
    let filtered = [...techStacks];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(ts =>
        ts.name.toLowerCase().includes(q)
      );
    }
    setFilteredTechStacks(filtered);
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(isEditing ? 'Updating tech stack...' : 'Creating tech stack...');
    try {
      if (isEditing && selectedId) {
        await httpClient.put(`/techstacks-heading/${selectedId}`, formData);
        toast.success('Tech stack updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/techstacks-heading', formData);
        toast.success('Tech stack created successfully!', { id: loadingToast });
      }
      setShowModal(false);
      resetForm();
      fetchTechStacks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', { id: loadingToast });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    const loadingToast = toast.loading('Deleting tech stack...');
    try {
      await httpClient.delete(`/techstacks/${id}`);
      toast.success('Tech stack deleted successfully!', { id: loadingToast });
      fetchTechStacks();
    } catch {
      toast.error('Failed to delete tech stack', { id: loadingToast });
    }
  };

  const openEditModal = (techStack: TechStack) => {
    setIsEditing(true);
    setSelectedId(techStack._id);
    setFormData({
      name: techStack.name,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setIsEditing(false);
    setSelectedId(null);
  };

  const totalPages = Math.max(1, Math.ceil(filteredTechStacks.length / itemsPerPage));
  const paginatedData = filteredTechStacks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className={styles.employees}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Tech Stacks</h1>
          <p>Manage technology stacks used in courses and projects</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by tech stack name..."
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
            <Plus size={18} /> Add Tech Stack
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Tech Stacks:</span>
          <span className={styles.statValue}>{techStacks.length}</span>
        </div>
        {searchQuery && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredTechStacks.length}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Tech Stack Name</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading tech stacks...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {searchQuery ? 'No tech stacks match your search' : 'No tech stacks found. Click "Add Tech Stack" to create one.'}
                </td>
              </tr>
            ) : paginatedData.map((techStack, index) => (
              <tr key={techStack._id}>
                <td>
                  <span className={styles.orgBadge} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </span>
                </td>
                <td>
                  <div className={styles.employeeCell}>
                    <div
                      className={styles.avatar}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', borderRadius: '50%', flexShrink: 0,
                      }}
                    >
                      <Code2 size={16} />
                    </div>
                    <div className={styles.employeeInfo}>
                      <span className={styles.employeeName}>{techStack.name}</span>
                      <span className={styles.employeeEmail}>
                        ID: {techStack._id.slice(-8)}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.deptText}>
                    {new Date(techStack.createdAt).toLocaleDateString('en-IN')}
                  </div>
                  <div className={styles.roleText}>
                    {new Date(techStack.createdAt).toLocaleTimeString()}
                  </div>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <Edit
                      size={18}
                      onClick={() => openEditModal(techStack)}
                      className={styles.editIcon}
                      title="Edit Tech Stack"
                    />
                    <Trash2
                      size={18}
                      onClick={() => handleDelete(techStack._id, techStack.name)}
                      className={styles.deleteIcon}
                      title="Delete Tech Stack"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTechStacks.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredTechStacks.length)} of{' '}
              {filteredTechStacks.length} tech stacks
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

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 540, width: '95vw' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Code2 size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} Tech Stack
              </h2>
              <X size={20} onClick={() => setShowModal(false)} style={{ cursor: 'pointer' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <div className={styles.formGrid}>

                  {/* Tech Stack Name */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Tech Stack Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      placeholder="e.g., React, Node.js, Python, MongoDB"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                    <small style={{ color: '#6b7280', marginTop: 4, display: 'block' }}>
                      Enter a technology name (minimum 2 characters)
                    </small>
                  </div>

                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {isEditing ? 'Update' : 'Save'} Tech Stack
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechStacks;