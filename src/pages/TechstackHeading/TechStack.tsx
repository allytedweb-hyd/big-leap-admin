import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, Code2, Image as ImageIcon,
} from 'lucide-react';
import { httpClient ,imgUrl} from '../../lib/httpClient';
import toast from 'react-hot-toast';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface TechStackHeading {
  _id: string;
  name: string; // FIX: model uses "name", not "heading"
}

interface TechStack {
  _id: string;
  techStackHeadingId: TechStackHeading | string; // FIX: field is techStackHeadingId (populated or raw ObjectId)
  techStack: string;
  logoImg: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Empty form factory ───────────────────────────────────────────────────────

const emptyForm = () => ({
  techStackHeadingId: '', // FIX: consistent key everywhere — matches DB field name
  techStack: '',
  logoImg: null as File | null,
});

// ─── Component ───────────────────────────────────────────────────────────────

const TechStacks: React.FC = () => {
  const [techStacks, setTechStacks] = useState<TechStack[]>([]);
  const [filteredTechStacks, setFilteredTechStacks] = useState<TechStack[]>([]);
  const [techStackHeadings, setTechStackHeadings] = useState<TechStackHeading[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHeading, setFilterHeading] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

//   const imageBaseUrl = import.meta.env.VITE_IMG_URL;

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchTechStacks();
    fetchTechStackHeadings();
  }, []);

  useEffect(() => {
    filterTechStacks();
  }, [techStacks, searchQuery, filterHeading]);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchTechStacks = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/techstacks');
      // Backend must call .populate('techStackHeadingId') for the heading object to be embedded
      setTechStacks(res.data?.techStacks || []);
    } catch {
      toast.error('Failed to load tech stacks');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechStackHeadings = async () => {
    try {
      const res = await httpClient.get('/techstacks-heading');
      // API returns { techStacks: [...] } — same key as the main techstacks endpoint
      // Try both possible keys so this works regardless of what the backend returns
      const data = res.data;
      const headings =
        data?.headings ||      // if backend uses { headings: [] }
        data?.techStacks ||    // if backend uses { techStacks: [] }  ← your current API
        data?.data ||          // if backend uses { data: [] }
        [];
      setTechStackHeadings(headings);
    } catch (error) {
      console.error('Failed to load headings', error);
      toast.error('Failed to load categories');
    }
  };

  // ─── Filtering ─────────────────────────────────────────────────────────────

  const filterTechStacks = () => {
    let filtered = [...techStacks];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(ts => {
        const nameMatch = ts.techStack.toLowerCase().includes(q);
        // FIX: field is techStackHeadingId; populated object has .name (not .heading)
        const headingMatch =
          typeof ts.techStackHeadingId === 'object' &&
          (ts.techStackHeadingId as TechStackHeading).name.toLowerCase().includes(q);
        return nameMatch || headingMatch;
      });
    }

    if (filterHeading) {
      filtered = filtered.filter(ts => {
        // FIX: use techStackHeadingId, not techStackHeading
        const headingId =
          typeof ts.techStackHeadingId === 'object'
            ? (ts.techStackHeadingId as TechStackHeading)._id
            : ts.techStackHeadingId;
        return headingId === filterHeading;
      });
    }

    setFilteredTechStacks(filtered);
    setCurrentPage(1);
  };

  // ─── Image handling ────────────────────────────────────────────────────────

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files are allowed (JPEG, PNG, GIF, WEBP, SVG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setFormData(prev => ({ ...prev, logoImg: file }));

    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ─── Form submit ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // FIX: validate using the correct key
    if (!formData.techStackHeadingId) {
      toast.error('Please select a tech stack heading');
      return;
    }
    if (!formData.techStack.trim()) {
      toast.error('Please enter tech stack name');
      return;
    }
    if (!isEditing && !formData.logoImg) {
      toast.error('Please select a logo image');
      return;
    }

    const loadingToast = toast.loading(
      isEditing ? 'Updating tech stack...' : 'Creating tech stack...'
    );

    try {
      const submitData = new FormData();
      // FIX: append with the correct key that the backend model expects
      submitData.append('techStackHeadingId', formData.techStackHeadingId);
      submitData.append('techStack', formData.techStack.trim());
      if (formData.logoImg) {
        submitData.append('logoImg', formData.logoImg);
      }

      if (isEditing && selectedId) {
        await httpClient.put(`/techstacks/${selectedId}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Tech stack updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/techstacks', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Tech stack created successfully!', { id: loadingToast });
      }

      setShowModal(false);
      resetForm();
      fetchTechStacks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', { id: loadingToast });
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────

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

  // ─── Open edit modal ───────────────────────────────────────────────────────

  const openEditModal = (techStack: TechStack) => {
    setIsEditing(true);
    setSelectedId(techStack._id);

    // FIX: read from techStackHeadingId (not techStackHeading)
    const headingId =
      typeof techStack.techStackHeadingId === 'object'
        ? (techStack.techStackHeadingId as TechStackHeading)._id
        : techStack.techStackHeadingId;

    // FIX: set formData with correct key
    setFormData({
      techStackHeadingId: headingId,
      techStack: techStack.techStack,
      logoImg: null,
    });

      setPreviewImage(`${imgUrl}/techstacks/${techStack.logoImg}`);
    setShowModal(true);
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData(emptyForm());
    setPreviewImage(null);
    setIsEditing(false);
    setSelectedId(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterHeading('');
  };

  // FIX: getHeadingName reads .name (matches TechStackHeading model field)
  const getHeadingName = (techStack: TechStack): string => {
    if (typeof techStack.techStackHeadingId === 'object') {
      return (techStack.techStackHeadingId as TechStackHeading).name;
    }
    return 'Loading...';
  };

  const getImageUrl = (logoImg: string) =>
    `${imgUrl}/techstacks/${logoImg}`;

  // ─── Pagination ────────────────────────────────────────────────────────────

  const hasFilters = searchQuery || filterHeading;
  const totalPages = Math.max(1, Math.ceil(filteredTechStacks.length / itemsPerPage));
  const paginatedData = filteredTechStacks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.employees}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Tech Stacks</h1>
          <p>Manage technology stacks with logos and headings</p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            {/* Search */}
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

            {/* Filter by heading */}
            <div className={styles.filterSelect}>
              <select
                value={filterHeading}
                onChange={e => setFilterHeading(e.target.value)}
                className={styles.orgSelect}
              >
                <option value="">All Headings</option>
                {/* FIX: render heading.name (not heading.heading) */}
                {techStackHeadings.map(heading => (
                  <option key={heading._id} value={heading._id}>
                    {heading.name}
                  </option>
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
            <Plus size={18} /> Add Tech Stack
          </button>
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Tech Stacks:</span>
          <span className={styles.statValue}>{techStacks.length}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Categories:</span>
          <span className={styles.statValue}>{techStackHeadings.length}</span>
        </div>
        {hasFilters && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredTechStacks.length}</span>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Logo</th>
              <th>Tech Stack Name</th>
              <th>Category</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    <span className="ml-2">Loading tech stacks...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {hasFilters
                    ? 'No tech stacks match your filters'
                    : 'No tech stacks found. Click "Add Tech Stack" to create one.'}
                </td>
              </tr>
            ) : (
              paginatedData.map((techStack, index) => (
                <tr key={techStack._id}>
                  {/* # */}
                  <td>
                    <span className={styles.orgBadge} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </span>
                  </td>

                  {/* Logo */}
                  <td>
                    <div className={styles.avatar}>
                      <img
                        src={getImageUrl(techStack.logoImg)}
                        alt={techStack.techStack}
                        style={{
                          width: '40px',
                          height: '40px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                        }}
                        onError={e => {
                          // via.placeholder.com is unreliable — use an inline SVG data URI instead
                          (e.target as HTMLImageElement).src =
                            `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='8' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='8' fill='%236b7280'%3ENo img%3C/text%3E%3C/svg%3E`;
                        }}
                      />
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
                        <Code2 size={16} />
                      </div>
                      <div className={styles.employeeInfo}>
                        <span className={styles.employeeName}>{techStack.techStack}</span>
                        <span className={styles.employeeEmail}>
                          ID: {techStack._id.slice(-8)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Category — FIX: getHeadingName now reads .name correctly */}
                  <td>
                    <span className={styles.orgBadge}>
                      {getHeadingName(techStack)}
                    </span>
                  </td>

                  {/* Date */}
                  <td>
                    <div className={styles.deptText}>
                      {new Date(techStack.createdAt).toLocaleDateString('en-IN')}
                    </div>
                    <div className={styles.roleText}>
                      {new Date(techStack.createdAt).toLocaleTimeString()}
                    </div>
                  </td>

                  {/* Actions */}
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
                        onClick={() => handleDelete(techStack._id, techStack.techStack)}
                        className={styles.deleteIcon}
                        title="Delete Tech Stack"
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredTechStacks.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredTechStacks.length)} of{' '}
              {filteredTechStacks.length} tech stacks
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
          <div className={styles.modal} style={{ maxWidth: 580, width: '95vw' }}>

            {/* Modal header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Code2 size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} Tech Stack
              </h2>
              <X size={20} onClick={() => { setShowModal(false); resetForm(); }} style={{ cursor: 'pointer' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className={styles.formGrid}>

                  {/* ── Category dropdown ────────────────────────────────── */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Category / Heading <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      className={styles.formSelect}
                      required
                      // FIX: bind to techStackHeadingId (not formData.name)
                      value={formData.techStackHeadingId}
                      onChange={e =>
                        setFormData({ ...formData, techStackHeadingId: e.target.value })
                      }
                    >
                      <option value="">Select a category</option>
                      {/* FIX: render heading.name (not heading.heading) */}
                      {techStackHeadings.map(heading => (
                        <option key={heading._id} value={heading._id}>
                          {heading.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ── Tech Stack name ───────────────────────────────────── */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Tech Stack Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      placeholder="e.g., React, Node.js, Python, MongoDB"
                      value={formData.techStack}
                      onChange={e => setFormData({ ...formData, techStack: e.target.value })}
                    />
                    <small style={{ color: '#6b7280', marginTop: 4, display: 'block' }}>
                      Enter a unique technology name (minimum 2 characters)
                    </small>
                  </div>

                  {/* ── Logo upload ───────────────────────────────────────── */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Logo Image{' '}
                      {!isEditing && <span style={{ color: 'red' }}>*</span>}
                    </label>
                    <div className={styles.imageUploadContainer}>
                      <input
                        type="file"
                        id="logoImg"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="logoImg" className={styles.uploadButton}>
                        <ImageIcon size={18} />
                        &nbsp;Choose Image
                      </label>
                      <small style={{ color: '#6b7280', marginLeft: 12 }}>
                        Max 5 MB (JPEG, PNG, GIF, WEBP, SVG)
                      </small>
                    </div>

                    {/* Preview */}
                    {previewImage && (
                      <div style={{ marginTop: 16 }}>
                        <img
                          src={previewImage}
                          alt="Preview"
                          style={{
                            maxWidth: '100px',
                            maxHeight: '100px',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            padding: '8px',
                          }}
                        />
                        {isEditing && !formData.logoImg && (
                          <small style={{ display: 'block', marginTop: 8, color: '#6b7280' }}>
                            Current logo shown. Upload a new image to replace it.
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