import React, { useState, useEffect, useMemo } from 'react';
import styles from '../Employees/Employees.module.css'; 
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, MoreVertical, ChevronLeft, ChevronRight,
  X, ArrowUpDown, Navigation, Trash2, Edit
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

interface Organization {
  _id: string;
  name: string;
  org_code: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  wifi_ips: string[];
  monthlyCasualLeaves: number;
  monthlySickLeaves: number;
  wfhStatus: 'Active' | 'Inactive';
  status: 'Active' | 'Inactive';
}

const Organizations: React.FC = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Error states for form fields
  const [nameError, setNameError] = useState('');
  const [orgCodeError, setOrgCodeError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    org_code: '',
    latitude: 0,
    longitude: 0,
    address: '',
    radius_meters: 100,
    wifi_ips: '',
    monthlyCasualLeaves: 1,
    monthlySickLeaves: 1,
    wfhStatus: 'Active' as 'Active' | 'Inactive',
    status: 'Active' as 'Active' | 'Inactive'
  });

  const [sortConfig, setSortConfig] = useState<{ key: keyof Organization; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => { fetchOrganizations(); }, []);

  // Validate name for duplicates in real-time
  useEffect(() => {
    if (formData.name && !isEditing) {
      const isDuplicate = orgs.some(org => 
        org.name.toLowerCase() === formData.name.toLowerCase()
      );
      setNameError(isDuplicate ? 'Organization name already exists' : '');
    } else if (formData.name && isEditing && selectedId) {
      const isDuplicate = orgs.some(org => 
        org.name.toLowerCase() === formData.name.toLowerCase() && 
        org._id !== selectedId
      );
      setNameError(isDuplicate ? 'Organization name already exists' : '');
    } else {
      setNameError('');
    }
  }, [formData.name, orgs, isEditing, selectedId]);

  // Validate org_code for duplicates in real-time
  useEffect(() => {
    if (formData.org_code && !isEditing) {
      const isDuplicate = orgs.some(org => 
        org.org_code.toLowerCase() === formData.org_code.toLowerCase()
      );
      setOrgCodeError(isDuplicate ? 'Organization code already exists' : '');
    } else if (formData.org_code && isEditing && selectedId) {
      const isDuplicate = orgs.some(org => 
        org.org_code.toLowerCase() === formData.org_code.toLowerCase() && 
        org._id !== selectedId
      );
      setOrgCodeError(isDuplicate ? 'Organization code already exists' : '');
    } else {
      setOrgCodeError('');
    }
  }, [formData.org_code, orgs, isEditing, selectedId]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const response = await httpClient.get('/org/get-all-orgs');
      const data = response.data?.data || response.data || [];
      setOrgs(Array.isArray(data) ? data : []);
    } catch (err) { 
        console.error("Fetch error:", err);
        setOrgs([]);
        toast.error('Failed to load organizations');
    } finally { setLoading(false); }
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        toast.success('Location fetched successfully', {
          duration: 2000,
        });
      }, (error) => {
        toast.error('Error fetching location: ' + error.message);
      });
    } else { 
      toast.error('Geolocation not supported');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous submit error
    setSubmitError('');
    
    // Check for client-side validation errors
    if (nameError || orgCodeError) {
      setSubmitError('Please fix the errors before submitting');
      toast.error('Please fix the errors before submitting');
      return;
    }

    const loadingToast = toast.loading(isEditing ? 'Updating organization...' : 'Creating organization...');

    const payload = {
      ...formData,
      wifi_ips: formData.wifi_ips.split(',').map(ip => ip.trim()).filter(ip => ip !== ""),
      monthlyCasualLeaves: Number(formData.monthlyCasualLeaves),
      monthlySickLeaves: Number(formData.monthlySickLeaves),
      radius_meters: Number(formData.radius_meters)
    };

    try {
      if (isEditing && selectedId) {
        await httpClient.put(`/org/update-org/${selectedId}`, payload);
        toast.success('Organization updated successfully!', {
          id: loadingToast,
        });
      } else {
        await httpClient.post('/org/create-org', payload);
        toast.success('Organization created successfully!', {
          id: loadingToast,
        });
      }
      setShowModal(false);
      resetForm();
      fetchOrganizations();
    } catch (err: any) { 
      console.error("Error details:", err.response?.data);
      
      // Handle MongoDB duplicate key error (code 11000)
      if (err.response?.status === 409 || err.response?.status === 400) {
        const errorMessage = err.response?.data?.message || '';
        
        // Check if it's a duplicate key error
        if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
          
          // Try to determine which field caused the duplicate
          if (errorMessage.includes('name')) {
            setNameError('Organization name already exists');
            toast.error('Organization name already exists. Please use a different name.', {
              id: loadingToast,
            });
          } else if (errorMessage.includes('org_code')) {
            setOrgCodeError('Organization code already exists');
            toast.error('Organization code already exists. Please use a different code.', {
              id: loadingToast,
            });
          } else {
            // Generic duplicate message
            toast.error('A record with this information already exists. Please check your entries.', {
              id: loadingToast,
            });
          }
        } else {
          // Other validation errors
          toast.error(errorMessage || "Please check your input and try again.", {
            id: loadingToast,
          });
        }
      } else {
        toast.error(err.response?.data?.message || "An error occurred. Please try again.", {
          id: loadingToast,
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this organization?")) {
      const loadingToast = toast.loading('Deleting organization...');
      
      try {
        await httpClient.delete(`/org/delete-org/${id}`);
        toast.success('Organization deleted successfully!', {
          id: loadingToast,
        });
        fetchOrganizations();
      } catch (err) { 
        console.error(err);
        toast.error('Failed to delete organization', {
          id: loadingToast,
        });
      }
    }
  };

  const openEditModal = (org: Organization) => {
    setIsEditing(true);
    setSelectedId(org._id);
    setFormData({
      name: org.name,
      org_code: org.org_code,
      latitude: org.latitude,
      longitude: org.longitude,
      address: org.address || '',
      radius_meters: org.radius_meters,
      wifi_ips: org.wifi_ips.join(', '),
      monthlyCasualLeaves: org.monthlyCasualLeaves || 1,
      monthlySickLeaves: org.monthlySickLeaves || 1,
      wfhStatus: org.wfhStatus || 'Active',
      status: org.status
    });
    setNameError('');
    setOrgCodeError('');
    setSubmitError('');
    setShowModal(true);
    
    toast.success('Loading organization data', {
      duration: 1500,
    });
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      org_code: '', 
      latitude: 0, 
      longitude: 0, 
      address: '', 
      radius_meters: 100, 
      wifi_ips: '',
      monthlyCasualLeaves: 1,
      monthlySickLeaves: 1,
      wfhStatus: 'Active',
      status: 'Active' 
    });
    setNameError('');
    setOrgCodeError('');
    setSubmitError('');
    setIsEditing(false);
    setSelectedId(null);
  };

  // --- Search & Sort Logic ---
  const filteredAndSortedOrgs = useMemo(() => {
    let result = [...orgs].filter(org => 
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.org_code.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [orgs, searchQuery, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedOrgs.length / itemsPerPage));
  const paginatedOrgs = filteredAndSortedOrgs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (key: keyof Organization) => {
    setSortConfig({
      key,
      direction: sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const isFormValid = useMemo(() => {
    return (
      formData.name && 
      !nameError && 
      formData.org_code && 
      !orgCodeError && 
      formData.latitude !== 0 && 
      formData.longitude !== 0 && 
      formData.wifi_ips && 
      formData.radius_meters > 0 &&
      formData.monthlyCasualLeaves >= 0 &&
      formData.monthlySickLeaves >= 0
    );
  }, [formData, nameError, orgCodeError]);

  return (
    <div className={styles.employees}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Organizations</h1>
          <p>Manage geofencing and branch settings</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search..." 
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
            <Plus size={18} /> Add Organization
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>S.No</th>
              <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
                Name <ArrowUpDown size={14} />
              </th>
              <th onClick={() => toggleSort('org_code')} style={{ cursor: 'pointer' }}>
                Code <ArrowUpDown size={14} />
              </th>
              <th>Address</th>
              <th>Radius</th>
              <th>Casual Leaves</th>
              <th>Sick Leaves</th>
              <th>WFH Status</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <span className="ml-2">Loading organizations...</span>
                    </div>
                  </td>
                </tr>
            ) : paginatedOrgs.length > 0 ? (
                paginatedOrgs.map((org, index) => (
                    <tr key={org._id}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>{org.name}</td>
                      <td><code>{org.org_code}</code></td>
                      <td>{org.address || '-'}</td>
                      <td>{org.radius_meters}m</td>
                      <td>{org.monthlyCasualLeaves || 0}</td>
                      <td>{org.monthlySickLeaves || 0}</td>
                      <td>
                        <span className={org.wfhStatus === 'Active' ? styles.badgeActive : styles.badgeInactive}>
                          {org.wfhStatus || 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <span className={org.status === 'Active' ? styles.badgeActive : styles.badgeInactive}>
                          {org.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <Edit 
                            size={18} 
                            onClick={() => openEditModal(org)} 
                            style={{ cursor: 'pointer', color: '#6366f1' }} 
                          />
                          <Trash2 
                            size={18} 
                            onClick={() => handleDelete(org._id)} 
                            style={{ cursor: 'pointer', color: '#ef4444' }} 
                          />
                        </div>
                      </td>
                    </tr>
                  ))
            ) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="text-gray-500">
                      {searchQuery ? 'No organizations match your search' : 'No organizations found'}
                    </div>
                  </td>
                </tr>
            )}
          </tbody>
        </table>

        {/* Pagination UI */}
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Showing {filteredAndSortedOrgs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredAndSortedOrgs.length)} of {filteredAndSortedOrgs.length}
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
              <h2 className={styles.modalTitle}>{isEditing ? 'Edit' : 'Add'} Organization</h2>
              <X 
                size={20} 
                onClick={() => {
                  setShowModal(false);
                }} 
                style={{ cursor: 'pointer' }} 
              />
            </div>
            <form onSubmit={handleSubmit} className={styles.modalBody}>
              {submitError && (
                <div style={{ 
                  backgroundColor: '#fee', 
                  color: '#c00', 
                  padding: '10px', 
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  {submitError}
                </div>
              )}
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Name *</label>
                  <input 
                    type="text" 
                    className={`${styles.formInput} ${nameError ? styles.error : ''}`} 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  />
                  {nameError && <span className={styles.errorMessage}>{nameError}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Code *</label>
                  <input 
                    type="text" 
                    className={`${styles.formInput} ${orgCodeError ? styles.error : ''}`} 
                    required 
                    value={formData.org_code} 
                    onChange={e => setFormData({ ...formData, org_code: e.target.value })} 
                  />
                  {orgCodeError && <span className={styles.errorMessage}>{orgCodeError}</span>}
                </div>
                <div className={styles.formGroup} style={{ position: 'relative' }}>
                  <label className={styles.formLabel}>Latitude *</label>
                  <input 
                    type="number" 
                    step="any" 
                    className={styles.formInput} 
                    required 
                    value={formData.latitude} 
                    onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })} 
                  />
                  <Navigation 
                    size={18} 
                    onClick={getCurrentLocation}
                    style={{ position: 'absolute', right: '10px', top: '38px', cursor: 'pointer', color: '#6366f1' }} 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Longitude *</label>
                  <input 
                    type="number" 
                    step="any" 
                    className={styles.formInput} 
                    required 
                    value={formData.longitude} 
                    onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>WiFi IPs (CSV)</label>
                  <input 
                    type="text" 
                    className={styles.formInput} 
                    placeholder="192.168.1.1, 172.16.0.1" 
                    value={formData.wifi_ips} 
                    onChange={e => setFormData({ ...formData, wifi_ips: e.target.value })} 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Radius (m) *</label>
                  <input 
                    type="number" 
                    className={styles.formInput} 
                    required 
                    min="1" 
                    value={formData.radius_meters} 
                    onChange={e => setFormData({ ...formData, radius_meters: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Monthly Casual Leaves</label>
                  <input 
                    type="number" 
                    className={styles.formInput} 
                    min="0" 
                    value={formData.monthlyCasualLeaves} 
                    onChange={e => setFormData({ ...formData, monthlyCasualLeaves: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Monthly Sick Leaves</label>
                  <input 
                    type="number" 
                    className={styles.formInput} 
                    min="0" 
                    value={formData.monthlySickLeaves} 
                    onChange={e => setFormData({ ...formData, monthlySickLeaves: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>WFH Status</label>
                  <select 
                    className={styles.formInput} 
                    value={formData.wfhStatus} 
                    onChange={e => setFormData({ ...formData, wfhStatus: e.target.value as 'Active' | 'Inactive' })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Organization Status *</label>
                  <select 
                    className={styles.formInput} 
                    required 
                    value={formData.status} 
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.formLabel}>Address</label>
                  <textarea 
                    className={styles.formInput} 
                    rows={2} 
                    value={formData.address} 
                    onChange={e => setFormData({ ...formData, address: e.target.value })} 
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => {
                  setShowModal(false);
                }}>Cancel</Button>
                <Button 
                  type="submit" 
                  variant="primary"
                  disabled={!isFormValid}
                >
                  {isEditing ? 'Update' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;