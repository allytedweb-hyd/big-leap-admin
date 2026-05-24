import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, HelpCircle, AlignLeft, Hash,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = () => ({
  question: '',
  answer: '',
  order: 0,
  isActive: true,
});

const FAQPage: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm());

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { fetchFaqs(); }, []);
  useEffect(() => { filterFaqs(); }, [faqs, searchQuery]);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/faqs/all');
      setFaqs(res.data?.faqs || []);
    } catch {
      toast.error('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const filterFaqs = () => {
    let filtered = [...faqs];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(f =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q)
      );
    }
    setFilteredFaqs(filtered);
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(isEditing ? 'Updating FAQ...' : 'Creating FAQ...');
    try {
      if (isEditing && selectedId) {
        await httpClient.put(`/faqs/${selectedId}`, formData);
        toast.success('FAQ updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/faqs', formData);
        toast.success('FAQ created successfully!', { id: loadingToast });
      }
      setShowModal(false);
      resetForm();
      fetchFaqs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;
    const loadingToast = toast.loading('Deleting FAQ...');
    try {
      await httpClient.delete(`/faqs/${id}`);
      toast.success('FAQ deleted successfully!', { id: loadingToast });
      fetchFaqs();
    } catch {
      toast.error('Failed to delete FAQ', { id: loadingToast });
    }
  };

  const handleToggleActive = async (faq: FAQ) => {
    try {
      await httpClient.put(`/faqs/${faq._id}`, { ...faq, isActive: !faq.isActive });
      toast.success(`FAQ ${!faq.isActive ? 'activated' : 'deactivated'}`);
      fetchFaqs();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const openEditModal = (faq: FAQ) => {
    setIsEditing(true);
    setSelectedId(faq._id);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      order: faq.order,
      isActive: faq.isActive,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setIsEditing(false);
    setSelectedId(null);
  };

  const totalPages = Math.max(1, Math.ceil(filteredFaqs.length / itemsPerPage));
  const paginatedData = filteredFaqs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className={styles.employees}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>FAQs</h1>
          <p>Manage frequently asked questions shown on the website</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by question or answer..."
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
            <Plus size={18} /> Add FAQ
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total FAQs:</span>
          <span className={styles.statValue}>{faqs.length}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Active:</span>
          <span className={styles.statValue}>{faqs.filter(f => f.isActive).length}</span>
        </div>
        {searchQuery && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredFaqs.length}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Question</th>
              <th>Answer</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading FAQs...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {searchQuery ? 'No FAQs match your search' : 'No FAQs found. Click "Add FAQ" to create one.'}
                </td>
              </tr>
            ) : paginatedData.map(faq => (
              <tr key={faq._id}>
                <td>
                  <span className={styles.orgBadge} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                    #{faq.order}
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
                      <HelpCircle size={16} />
                    </div>
                    <div className={styles.employeeInfo}>
                      <span className={styles.employeeName}>
                        {faq.question.length > 60 ? faq.question.substring(0, 60) + '...' : faq.question}
                      </span>
                      <span className={styles.employeeEmail}>
                        Added: {new Date(faq.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.deptText} style={{ maxWidth: 300 }}>
                    {faq.answer.length > 80 ? faq.answer.substring(0, 80) + '...' : faq.answer}
                  </div>
                </td>
                <td>
                  <button
                    onClick={() => handleToggleActive(faq)}
                    className={styles.orgBadge}
                    style={{
                      background: faq.isActive ? '#dcfce7' : '#fee2e2',
                      color: faq.isActive ? '#16a34a' : '#dc2626',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {faq.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <Edit
                      size={18}
                      onClick={() => openEditModal(faq)}
                      className={styles.editIcon}
                      title="Edit FAQ"
                    />
                    <Trash2
                      size={18}
                      onClick={() => handleDelete(faq._id)}
                      className={styles.deleteIcon}
                      title="Delete FAQ"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredFaqs.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredFaqs.length)} of{' '}
              {filteredFaqs.length} FAQs
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
          <div className={styles.modal} style={{ maxWidth: 680, width: '95vw' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <HelpCircle size={20} style={{ marginRight: 8 }} />
                {isEditing ? 'Edit' : 'Add'} FAQ
              </h2>
              <X size={20} onClick={() => setShowModal(false)} style={{ cursor: 'pointer' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className={styles.formGrid}>

                  {/* Question */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Question <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      required
                      placeholder="e.g., Do I need coding experience?"
                      value={formData.question}
                      onChange={e => setFormData({ ...formData, question: e.target.value })}
                    />
                  </div>

                  {/* Answer */}
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.formLabel}>
                      Answer <span style={{ color: 'red' }}>*</span>
                    </label>
                    <textarea
                      className={styles.formInput}
                      required
                      rows={4}
                      placeholder="Type the answer here..."
                      value={formData.answer}
                      onChange={e => setFormData({ ...formData, answer: e.target.value })}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  {/* Order */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Display Order</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      min={0}
                      placeholder="0"
                      value={formData.order}
                      onChange={e => setFormData({ ...formData, order: Number(e.target.value) })}
                    />
                    <small style={{ color: '#6b7280', marginTop: 4, display: 'block' }}>
                      Lower number = shown first on website
                    </small>
                  </div>

                  {/* Active toggle */}
                  <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 24 }}>
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <label htmlFor="isActive" className={styles.formLabel} style={{ margin: 0, cursor: 'pointer' }}>
                      Show on website (Active)
                    </label>
                  </div>

                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {isEditing ? 'Update' : 'Save'} FAQ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQPage;