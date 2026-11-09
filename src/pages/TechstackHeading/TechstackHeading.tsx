import React, { useState, useEffect, useRef } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, Code2, GripVertical, Save,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';
  import { useNavigate } from 'react-router-dom';
interface TechStackHeading {
  _id: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = () => ({ name: '' });

const TechStackHeadings: React.FC = () => {
  const [techStacks, setTechStacks] = useState<TechStackHeading[]>([]);
  const [filteredTechStacks, setFilteredTechStacks] = useState<TechStackHeading[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm());

  // Reorder mode state
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderedList, setReorderedList] = useState<TechStackHeading[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
 const navigate = useNavigate();
  // Drag state
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  useEffect(() => { fetchTechStacks(); }, []);
  useEffect(() => { filterTechStacks(); }, [techStacks, searchQuery]);

  const fetchTechStacks = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/techstacks-heading');
      const data: TechStackHeading[] = res.data?.headings || [];
      setTechStacks(data);
      setReorderedList([...data]);
    } catch {
      toast.error('Failed to load tech stack headings');
    } finally {
      setLoading(false);
    }
  };

  const filterTechStacks = () => {
    let filtered = [...techStacks];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(ts => ts.name.toLowerCase().includes(q));
    }
    setFilteredTechStacks(filtered);
    setCurrentPage(1);
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = () => {
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    if (from === null || to === null || from === to) return;

    const updated = [...reorderedList];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);

    // Re-assign order values
    const withOrder = updated.map((item, i) => ({ ...item, order: i }));
    setReorderedList(withOrder);
    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    const loadingToast = toast.loading('Saving order...');
    try {
      const items = reorderedList.map((item, index) => ({
        _id: item._id,
        order: index,
      }));
      await httpClient.put('/techstacks-heading/reorder', { items });
      toast.success('Order saved successfully!', { id: loadingToast });
      setReorderMode(false);
      fetchTechStacks();
    } catch {
      toast.error('Failed to save order', { id: loadingToast });
    } finally {
      setSavingOrder(false);
    }
  };

  const handleCancelReorder = () => {
    setReorderedList([...techStacks]);
    setReorderMode(false);
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(isEditing ? 'Updating heading...' : 'Creating heading...');
    try {
      if (isEditing && selectedId) {
        await httpClient.put(`/techstacks-heading/${selectedId}`, formData);
        toast.success('Heading updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/techstacks-heading', formData);
        toast.success('Heading created successfully!', { id: loadingToast });
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
    const loadingToast = toast.loading('Deleting heading...');
    try {
      await httpClient.delete(`/techstacks-heading/${id}`);
      toast.success('Heading deleted successfully!', { id: loadingToast });
      fetchTechStacks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete heading', { id: loadingToast });
    }
  };

  const openEditModal = (ts: TechStackHeading) => {
    setIsEditing(true);
    setSelectedId(ts._id);
    setFormData({ name: ts.name });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setIsEditing(false);
    setSelectedId(null);
  };

  // ── Pagination ────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filteredTechStacks.length / itemsPerPage));
  const paginatedData = filteredTechStacks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const displayList = reorderMode ? reorderedList : paginatedData;

  return (
    <div className={styles.employees}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Tech Stack Headings</h1>
          <p>Manage category headings and their display order</p>
        </div>
        <div className={styles.toolbar}>
          {!reorderMode && (
            <div className={styles.filtersContainer}>
              <div className={styles.searchBox}>
                <Search size={18} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search by heading name..."
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
          )}

          {!reorderMode ? (
            <>
              <button
                className={styles.addBtn}
                style={{ background: '#7c3aed', marginRight: 8 }}
                onClick={() => setReorderMode(true)}
              >
                <GripVertical size={18} /> Manage Order
              </button>
              <button
                className={styles.addBtn}
                onClick={() => { resetForm(); setShowModal(true); }}
              >
                <Plus size={18} /> Add Heading
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.addBtn}
                style={{ background: '#6b7280', marginRight: 8 }}
                onClick={handleCancelReorder}
              >
                <X size={18} /> Cancel
              </button>
              <button
                className={styles.addBtn}
                style={{ background: '#059669' }}
                onClick={handleSaveOrder}
                disabled={savingOrder}
              >
                <Save size={18} /> Save Order
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reorder info banner */}
      {reorderMode && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fbbf24',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#92400e',
          fontSize: 14,
        }}>
          <GripVertical size={16} />
          <span>Drag and drop rows to reorder, then click <strong>Save Order</strong>.</span>
        </div>
      )}

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Headings:</span>
          <span className={styles.statValue}>{techStacks.length}</span>
        </div>
        {searchQuery && !reorderMode && (
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
              {reorderMode && <th style={{ width: 40 }}></th>}
              <th>Order</th>
              <th>Heading Name</th>
              <th>Created At</th>
              {!reorderMode && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={reorderMode ? 4 : 4} style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading headings...
                </td>
              </tr>
            ) : displayList.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {searchQuery ? 'No headings match your search' : 'No headings found. Click "Add Heading" to create one.'}
                </td>
              </tr>
            ) : displayList.map((ts, index) => (
        
  <tr
    key={ts._id}
    onClick={() => !reorderMode && navigate(`/tech-stack-headings/${ts._id}/tech-stacks`)}
    draggable={reorderMode}
    onDragStart={() => reorderMode && handleDragStart(index)}
    onDragOver={e => reorderMode && handleDragOver(e, index)}
    onDrop={() => reorderMode && handleDrop()}
    style={{
      cursor: reorderMode ? 'grab' : 'pointer',   // <-- pointer instead of default
      background: reorderMode ? (index % 2 === 0 ? '#f9fafb' : 'white') : undefined,
      transition: 'background 0.15s',
    }}
  >
                {/* Drag handle */}
                {reorderMode && (
                  <td style={{ color: '#9ca3af', textAlign: 'center' }}>
                    <GripVertical size={18} />
                  </td>
                )}

                {/* Order badge */}
                <td>
                  <span
                    className={styles.orgBadge}
                    style={{ background: '#e0e7ff', color: '#4338ca', minWidth: 32, display: 'inline-block', textAlign: 'center' }}
                  >
                    {reorderMode ? index + 1 : (ts.order ?? index) + 1}
                  </span>
                </td>

                {/* Name */}
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
                      <span className={styles.employeeName}>{ts.name}</span>
                      <span className={styles.employeeEmail}>ID: {ts._id.slice(-8)}</span>
                    </div>
                  </div>
                </td>

                {/* Date */}
                <td>
                  <div className={styles.deptText}>
                    {new Date(ts.createdAt).toLocaleDateString('en-IN')}
                  </div>
                  <div className={styles.roleText}>
                    {new Date(ts.createdAt).toLocaleTimeString()}
                  </div>
                </td>

                {/* Actions — hidden in reorder mode */}
                {!reorderMode && (
                  <td>
                    <div className={styles.actionButtons}>
                    <Edit
     size={18}
     onClick={(e) => { e.stopPropagation(); openEditModal(ts); }}
     className={styles.editIcon}
     title="Edit Heading"
   />
   <Trash2
     size={18}
     onClick={(e) => { e.stopPropagation(); handleDelete(ts._id, ts.name); }}
    className={styles.deleteIcon}
     title="Delete Heading"
   />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination — hidden in reorder mode */}
        {!reorderMode && filteredTechStacks.length > itemsPerPage && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredTechStacks.length)} of{' '}
              {filteredTechStacks.length} headings
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
                {isEditing ? 'Edit' : 'Add'} Heading
              </h2>
              <X size={20} onClick={() => { setShowModal(false); resetForm(); }} style={{ cursor: 'pointer' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Heading Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      placeholder="e.g., Big Data Processing, Cloud Computing"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                    <small style={{ color: '#6b7280', marginTop: 4, display: 'block' }}>
                      Minimum 2 characters. New headings are added at the end of the order.
                    </small>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {isEditing ? 'Update' : 'Save'} Heading
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechStackHeadings;