import React, { useState, useEffect, useMemo } from 'react';
import styles from '../Employees/Employees.module.css'; 
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, ArrowUpDown, Trash2, Edit
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

interface Department {
  _id: string;
  name: string;
  org_id: {
    _id: string;
    name: string;
  };
  created_at: string;
}

interface Organization {
  _id: string;
  name: string;
}

const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    org_id: '',
  });

  // Sorting & Pagination States
  const [sortConfig, setSortConfig] = useState<{ key: keyof Department; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchOrganizations();
    fetchDepartments();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await httpClient.get('/org/get-all-orgs');
      setOrganizations(response.data?.data || []);
    } catch (err) { 
      console.error("Error fetching orgs", err);
      toast.error('Failed to load organizations');
    }
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      // Adjust endpoint based on your specific route
      const response = await httpClient.get('/dept/get-all-depts');
      const data = response.data?.data || [];
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) { 
      console.error("Fetch error:", err);
      setDepartments([]);
      toast.error('Failed to load departments');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const loadingToast = toast.loading(isEditing ? 'Updating department...' : 'Creating department...');
    
    try {
      if (isEditing && selectedId) {
        await httpClient.put(`/dept/update-dept/${selectedId}`, formData);
        toast.success('Department updated successfully!', {
          id: loadingToast,
        });
      } else {
        await httpClient.post('/dept/create-dept', formData);
        toast.success('Department created successfully!', {
          id: loadingToast,
        });
      }
      setShowModal(false);
      resetForm();
      fetchDepartments();
    } catch (err: any) { 
      const errorMessage = err.response?.data?.message || "Operation failed";
      toast.error(errorMessage, {
        id: loadingToast,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this department?")) {
      const loadingToast = toast.loading('Deleting department...');
      
      try {
        await httpClient.delete(`/dept/delete-dept/${id}`);
        toast.success('Department deleted successfully!', {
          id: loadingToast,
        });
        fetchDepartments();
      } catch (err) { 
        console.error(err);
        toast.error('Failed to delete department', {
          id: loadingToast,
        });
      }
    }
  };

  const openEditModal = (dept: Department) => {
    setIsEditing(true);
    setSelectedId(dept._id);
    setFormData({
      name: dept.name,
      org_id: dept.org_id._id,
    });
    setShowModal(true);
    
    toast.success('Loading department data', {
      duration: 1500,
    });
  };

  const resetForm = () => {
    setFormData({ name: '', org_id: ''});
    setIsEditing(false);
    setSelectedId(null);
  };

  // --- Search & Sort Logic ---
  const filteredAndSortedDepts = useMemo(() => {
    let result = [...departments].filter(dept => 
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.org_id?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key]?.toString().toLowerCase() || '';
        const bVal = b[sortConfig.key]?.toString().toLowerCase() || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [departments, searchQuery, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedDepts.length / itemsPerPage));
  const paginatedDepts = filteredAndSortedDepts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (key: keyof Department) => {
    setSortConfig({
      key,
      direction: sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  return (
    <div className={styles.employees}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Departments</h1>
          <p>Manage internal departments and assign them to organizations</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search department or organization..." 
              className={styles.searchInput} 
              value={searchQuery} 
              onChange={(e) => {
                setSearchQuery(e.target.value); 
                setCurrentPage(1);
              }} 
            />
          </div>
          <button 
            className={styles.addBtn} 
            onClick={() => { 
              resetForm(); 
              setShowModal(true);
            }}
          >
            <Plus size={18} /> Add Department
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>S.No</th>
              <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
                Department Name <ArrowUpDown size={14} />
              </th>
              <th>Organization</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-2">Loading departments...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedDepts.length > 0 ? (
              paginatedDepts.map((dept, index) => (
                <tr key={dept._id}>
                  <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td>{dept.name}</td>
                  <td>{dept.org_id?.name || 'N/A'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Edit 
                        size={18} 
                        onClick={() => openEditModal(dept)} 
                        style={{ cursor: 'pointer', color: '#6366f1' }} 
                      />
                      <Trash2 
                        size={18} 
                        onClick={() => handleDelete(dept._id)} 
                        style={{ cursor: 'pointer', color: '#ef4444' }} 
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="text-gray-500">
                    {searchQuery ? 'No departments match your search' : 'No departments found'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Showing {filteredAndSortedDepts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredAndSortedDepts.length)} of {filteredAndSortedDepts.length}
          </div>
          <div className={styles.paginationControls}>
            <button 
              className={styles.pageBtn} 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button 
                key={i} 
                className={`${styles.pageBtn} ${currentPage === i + 1 ? styles.active : ''}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button 
              className={styles.pageBtn} 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{isEditing ? 'Edit' : 'Add'} Department</h2>
              <X 
                size={20} 
                onClick={() => {
                  setShowModal(false);
                }} 
                style={{ cursor: 'pointer' }} 
              />
            </div>
            <form onSubmit={handleSubmit} className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.formLabel}>Organization</label>
                  <select 
                    className={styles.formSelect} 
                    required 
                    value={formData.org_id} 
                    onChange={e => setFormData({ ...formData, org_id: e.target.value })}
                  >
                    <option value="">Select Organization</option>
                    {organizations.map(org => (
                      <option key={org._id} value={org._id}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.formLabel}>Department Name</label>
                  <input 
                    type="text" 
                    className={styles.formInput} 
                    required 
                    placeholder="e.g. Human Resources"
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => {
                  setShowModal(false);
                }}>Cancel</Button>
                <Button type="submit" variant="primary">{isEditing ? 'Update' : 'Save'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;