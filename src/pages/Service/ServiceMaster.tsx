import React, { useState, useEffect, useMemo } from 'react';
import styles from '../Employees/Employees.module.css'; // Reusing existing styles
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, Camera, Layers
} from 'lucide-react';
import { httpClient, imgUrl } from '../../lib/httpClient';
import toast from 'react-hot-toast';

interface Service {
  _id: string;
  serviceName: string;
  status: 'Active' | 'Inactive';
  serviceImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [formData, setFormData] = useState({
    serviceName: '',
    status: 'Active',
  });

  useEffect(() => {
    fetchServices();
  }, []);

const fetchServices = async () => {
  setLoading(true);
  try {
    const res = await httpClient.get('/services-master/get-services');
    // Adjust based on your backend response structure
    setServices(res.data?.data?.services || res.data?.data || []);
  } catch (err) {
    console.error("Error fetching services", err);
    toast.error('Failed to load services');
  } finally {
    setLoading(false);
  }
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
  };

  const resetForm = () => {
    setFormData({
      serviceName: '',
      status: 'Active',
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsEditing(false);
    setSelectedId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const loadingToast = toast.loading(isEditing ? 'Updating service...' : 'Creating service...');
    
    const data = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });

    if (selectedFile) {
      data.append('serviceImage', selectedFile);
    }

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing && selectedId) {
        await httpClient.put(`/services-master/update-service/${selectedId}`, data, config);
        toast.success('Service updated successfully!', {
          id: loadingToast,
        });
      } else {
        await httpClient.post('/services-master/create-service', data, config);
        toast.success('Service created successfully!', {
          id: loadingToast,
        });
      }
      setShowModal(false);
      resetForm();
      fetchServices();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Operation failed";
      toast.error(errorMessage, {
        id: loadingToast,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this service?")) {
      const loadingToast = toast.loading('Deleting service...');
      
      try {
        await httpClient.delete(`/services-master/delete-service/${id}`);
        toast.success('Service deleted successfully!', {
          id: loadingToast,
        });
        fetchServices();
      } catch (err) {
        toast.error('Failed to delete service', {
          id: loadingToast,
        });
      }
    }
  };

  const openEditModal = (service: Service) => {
    setIsEditing(true);
    setSelectedId(service._id);
    setFormData({
      serviceName: service.serviceName,
      status: service.status,
    });

    if (service.serviceImage) {
      setPreviewUrl(`${imgUrl}/services/${service.serviceImage}`);
    } else {
      setPreviewUrl(null);
    }
    setShowModal(true);
    
    toast.success('Loading service data', {
      duration: 1500,
    });
  };

  const filteredServices = useMemo(() => {
    return services.filter(s =>
      s.serviceName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [services, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / itemsPerPage));
  const paginatedData = filteredServices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className={styles.employees}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Services</h1>
          <p>Manage services for your organization</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search services..." 
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
            <Plus size={18} /> Add Service
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{textAlign:'center', padding: '2rem'}}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-2">Loading services...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((service) => (
                <tr key={service._id}>
                  <td>
                    <div className={styles.employeeCell}>
                      <div className={styles.avatar}>
                        {service.serviceImage ? (
                          <img 
                            src={`${imgUrl}/services/${service.serviceImage}`}
                            alt={service.serviceName}
                            className={styles.avatarImg}
                          />
                        ) : (
                          <div className={styles.defaultAvatar}>
                            <Layers size={20} />
                          </div>
                        )}
                      </div>
                      <div className={styles.employeeInfo}>
                        <span className={styles.employeeName}>{service.serviceName}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${service.status === 'Active' ? styles.active : styles.inactive}`}>
                      {service.status}
                    </span>
                  </td>
                  <td>
                    {service.createdAt ? 
                      new Date(service.createdAt).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      }) : 'N/A'
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Edit 
                        size={18} 
                        onClick={() => openEditModal(service)} 
                        className={styles.editIcon} 
                        style={{cursor:'pointer', color: '#6366f1'}} 
                      />
                      <Trash2 
                        size={18} 
                        onClick={() => handleDelete(service._id)} 
                        className={styles.deleteIcon} 
                        style={{cursor:'pointer', color: '#ef4444'}} 
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="text-gray-500">
                    {searchQuery ? 'No services match your search' : 'No services found'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Showing {filteredServices.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredServices.length)} of {filteredServices.length}
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
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '500px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{isEditing ? 'Edit' : 'Add'} Service</h2>
              <X 
                size={20} 
                onClick={() => {
                  setShowModal(false);
                }} 
                style={{cursor:'pointer'}} 
              />
            </div>
            <form onSubmit={handleSubmit} className={styles.modalBody}>
              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Service Name</label>
                  <input 
                    type="text" 
                    className={styles.formInput} 
                    required 
                    value={formData.serviceName} 
                    onChange={e => setFormData({...formData, serviceName: e.target.value})} 
                    placeholder="Enter service name"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Status</label>
                  <select 
                    className={styles.formSelect} 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as 'Active' | 'Inactive'})}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Image Upload */}
                <div className={styles.formGroup} style={{ marginTop: '10px' }}>
                  <div className={styles.imagePreviewWrapper} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className={styles.imagePlaceholder} style={{ width: '120px', height: '120px' }}>
                      {previewUrl ? (
                        <>
                          <img src={previewUrl} alt="Preview" className={styles.imgPreview} />
                          <button type="button" className={styles.removeImageBtn} onClick={removeImage}>
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <label htmlFor="service-image-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          <Camera size={32} />
                          <span style={{ fontSize: '12px', marginTop: '8px' }}>Upload Image</span>
                        </label>
                      )}
                    </div>
                    <label htmlFor="service-image-upload" className={styles.imageUploadLabel} style={{ cursor: 'pointer', marginTop: '10px' }}>
                      {isEditing ? 'Change Service Image' : 'Upload Service Image (Optional)'}
                    </label>
                    <input 
                      id="service-image-upload" 
                      type="file" 
                      accept="image/*" 
                      hidden 
                      onChange={handleImageChange} 
                    />
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      Recommended: Square image, max 2MB
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => {
                  setShowModal(false);
                }}>Cancel</Button>
                <Button type="submit" variant="primary">
                  {isEditing ? 'Update' : 'Save'} Service
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;