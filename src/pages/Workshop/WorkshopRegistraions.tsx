import React, { useState, useEffect } from 'react';
import styles from '../Employees/Employees.module.css';
import {
  Search, ChevronLeft, ChevronRight,
  X, Trash2, Filter, Calendar, Users, Mail, Phone, MessageSquare, BookOpen,
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkshopInfo {
  _id: string;
  workshopHeading: string;
  date: string;
  time: string;
  platform: string;
}

interface WorkshopRegistration {
  _id: string;
  workshopId: WorkshopInfo;
  fullname: string;
  email: string;
  mobile: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const WorkshopRegistrations: React.FC = () => {
  const [registrations, setRegistrations] = useState<WorkshopRegistration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<WorkshopRegistration[]>([]);

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { fetchRegistrations(); }, []);
  useEffect(() => { filterRegistrations(); }, [registrations, searchQuery, filterDate]);

  // ─── API ──────────────────────────────────────────────────────────────────

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/workshop-registrations');
      setRegistrations(res.data?.registrations || []);
    } catch {
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  // ─── Filter ───────────────────────────────────────────────────────────────

  const filterRegistrations = () => {
    let filtered = [...registrations];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.workshopId?.workshopHeading?.toLowerCase().includes(q) ||
        r.fullname.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    }

    if (filterDate) {
      filtered = filtered.filter(r => {
        const workshopDate = r.workshopId?.date?.slice(0, 10);
        return workshopDate === filterDate;
      });
    }

    setFilteredRegistrations(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterDate('');
  };

  const hasFilters = searchQuery || filterDate;

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this registration?')) return;
    const loadingToast = toast.loading('Deleting registration...');
    try {
      await httpClient.delete(`/workshop-registrations/${id}`);
      toast.success('Registration deleted successfully!', { id: loadingToast });
      fetchRegistrations();
    } catch {
      toast.error('Failed to delete registration', { id: loadingToast });
    }
  };

  // ─── Pagination ───────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filteredRegistrations.length / itemsPerPage));
  const paginatedData = filteredRegistrations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.employees}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Workshop Registrations</h1>
          <p>View and manage all workshop registrations</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by workshop heading or registrant..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.filterSelect}>
              <Filter size={18} className={styles.filterIcon} />
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className={styles.orgSelect}
                title="Filter by workshop date"
              />
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
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Registrations:</span>
          <span className={styles.statValue}>{registrations.length}</span>
        </div>
        {hasFilters && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredRegistrations.length}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Registrant</th>
              <th>Contact</th>
              <th>Workshop</th>
              <th>Workshop Date</th>
              <th>Message</th>
              <th>Registered On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    <span className="ml-2">Loading registrations...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="text-gray-500">
                    {hasFilters
                      ? 'No registrations match the current filters'
                      : 'No registrations found'}
                  </div>
                </td>
              </tr>
            ) : paginatedData.map(reg => (
              <tr key={reg._id}>

                {/* Registrant */}
                <td>
                  <div className={styles.employeeCell}>
                    <div
                      className={styles.avatar}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        borderRadius: '50%',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(reg.fullname)}
                    </div>
                    <div className={styles.employeeInfo}>
                      <span className={styles.employeeName}>{reg.fullname}</span>
                      <span className={styles.employeeEmail}>
                        <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
                        Registrant
                      </span>
                    </div>
                  </div>
                </td>

                {/* Contact */}
                <td>
                  <div className={styles.deptText}>
                    <Mail size={13} style={{ display: 'inline', marginRight: 5 }} />
                    {reg.email}
                  </div>
                  <div className={styles.roleText}>
                    <Phone size={13} style={{ display: 'inline', marginRight: 5 }} />
                    {reg.mobile}
                  </div>
                </td>

                {/* Workshop */}
                <td>
                  <div className={styles.employeeCell} style={{ gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <BookOpen size={13} color="#fff" />
                    </div>
                    <span className={styles.deptText}>
                      {reg.workshopId?.workshopHeading || 'N/A'}
                    </span>
                  </div>
                </td>

                {/* Workshop Date */}
                <td>
                  <div className={styles.deptText}>
                    <Calendar size={13} style={{ display: 'inline', marginRight: 5 }} />
                    {formatDate(reg.workshopId?.date)}
                  </div>
                  <div className={styles.roleText}>
                    {reg.workshopId?.platform && (
                      <span
                        className={styles.orgBadge}
                        style={{ background: '#e0e7ff', color: '#4338ca', fontSize: 11 }}
                      >
                        {reg.workshopId.platform}
                      </span>
                    )}
                  </div>
                </td>

                {/* Message */}
                <td>
                  <div className={styles.deptText} style={{ maxWidth: 180 }}>
                    {reg.message ? (
                      <>
                        <MessageSquare size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {reg.message.length > 50
                          ? reg.message.substring(0, 50) + '...'
                          : reg.message}
                      </>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>No message</span>
                    )}
                  </div>
                </td>

                {/* Registered On */}
                <td>
                  <div className={styles.deptText}>
                    {formatDate(reg.createdAt)}
                  </div>
                </td>

                {/* Actions */}
                <td>
                  <div className={styles.actionButtons}>
                    <button
                      title="Delete Registration"
                      onClick={() => handleDelete(reg._id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <Trash2 size={18} className={styles.deleteIcon} />
                    </button>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>

        {filteredRegistrations.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredRegistrations.length)} of{' '}
              {filteredRegistrations.length} registrations
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

    </div>
  );
};

export default WorkshopRegistrations;