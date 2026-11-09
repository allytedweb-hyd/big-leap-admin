import React, { useState, useEffect, useRef } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, Code2, GripVertical, Save,
  ArrowLeft, Layers, Upload, Image as ImageIcon,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TechStackHeading {
  _id: string;
  name: string;
  order: number;
}

interface TechStack {
  _id: string;
  techStack: string;
  logoImg: string;
  order: number;
  techStackHeadingId: TechStackHeading;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  techStack: string;
  techStackHeadingId: string;
  logoImg: File | null;
}

const emptyForm = (headingId: string): FormData => ({
  techStack: '',
  techStackHeadingId: headingId,
  logoImg: null,
});

// ─── Component ────────────────────────────────────────────────────────────────

const TechStacks: React.FC = () => {
  const { headingId } = useParams<{ headingId: string }>();
  const navigate = useNavigate();

  const [techStacks, setTechStacks] = useState<TechStack[]>([]);
  const [filteredTechStacks, setFilteredTechStacks] = useState<TechStack[]>([]);
  const [heading, setHeading] = useState<TechStackHeading | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm(headingId || ''));
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reorder
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderedList, setReorderedList] = useState<TechStack[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Drag refs
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Logo base URL ──────────────────────────────────────────────────────────
  // Adjust this to your actual uploads path
  const LOGO_BASE_URL = `${import.meta.env.VITE_IMG_URL || ''}/techstacks/`;

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (headingId) {
      fetchHeading();
      fetchTechStacks();
    }
  }, [headingId]);

  useEffect(() => {
    filterTechStacks();
  }, [techStacks, searchQuery]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchHeading = async () => {
    try {
      const res = await httpClient.get(`/techstacks-heading/${headingId}`);
      setHeading(res.data?.heading || null);
    } catch {
      // non-critical; heading name is shown from first item otherwise
    }
  };

  const fetchTechStacks = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get(`/techstacks/by-heading/${headingId}`);
      const data: TechStack[] = res.data?.techStacks || [];
      setTechStacks(data);
      setReorderedList([...data]);
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
      filtered = filtered.filter(ts => ts.techStack.toLowerCase().includes(q));
    }
    setFilteredTechStacks(filtered);
    setCurrentPage(1);
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────────

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

    setReorderedList(updated.map((item, i) => ({ ...item, order: i })));
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
      await httpClient.put('/techstacks/reorder', { items });
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

  // ── Logo file handling ─────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, logoImg: file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing && !formData.logoImg) {
      toast.error('Please upload a logo image.');
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading(isEditing ? 'Updating tech stack...' : 'Creating tech stack...');

    try {
      const payload = new FormData();
      payload.append('techStack', formData.techStack);
      payload.append('techStackHeadingId', formData.techStackHeadingId);
      if (formData.logoImg) payload.append('logoImg', formData.logoImg);

      if (isEditing && selectedId) {
        await httpClient.put(`/techstacks/${selectedId}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Tech stack updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/techstacks', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Tech stack created successfully!', { id: loadingToast });
      }

      setShowModal(false);
      resetForm();
      fetchTechStacks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    const loadingToast = toast.loading('Deleting tech stack...');
    try {
      await httpClient.delete(`/techstacks/${id}`);
      toast.success('Tech stack deleted successfully!', { id: loadingToast });
      fetchTechStacks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete tech stack', { id: loadingToast });
    }
  };

  const openEditModal = (ts: TechStack) => {
    setIsEditing(true);
    setSelectedId(ts._id);
    setFormData({
      techStack: ts.techStack,
      techStackHeadingId: ts.techStackHeadingId?._id || headingId || '',
      logoImg: null,
    });
    setLogoPreview(LOGO_BASE_URL + ts.logoImg);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyForm(headingId || ''));
    setLogoPreview(null);
    setIsEditing(false);
    setSelectedId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filteredTechStacks.length / itemsPerPage));
  const paginatedData = filteredTechStacks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const displayList = reorderMode ? reorderedList : paginatedData;

  // Derive heading name
  const headingName =
    heading?.name ||
    techStacks[0]?.techStackHeadingId?.name ||
    'Tech Stack';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.employees}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: '#6366f1',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 6,
              padding: 0,
            }}
          >
            <ArrowLeft size={16} /> Back to Headings
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={22} style={{ color: '#6366f1' }} />
            {headingName}
          </h1>
          <p>Manage tech stacks under this heading</p>
        </div>

        <div className={styles.toolbar}>
          {!reorderMode && (
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
                <Plus size={18} /> Add Tech Stack
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

      {/* Reorder banner */}
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
          <span className={styles.statLabel}>Total Tech Stacks:</span>
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
              <th>Logo</th>
              <th>Tech Stack</th>
              <th>Created At</th>
              {!reorderMode && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={reorderMode ? 5 : 6} style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading tech stacks...
                </td>
              </tr>
            ) : displayList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {searchQuery
                    ? 'No tech stacks match your search'
                    : 'No tech stacks found. Click "Add Tech Stack" to create one.'}
                </td>
              </tr>
            ) : displayList.map((ts, index) => (
              <tr
                key={ts._id}
                draggable={reorderMode}
                onDragStart={() => reorderMode && handleDragStart(index)}
                onDragOver={e => reorderMode && handleDragOver(e, index)}
                onDrop={() => reorderMode && handleDrop()}
                style={{
                  cursor: reorderMode ? 'grab' : 'default',
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

                {/* Logo */}
                <td>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {ts.logoImg ? (
                      <img
                        src={LOGO_BASE_URL + ts.logoImg}
                        alt={ts.techStack}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon size={18} color="#9ca3af" />
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
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', borderRadius: '50%', flexShrink: 0,
                      }}
                    >
                      <Code2 size={16} />
                    </div>
                    <div className={styles.employeeInfo}>
                      <span className={styles.employeeName}>{ts.techStack}</span>
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

                {/* Actions */}
                {!reorderMode && (
                  <td>
                    <div className={styles.actionButtons}>
                      <Edit
                        size={18}
                        onClick={() => openEditModal(ts)}
                        className={styles.editIcon}
                        title="Edit Tech Stack"
                      />
                      <Trash2
                        size={18}
                        onClick={() => handleDelete(ts._id, ts.techStack)}
                        className={styles.deleteIcon}
                        title="Delete Tech Stack"
                      />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {!reorderMode && filteredTechStacks.length > itemsPerPage && (
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
          <div className={styles.modal} style={{ maxWidth: 560, width: '95vw' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Code2 size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} Tech Stack
              </h2>
              <X
                size={20}
                onClick={() => { setShowModal(false); resetForm(); }}
                style={{ cursor: 'pointer' }}
              />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
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
                      placeholder="e.g., React, Node.js, PostgreSQL"
                      value={formData.techStack}
                      onChange={e => setFormData({ ...formData, techStack: e.target.value })}
                    />
                    <small style={{ color: '#6b7280', marginTop: 4, display: 'block' }}>
                      Minimum 2 characters. Must be unique across all tech stacks.
                    </small>
                  </div>

                  {/* Logo Upload */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Logo Image {!isEditing && <span style={{ color: 'red' }}>*</span>}
                      {isEditing && <span style={{ color: '#6b7280', fontWeight: 400 }}> (leave blank to keep current)</span>}
                    </label>

                    {/* Logo preview */}
                    {logoPreview && (
                      <div style={{
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}>
                        <div style={{
                          width: 64,
                          height: 64,
                          borderRadius: 10,
                          border: '1px solid #e5e7eb',
                          background: '#f9fafb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}>
                          <img
                            src={logoPreview}
                            alt="Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>
                          {formData.logoImg ? formData.logoImg.name : 'Current logo'}
                        </span>
                      </div>
                    )}

                    {/* Upload area */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed #d1d5db',
                        borderRadius: 8,
                        padding: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        color: '#6b7280',
                        fontSize: 14,
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '#d1d5db')}
                    >
                      <Upload size={18} />
                      <span>Click to upload logo (JPEG, PNG, SVG, WebP — max 5 MB)</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </div>

                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
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