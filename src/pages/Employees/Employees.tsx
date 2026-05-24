import React, { useState, useEffect, useMemo } from 'react';
import styles from './Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, ArrowUpDown, Trash2, Edit, Camera, Map, Filter
} from 'lucide-react';
import { httpClient, imgUrl } from '../../lib/httpClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Employee {
  _id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  organisation: { _id: string; name: string };
  department: { _id: string; name: string };
  role: { _id: string; name: string };
  status: 'Active' | 'Inactive';
  employementType: 'Prohibition' | 'Permanent';
  image?: string;
  date_of_joining: string;
}

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [organizations, setOrganizations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [approvers, setApprovers] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const navigate = useNavigate();
  
  const handleTrackingRedirect = (employee_id: string) => {
    navigate(`/employee-tracking/${employee_id}`);
  };

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    organisation: '',
    department: '',
    role: '',
    bond: 0,
    leavesCount: 0,
    image: '',
    employementType: 'Permanent',
    tracking: 'Active',
    status: 'Active',
    date_of_joining: '',
    reporting_to: '',
    password: ''
  });

  useEffect(() => {
    fetchOrganizations();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (formData.organisation) {
      fetchDepartments(formData.organisation);
    } else {
      setDepartments([]);
    }
  }, [formData.organisation]);

  useEffect(() => {
    if (formData.department) {
      fetchRoles(formData.department);
      fetchApprovers(formData.department);
    } else {
      setRoles([]);
      setApprovers([]);
    }
  }, [formData.department]);

  // Filter employees when selectedOrg or searchQuery changes
  useEffect(() => {
    filterEmployees();
  }, [employees, selectedOrg, searchQuery]);

  const fetchOrganizations = async () => {
    try {
      const res = await httpClient.get('/org/get-all-orgs');
      setOrganizations(res.data?.data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    }
  };

  const fetchDepartments = async (orgId: string) => {
    try {
      const res = await httpClient.get(`/dept/get-all-depts?org_id=${orgId}`);
      setDepartments(res.data?.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const fetchRoles = async (deptId: string) => {
    try {
      const res = await httpClient.get(`/role/get-all-roles?dept_id=${deptId}`);
      setRoles(res.data?.data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load roles');
    }
  };

  const fetchApprovers = async (deptId: string) => {
    try {
      const res = await httpClient.get(`/employee/get-approvers?department=${deptId}`);
      setApprovers(res.data?.data || []);
    } catch (error) {
      console.error('Error fetching approvers:', error);
      toast.error('Failed to load approvers');
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/employee/get-all-employees');
      setEmployees(res.data?.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally { 
      setLoading(false); 
    }
  };

  const filterEmployees = () => {
    let filtered = [...employees];
    
    // Filter by organization if selected
    if (selectedOrg) {
      filtered = filtered.filter(emp => emp.organisation?._id === selectedOrg);
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(emp =>
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredEmployees(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOrg(e.target.value);
  };

  const clearFilters = () => {
    setSelectedOrg('');
    setSearchQuery('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData(prev => ({ ...prev, image: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const loadingToast = toast.loading(isEditing ? 'Updating employee...' : 'Creating employee...');
    
    const data = new FormData();
    
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        data.append(key, value.toString());
      }
    });

    if (selectedFile) {
      data.append('image', selectedFile);
    }

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing && selectedId) {
        await httpClient.put(`/employee/update-employee/${selectedId}`, data, config);
        toast.success('Employee updated successfully!', {
          id: loadingToast,
        });
      } else {
        await httpClient.post('/employee/create-employee', data, config);
        toast.success('Employee created successfully!', {
          id: loadingToast,
        });
      }
      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Operation failed";
      toast.error(errorMessage, {
        id: loadingToast,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      const loadingToast = toast.loading('Deleting employee...');
      
      try {
        await httpClient.delete(`/employee/delete-employee/${id}`);
        toast.success('Employee deleted successfully!', {
          id: loadingToast,
        });
        fetchEmployees();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete employee', {
          id: loadingToast,
        });
      }
    }
  };

  const openEditModal = (emp: any) => {
    setIsEditing(true);
    setSelectedId(emp._id);
    
    setFormData({
      full_name: emp.full_name,
      email: emp.email,
      phone: emp.phone,
      organisation: emp.organisation?._id || '',
      department: emp.department?._id || '',
      role: emp.role?._id || '',
      bond: emp.bond || 0,
      leavesCount: emp.leavesCount || 0,
      image: emp.image || '',
      employementType: emp.employementType,
      tracking: emp.tracking || 'Active',
      status: emp.status,
      date_of_joining: emp.date_of_joining?.split('T')[0] || '',
      reporting_to: emp.reporting_to?._id || '',
      password: ''
    });
    
    if (emp.image) {
      setPreviewUrl(`${imgUrl}/employees/${emp.image}`);
    } else {
      setPreviewUrl(null);
    }
    
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '', email: '', phone: '', organisation: '',
      department: '', role: '', bond: 0, leavesCount: 0, image: '',
      employementType: 'Permanent', tracking: 'Active', status: 'Active',
      date_of_joining: '', reporting_to: '', password: ''
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsEditing(false);
    setSelectedId(null);
  };

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage));
  const paginatedData = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className={styles.employees}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Employees</h1>
          <p>Manage employee profiles and organizational structure</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Search by name, ID or email..." 
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className={styles.filterSelect}>
              <Filter size={18} className={styles.filterIcon} />
              <select 
                value={selectedOrg} 
                onChange={handleOrgChange}
                className={styles.orgSelect}
              >
                <option value="">All Organizations</option>
                {organizations.map((org: any) => (
                  <option key={org._id} value={org._id}>{org.name}</option>
                ))}
              </select>
            </div>

            {(selectedOrg || searchQuery) && (
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
            onClick={() => { 
              resetForm(); 
              setShowModal(true);
            }}
          >
            <Plus size={18} /> Add Employee
          </button>
        </div>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Employees:</span>
          <span className={styles.statValue}>{employees.length}</span>
        </div>
        {selectedOrg && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredEmployees.length}</span>
          </div>
        )}
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Organization</th>
              <th>Dept / Role</th>
              <th>Joining Date</th>
              <th>Tracking</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{textAlign:'center', padding: '2rem'}}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-2">Loading employees...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{textAlign:'center', padding: '2rem'}}>
                  <div className="text-gray-500">
                    {selectedOrg ? 'No employees found for this organization' : 'No employees found'}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((emp) => (
                <tr key={emp._id}>
                  <td>
                    <div className={styles.employeeCell}>
                      <div className={styles.avatar}>
                        {emp.image ? (
                          <img 
                            src={`${imgUrl}/employees/${emp.image}`} 
                            alt={emp.full_name} 
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerText = emp.full_name.charAt(0);
                            }}
                          />
                        ) : (
                          emp.full_name.charAt(0)
                        )}
                      </div>
                      <div className={styles.employeeInfo}>
                        <span className={styles.employeeName}>{emp.full_name}</span>
                        <span className={styles.employeeEmail}>{emp.employee_id}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.orgBadge}>
                      {emp.organisation?.name || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.deptText}>{emp.department?.name}</div>
                    <div className={styles.roleText}>{emp.role?.name}</div>
                  </td>
                  <td>{new Date(emp.date_of_joining).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className={styles.trackBtn} 
                      onClick={() => handleTrackingRedirect(emp.employee_id)}
                      title="View Agent Map"
                    >
                      <Map size={18} />
                      <span>Track</span>
                    </button>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${emp.status === 'Active' ? styles.active : styles.inactive}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <Edit 
                        size={18} 
                        onClick={() => openEditModal(emp)} 
                        className={styles.editIcon} 
                      />
                      <Trash2 
                        size={18} 
                        onClick={() => handleDelete(emp._id)} 
                        className={styles.deleteIcon} 
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filteredEmployees.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
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

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '800px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{isEditing ? 'Edit' : 'Add'} Employee</h2>
              <X 
                size={20} 
                onClick={() => {
                  setShowModal(false);
                }} 
                style={{cursor:'pointer'}} 
              />
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  {/* Form fields */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Full Name</label>
                    <input 
                      type="text" 
                      className={styles.formInput} 
                      required 
                      value={formData.full_name} 
                      onChange={e => setFormData({...formData, full_name: e.target.value})} 
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Email</label>
                    <input 
                      type="email" 
                      className={styles.formInput} 
                      required 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Phone</label>
                    <input 
                      type="text" 
                      className={styles.formInput} 
                      required 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Organization</label>
                    <select 
                      className={styles.formSelect} 
                      required 
                      value={formData.organisation} 
                      onChange={e => setFormData({...formData, organisation: e.target.value})}
                    >
                      <option value="">Select Organization</option>
                      {organizations.map((org: any) => (
                        <option key={org._id} value={org._id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Department</label>
                    <select 
                      className={styles.formSelect} 
                      required 
                      disabled={!formData.organisation}
                      value={formData.department} 
                      onChange={e => setFormData({...formData, department: e.target.value})}
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept: any) => (
                        <option key={dept._id} value={dept._id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Role</label>
                    <select 
                      className={styles.formSelect} 
                      required 
                      disabled={!formData.department}
                      value={formData.role} 
                      onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="">Select Role</option>
                      {roles.map((role: any) => (
                        <option key={role._id} value={role._id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Reporting To</label>
                    <select 
                      className={styles.formSelect} 
                      value={formData.reporting_to} 
                      disabled={!formData.department} 
                      onChange={e => setFormData({...formData, reporting_to: e.target.value})}
                    >
                      <option value="">No Manager (Direct Report)</option>
                      {approvers.map((app: any) => (
                        <option key={app._id} value={app._id}>{app.full_name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Date of Joining</label>
                    <input 
                      type="date" 
                      className={styles.formInput} 
                      required 
                      value={formData.date_of_joining} 
                      onChange={e => setFormData({...formData, date_of_joining: e.target.value})} 
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Bond (Years)</label>
                    <input 
                      type="number" 
                      className={styles.formInput} 
                      required 
                      value={formData.bond} 
                      onChange={e => setFormData({...formData, bond: parseInt(e.target.value)})} 
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Employment Type</label>
                    <select 
                      className={styles.formSelect} 
                      value={formData.employementType} 
                      onChange={e => setFormData({...formData, employementType: e.target.value as any})}
                    >
                      <option value="Prohibition">Prohibition</option>
                      <option value="Permanent">Permanent</option>
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Status</label>
                    <select 
                      className={styles.formSelect} 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  
                  {!isEditing && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Password</label>
                      <input 
                        type="password" 
                        className={styles.formInput} 
                        required 
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                      />
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', marginTop: '20px', marginBottom: '20px' }}>
                  <div className={styles.formGroup} style={{ flex: 1, textAlign: 'center' }}>
                    <div className={styles.imagePreviewWrapper}>
                      <div className={styles.imagePlaceholder}>
                        {previewUrl ? (
                          <>
                            <img src={previewUrl} alt="Preview" className={styles.imgPreview} />
                            <button type="button" className={styles.removeImageBtn} onClick={removeImage}>
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <label htmlFor="image-upload" style={{ cursor: 'pointer' }}>
                            <Camera size={32} />
                          </label>
                        )}
                      </div>
                      <label htmlFor="image-upload" className={styles.imageUploadLabel} style={{ cursor: 'pointer', display: 'block', marginTop: '5px' }}>
                        {isEditing ? 'Change Photo' : 'Upload Photo'}
                      </label>
                    </div>
                    <input id="image-upload" type="file" accept="image/*" hidden onChange={handleImageChange} />
                  </div>
                  
                  <div className={styles.formGroup} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="checkbox" 
                      id="tracking"
                      className={styles.formCheckbox}
                      checked={formData.tracking === 'Active'} 
                      onChange={(e) => {
                        setFormData({
                          ...formData, 
                          tracking: e.target.checked ? 'Active' : 'Inactive' 
                        });
                      }} 
                    />
                    <label htmlFor="tracking" className={styles.formLabel} style={{ marginBottom: 0, cursor: 'pointer' }}>
                      Enable Tracking
                    </label>
                  </div>
                </div>
              </div>
              
              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => {
                  setShowModal(false);
                }}>Cancel</Button>
                <Button type="submit" variant="primary">{isEditing ? 'Update' : 'Save'} Employee</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;