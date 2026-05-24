import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import { Search, ChevronLeft, ChevronRight, X, Trash2, Filter, Mail, RefreshCw } from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

interface Enquiry {
  _id: string;
  fullName: string;
  email: string;
  mobile: string;
  intrestedCourse: string;
  message: string;
  createdAt: string;
}

const Enquiries: React.FC = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [filtered, setFiltered] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { fetchEnquiries(); }, []);
  useEffect(() => { applyFilters(); }, [enquiries, searchQuery, filterCourse]);

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/enroll');
      setEnquiries(res.data?.enrolls || []);
    } catch (err) {
      toast.error('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let data = [...enquiries];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.mobile.includes(q)
      );
    }
    if (filterCourse) {
      data = data.filter((e) => e.intrestedCourse === filterCourse);
    }
    setFiltered(data);
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this enquiry?')) return;
    const t = toast.loading('Deleting...');
    try {
      await httpClient.delete(`/enroll/${id}`);
      toast.success('Deleted successfully', { id: t });
      fetchEnquiries();
    } catch (err) {
      toast.error('Failed to delete', { id: t });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCourse('');
  };

  const hasFilters = !!(searchQuery || filterCourse);

  const uniqueCourses = Array.from(
    new Set(enquiries.map((e) => e.intrestedCourse).filter(Boolean))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (d: string) =>
    d
      ? new Date(d).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className={styles.employees}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Enquiries</h1>
          <p>Contact form submissions from the website</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by name, email or mobile..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {uniqueCourses.length > 0 && (
              <div className={styles.filterSelect}>
                <Filter size={18} className={styles.filterIcon} />
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className={styles.orgSelect}
                >
                  <option value="">All Courses</option>
                  {uniqueCourses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {hasFilters && (
              <button className={styles.clearFiltersBtn} onClick={clearFilters} title="Clear filters">
                <X size={16} />
              </button>
            )}
          </div>

          <button className={styles.addBtn} onClick={fetchEnquiries}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Enquiries:</span>
          <span className={styles.statValue}>{enquiries.length}</span>
        </div>
        {hasFilters && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filtered.length}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Interested Course</th>
              <th>Message</th>
              <th>Submitted On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading enquiries...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  {hasFilters ? 'No enquiries match the current filters' : 'No enquiries yet'}
                </td>
              </tr>
            ) : (
              paginated.map((enq) => (
                <tr key={enq._id}>
                  <td>
                    <div className={styles.employeeCell}>
                      <div
                        className={styles.avatar}
                        style={{
                          background: 'linear-gradient(135deg, #f97316, #ea580c)',
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
                        {getInitials(enq.fullName)}
                      </div>
                      <div className={styles.employeeInfo}>
                        <span className={styles.employeeName}>{enq.fullName}</span>
                        <span className={styles.employeeEmail}>
                          <Mail size={11} style={{ marginRight: 3 }} />
                          {enq.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{enq.mobile || '—'}</td>
                  <td>
                    {enq.intrestedCourse ? (
                      <span className={styles.orgBadge}>{enq.intrestedCourse}</span>
                    ) : (
                      <span style={{ color: '#aaa', fontSize: 13 }}>Not selected</span>
                    )}
                  </td>
                  <td style={{ maxWidth: 240, fontSize: 13, color: '#555' }}>
                    {enq.message}
                  </td>
                  <td style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}>
                    {formatDate(enq.createdAt)}
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <Trash2
                        size={18}
                        onClick={() => handleDelete(enq._id)}
                        className={styles.deleteIcon}
                        title="Delete Enquiry"
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filtered.length)} of{' '}
              {filtered.length} enquiries
            </div>
            <div className={styles.paginationControls}>
              <button
                className={styles.pageBtn}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button className={`${styles.pageBtn} ${styles.active}`}>
                {currentPage}
              </button>
              <button
                className={styles.pageBtn}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Enquiries;