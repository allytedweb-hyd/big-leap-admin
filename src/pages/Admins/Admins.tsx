import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, ShieldCheck, Mail, KeyRound,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

interface Admin {
  _id: string;
  email: string;
  createdAt: string;
}

const emptyForm = () => ({
  email: '',
  password: '',
});

const AdminPage: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm());

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { fetchAdmins(); }, []);
  useEffect(() => { filterAdmins(); }, [admins, searchQuery]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/admins');
      setAdmins(res.data?.admins || []);
    } catch {
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const filterAdmins = () => {
    let filtered = [...admins];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.email.toLowerCase().includes(q)
      );
    }
    setFilteredAdmins(filtered);
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(isEditing ? 'Updating admin...' : 'Creating admin...');
    try {
      // Build payload — omit empty password on edit
      const payload: Partial<typeof formData> = { email: formData.email };
      if (formData.password) payload.password = formData.password;

      if (isEditing && selectedId) {
        await httpClient.put(`/admins/${selectedId}`, payload);
        toast.success('Admin updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/admins', formData);
        toast.success('Admin created successfully!', { id: loadingToast });
      }
      setShowModal(false);
      resetForm();
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    const loadingToast = toast.loading('Deleting admin...');
    try {
      await httpClient.delete(`/admins/${id}`);
      toast.success('Admin deleted successfully!', { id: loadingToast });
      fetchAdmins();
    } catch {
      toast.error('Failed to delete admin', { id: loadingToast });
    }
  };

  const openEditModal = (admin: Admin) => {
    setIsEditing(true);
    setSelectedId(admin._id);
    setFormData({ email: admin.email, password: '' }); // password blank — only fill to change
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setIsEditing(false);
    setSelectedId(null);
  };

  // Avatar initials from email
  const getInitials = (email: string) =>
    email.charAt(0).toUpperCase();

  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / itemsPerPage));
  const paginatedData = filteredAdmins.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className={styles.employees}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Admins</h1>
          <p>Manage administrator accounts and access</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by email..."
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
            <Plus size={18} /> Add Admin
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Admins:</span>
          <span className={styles.statValue}>{admins.length}</span>
        </div>
        {searchQuery && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredAdmins.length}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Admin</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading admins...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {searchQuery ? 'No admins match your search' : 'No admins found. Click "Add Admin" to create one.'}
                </td>
              </tr>
            ) : paginatedData.map(admin => (
              <tr key={admin._id}>
                <td>
                  <div className={styles.employeeCell}>
                    <div
                      className={styles.avatar}
                      style={{
                        background: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', borderRadius: '50%', flexShrink: 0,
                        fontWeight: 700, fontSize: 15,
                      }}
                    >
                      {getInitials(admin.email)}
                    </div>
                    <div className={styles.employeeInfo}>
                      <span className={styles.employeeName}>
                        {admin.email.split('@')[0]}
                      </span>
                      <span className={styles.employeeEmail}>
                        ID: {admin._id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.deptText}>
                    {admin.email}
                  </div>
                </td>
         
                <td>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>
                    {new Date(admin.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <Edit
                      size={18}
                      onClick={() => openEditModal(admin)}
                      className={styles.editIcon}
                      title="Edit Admin"
                    />
                    <Trash2
                      size={18}
                      onClick={() => handleDelete(admin._id)}
                      className={styles.deleteIcon}
                      title="Delete Admin"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAdmins.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredAdmins.length)} of{' '}
              {filteredAdmins.length} admins
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
          <div className={styles.modal} style={{ maxWidth: 520, width: '95vw' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <ShieldCheck size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} Admin
              </h2>
              <X size={20} onClick={() => setShowModal(false)} style={{ cursor: 'pointer' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>

                  {/* Email */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      <Mail size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      Email <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="email"
                      className={styles.formInput}
                      required
                      placeholder="e.g., admin@company.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  {/* Password */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      <KeyRound size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      Password {!isEditing && <span style={{ color: 'red' }}>*</span>}
                    </label>
                    <input
                      type="password"
                      className={styles.formInput}
                      required={!isEditing}
                      placeholder={isEditing ? 'Leave blank to keep current password' : 'Enter password'}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    {isEditing && (
                      <small style={{ color: '#6b7280', marginTop: 4, display: 'block' }}>
                        Leave blank to keep the existing password unchanged
                      </small>
                    )}
                  </div>

                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {isEditing ? 'Update' : 'Save'} Admin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;