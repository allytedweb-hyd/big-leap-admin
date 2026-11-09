import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../Employees/Employees.module.css';
import cardStyles from './Assessments.module.css';
import {
  Search, Plus, ChevronLeft, ChevronRight, X, Trash2, Edit,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';
import type { Assessment } from './AssessmentShared';
import { getErrorMessage } from './AssessmentShared';

const ManageAssessments: React.FC = () => {
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filtered, setFiltered] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAssessments();
  }, []);

  useEffect(() => {
    let list = [...assessments];
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter(a => a.title.toLowerCase().includes(q));
    if (statusFilter !== 'all') {
      list = list.filter(a => (statusFilter === 'active' ? a.isActive : !a.isActive));
    }
    setFiltered(list);
    setCurrentPage(1);
  }, [assessments, searchQuery, statusFilter]);

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/assessments', { params: { limit: 'all' } });
      setAssessments(res.data?.assessments || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load assessments'));
    } finally {
      setLoading(false);
    }
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    const loadingToast = toast.loading('Deleting assessment...');
    try {
      await httpClient.delete(`/assessments/${id}`);
      toast.success('Assessment deleted successfully!', { id: loadingToast });
      fetchAssessments();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete assessment'), { id: loadingToast });
    }
  };

  const toggleActive = async (a: Assessment) => {
    try {
      await httpClient.put(`/assessments/${a._id}`, { isActive: !a.isActive });
      setAssessments(prev =>
        prev.map(x => (x._id === a._id ? { ...x, isActive: !a.isActive } : x)),
      );
      toast.success(a.isActive ? 'Assessment deactivated' : 'Assessment activated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'));
    }
  };

  // ─── Pagination ───────────────────────────────────────────────────────────

  const hasFilters = !!searchQuery || statusFilter !== 'all';
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.employees}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Manage Assessments</h1>
          <p>Create assessments with subject-wise questions and assign them to batches</p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by title..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className={cardStyles.filterSelect}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              aria-label="Filter by status"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {hasFilters && (
              <button className={styles.clearFiltersBtn} onClick={clearFilters} title="Clear filters">
                <X size={16} />
              </button>
            )}
          </div>

          <button className={styles.addBtn} onClick={() => navigate('/manage-assessments/create')}>
            <Plus size={18} /> Add Assessment
          </button>
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Assessments:</span>
          <span className={styles.statValue}>{assessments.length}</span>
        </div>
        {hasFilters && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filtered.length}</span>
          </div>
        )}
      </div>

      {/* ── Cards ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className={cardStyles.emptyBox}>
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            <span className="ml-2">Loading assessments...</span>
          </div>
        </div>
      ) : paginatedData.length === 0 ? (
        <div className={cardStyles.emptyBox}>
          {hasFilters
            ? 'No assessments match your filters'
            : 'No assessments found. Click "Add Assessment" to create one.'}
        </div>
      ) : (
        <div className={cardStyles.grid}>
          {paginatedData.map(a => {

            return (
              <div key={a._id} className={cardStyles.card}>

                {/* Title + status + icon actions */}
                <div className={cardStyles.cardHead}>
                  <div>
                    <h3 className={cardStyles.title}>{a.title}</h3>
                    <p className={cardStyles.created}>
                      Created {new Date(a.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className={cardStyles.headRight}>
                    <button
                      type="button"
                      onClick={() => toggleActive(a)}
                      title="Click to toggle status"
                      className={`${cardStyles.status} ${
                        a.isActive ? cardStyles.statusActive : cardStyles.statusInactive
                      }`}
                    >
                      {a.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <div className={cardStyles.iconRow}>
                      <button
                        type="button"
                        className={`${cardStyles.iconBtn} ${cardStyles.iconEdit}`}
                        onClick={() => navigate(`/manage-assessments/edit/${a._id}`)}
                        title="Edit assessment"
                        aria-label={`Edit ${a.title}`}
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        type="button"
                        className={`${cardStyles.iconBtn} ${cardStyles.iconDelete}`}
                        onClick={() => handleDelete(a._id, a.title)}
                        title="Delete assessment"
                        aria-label={`Delete ${a.title}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {a.description && <p className={cardStyles.desc}>{a.description}</p>}

                {/* Subjects */}
                <div>
                  <p className={cardStyles.sectionLabel}>Subjects</p>
                  <div className={cardStyles.chips}>
                    {a.sections.map(s => (
                      <span key={s._id} className={cardStyles.chip}>
                        {s.subjectId?.subjectName || 'Deleted subject'} · {s.questionCount}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Meta */}
                <div className={cardStyles.meta}>
                  <div className={cardStyles.metaItem}>
                    <div className={cardStyles.metaValue}>{a.duration}</div>
                    <div className={cardStyles.metaLabel}>Minutes</div>
                  </div>
                  <div className={cardStyles.metaItem}>
                    <div className={cardStyles.metaValue}>{a.totalQuestions}</div>
                    <div className={cardStyles.metaLabel}>Questions</div>
                  </div>
                  <div className={cardStyles.metaItem}>
                    <div className={cardStyles.metaValue}>{a.totalMarks}</div>
                    <div className={cardStyles.metaLabel}>Marks</div>
                  </div>
                  <div className={cardStyles.metaItem}>
                    <div className={cardStyles.metaValue}>{a.passPercentage}%</div>
                    <div className={cardStyles.metaLabel}>Pass</div>
                  </div>
                </div>

                {/* Batches (count only) */}
                <div className={cardStyles.chips}>
                  {a.batchIds.length === 0 ? (
                    <span className={cardStyles.chipWarn}>Not assigned to any batch</span>
                  ) : (
                    <span className={cardStyles.chipBatch}>
                      {a.batchIds.length} {a.batchIds.length === 1 ? 'batch' : 'batches'} assigned
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className={styles.pagination} style={{ marginTop: 20 }}>
          <div className={styles.paginationInfo}>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} assessments
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
  );
};

export default ManageAssessments;