import React, { useState, useEffect, useMemo } from 'react';
import styles from '../Employees/Employees.module.css'; 
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, ArrowUpDown, Trash2, Edit
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

interface Role {
  _id: string;
  name: string;
  organisation: {
    _id: string;
    name: string;
  };
  department: {
    _id: string;
    name: string;
  };
  created_at: string;
}

interface Organization {
  _id: string;
  name: string;
}

interface Department {
  _id: string;
  name: string;
  org_id: string | { _id: string };
}

const Roles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    organisation: '',
    department: '',
  });

  // Sorting & Pagination States
  const [sortConfig, setSortConfig] = useState<{ key: keyof Role; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchOrganizations();
    fetchRoles();
  }, []);

  // Fetch departments whenever the organization in the form changes
  useEffect(() => {
    if (formData.organisation) {
      fetchDepartmentsByOrg(formData.organisation);
    } else {
      setDepartments([]);
    }
  }, [formData.organisation]);

  const fetchOrganizations = async () => {
    try {
      const response = await httpClient.get('/org/get-all-orgs');
      setOrganizations(response.data?.data || []);
    } catch (err) { 
      console.error("Error fetching orgs", err);
      toast.error('Failed to load organizations');
    }
  };

  const fetchDepartmentsByOrg = async (orgId: string) => {
    try {
      const response = await httpClient.get(`/dept/get-all-depts?org_id=${orgId}`);
      setDepartments(response.data?.data || []);
    } catch (err) { 
      console.error("Error fetching departments", err);
      toast.error('Failed to load departments');
    }
  };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await httpClient.get('/role/get-all-roles');
      const data = response.data?.data || [];
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) { 
      console.error("Fetch error:", err);
      setRoles([]);
      toast.error('Failed to load roles');
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show loading toast
    const loadingToast = toast.loading(isEditing ? 'Updating role...' : 'Creating role...');
    
    try {
      if (isEditing && selectedId) {
        await httpClient.put(`/role/update-role/${selectedId}`, formData);
        toast.success('Role updated successfully!', {
          id: loadingToast,
        });
      } else {
        await httpClient.post('/role/create-role', formData);
        toast.success('Role created successfully!', {
          id: loadingToast,
        });
      }
      setShowModal(false);
      resetForm();
      fetchRoles();
    } catch (err: any) { 
      const errorMessage = err.response?.data?.message || "Operation failed";
      toast.error(errorMessage, {
        id: loadingToast,
      });
    }
  };

  const handleDelete = async (id: string) => {
    // Use a more sophisticated confirmation
    const confirmToast = toast.custom((t) => (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="mb-3 font-medium">Are you sure you want to delete this role?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              performDelete(id);
            }}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 5000,
      position: 'top-center',
    });
  };

  const performDelete = async (id: string) => {
    const loadingToast = toast.loading('Deleting role...');
    
    try {
      await httpClient.delete(`/role/delete-role/${id}`);
      toast.success('Role deleted successfully!', {
        id: loadingToast,
      });
      fetchRoles();
    } catch (err) { 
      console.error(err);
      toast.error('Failed to delete role', {
        id: loadingToast,
      });
    }
  };

  const openEditModal = async (role: Role) => {
    setIsEditing(true);
    setSelectedId(role._id);
    
    // Show loading toast for departments
    const loadingToast = toast.loading('Loading departments...');
    
    try {
      await fetchDepartmentsByOrg(role.organisation._id);
      
      setFormData({
        name: role.name,
        organisation: role.organisation._id,
        department: role.department._id,
      });
      setShowModal(true);
      
      toast.dismiss(loadingToast);
    } catch (error) {
      toast.error('Failed to load departments', {
        id: loadingToast,
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', organisation: '', department: '' });
    setIsEditing(false);
    setSelectedId(null);
    setDepartments([]);
  };

  // --- Search & Sort Logic ---
  const filteredAndSortedRoles = useMemo(() => {
    let result = [...roles].filter(role => 
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.organisation?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.department?.name?.toLowerCase().includes(searchQuery.toLowerCase())
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
  }, [roles, searchQuery, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRoles.length / itemsPerPage));
  const paginatedRoles = filteredAndSortedRoles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (key: keyof Role) => {
    setSortConfig({
      key,
      direction: sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
    toast.success(`Sorted by ${key}`, {
      duration: 1500,
      icon: '🔤',
    });
  };

  return (
    <div className={styles.employees}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Roles / Positions</h1>
          <p>Define designations within departments</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search roles, depts or orgs..." 
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
              toast.success('Ready to create new role', {
                duration: 2000,
                icon: '✨',
              });
            }}
          >
            <Plus size={18} /> Add Role
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>S.No</th>
              <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
                Role Name <ArrowUpDown size={14} />
              </th>
              <th>Department</th>
              <th>Organization</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-2">Loading roles...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedRoles.length > 0 ? (
              paginatedRoles.map((role, index) => (
                <tr key={role._id}>
                  <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td>{role.name}</td>
                  <td>{role.department?.name || 'N/A'}</td>
                  <td>{role.organisation?.name || 'N/A'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Edit 
                        size={18} 
                        onClick={() => {
                          openEditModal(role);
                          toast('Editing role: ' + role.name, {
                            icon: '✏️',
                            duration: 2000,
                          });
                        }} 
                        style={{ cursor: 'pointer', color: '#6366f1' }} 
                      />
                      <Trash2 
                        size={18} 
                        onClick={() => handleDelete(role._id)} 
                        style={{ cursor: 'pointer', color: '#ef4444' }} 
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="text-gray-500">
                    {searchQuery ? 'No roles match your search' : 'No roles found'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Showing {filteredAndSortedRoles.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredAndSortedRoles.length)} of {filteredAndSortedRoles.length}
          </div>
          <div className={styles.paginationControls}>
            <button 
              className={styles.pageBtn} 
              disabled={currentPage === 1} 
              onClick={() => {
                setCurrentPage(p => p - 1);
                toast('Page ' + (currentPage - 1), {
                  icon: '📄',
                  duration: 1000,
                });
              }}
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
              onClick={() => {
                setCurrentPage(p => p + 1);
                toast('Page ' + (currentPage + 1), {
                  icon: '📄',
                  duration: 1000,
                });
              }}
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
              <h2 className={styles.modalTitle}>{isEditing ? 'Edit' : 'Add'} Role</h2>
              <X 
                size={20} 
                onClick={() => {
                  setShowModal(false);
                  toast('Modal closed', {
                    icon: '👋',
                    duration: 1500,
                  });
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
                    value={formData.organisation} 
                    onChange={e => {
                      setFormData({ ...formData, organisation: e.target.value, department: '' });
                      if (e.target.value) {
                        toast.success('Organization selected', {
                          duration: 1500,
                        });
                      }
                    }}
                  >
                    <option value="">Select Organization</option>
                    {organizations.map(org => (
                      <option key={org._id} value={org._id}>{org.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.formLabel}>Department</label>
                  <select 
                    className={styles.formSelect} 
                    required 
                    disabled={!formData.organisation}
                    value={formData.department} 
                    onChange={e => {
                      setFormData({ ...formData, department: e.target.value });
                      if (e.target.value) {
                        toast.success('Department selected', {
                          duration: 1500,
                        });
                      }
                    }}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                  {!formData.organisation && (
                    <small className={styles.formHint}>Select an organization first</small>
                  )}
                </div>

                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.formLabel}>Role Name</label>
                  <input 
                    type="text" 
                    className={styles.formInput} 
                    required 
                    placeholder="e.g. Senior Manager"
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  />
                </div>

              </div>
              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => {
                  setShowModal(false);
                  toast('Form cancelled', {
                    icon: '❌',
                    duration: 1500,
                  });
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

export default Roles;