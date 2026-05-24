import React, { useState, useEffect, useMemo } from 'react';
import styles from '../Employees/Employees.module.css'; // Reusing your existing styles
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, Camera, Calendar
} from 'lucide-react';
import { httpClient, imgUrl } from '../../lib/httpClient';

interface Holiday {
  _id: string;
  holidayName: string;
  date: string;
  holidayType: 'Public' | 'Optional' | 'Company Specific';
  status: 'Active' | 'Inactive';
  holidayImage?: string;
  organisationId: { _id: string; name: string } | string;
}

const Holidays: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [organizations, setOrganizations] = useState([]);
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
    holidayName: '',
    date: '',
    holidayType: 'Public',
    status: 'Active',
    organisationId: '',
  });

  useEffect(() => {
    fetchOrganizations();
    fetchHolidays();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await httpClient.get('/org/get-all-orgs');
      setOrganizations(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching orgs", err);
    }
  };

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/holidays/get-holidays');
      setHolidays(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching holidays", err);
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
      holidayName: '',
      date: '',
      holidayType: 'Public',
      status: 'Active',
      organisationId: '',
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsEditing(false);
    setSelectedId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });

    if (selectedFile) {
      data.append('holidayImage', selectedFile);
    }

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing && selectedId) {
        await httpClient.put(`/holidays/update-holiday/${selectedId}`, data, config);
      } else {
        await httpClient.post('/holidays/create-holiday', data, config);
      }
      setShowModal(false);
      resetForm();
      fetchHolidays();
    } catch (err: any) {
      alert(err.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this holiday?")) {
      try {
        await httpClient.delete(`/holidays/delete-holiday/${id}`);
        fetchHolidays();
      } catch (err) {
        alert("Failed to delete");
      }
    }
  };

  const openEditModal = (holiday: any) => {
    setIsEditing(true);
    setSelectedId(holiday._id);
    setFormData({
      holidayName: holiday.holidayName,
      date: holiday.date?.split('T')[0] || '',
      holidayType: holiday.holidayType,
      status: holiday.status,
      organisationId: typeof holiday.organisationId === 'object' ? holiday.organisationId._id : holiday.organisationId,
    });

    if (holiday.holidayImage) {
        // Adjust this path based on where your backend serves holiday images
      setPreviewUrl(`${imgUrl}/${holiday.holidayImage}`);
    } else {
      setPreviewUrl(null);
    }
    setShowModal(true);
  };

  const filteredHolidays = useMemo(() => {
    return holidays.filter(h =>
      h.holidayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [holidays, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredHolidays.length / itemsPerPage));
  const paginatedData = filteredHolidays.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className={styles.employees}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Holidays</h1>
          <p>Manage public and company holidays</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search holidays..." 
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className={styles.addBtn} onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={18} /> Add Holiday
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Holiday Name</th>
              <th>Date</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{textAlign:'center'}}>Loading...</td></tr>
            ) : paginatedData.map((holiday) => (
              <tr key={holiday._id}>
                <td>
                  <div className={styles.employeeCell}>
                    <div className={styles.avatar}>
                        <img 
                           src={`${imgUrl}/${holiday.holidayImage}`}
                          alt={holiday.holidayName} 
                   
                        />
                
                    </div>
                    <div className={styles.employeeInfo}>
                      <span className={styles.employeeName}>{holiday.holidayName}</span>
                    </div>
                  </div>
                </td>
                <td>{new Date(holiday.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td><span className={styles.deptText}>{holiday.holidayType}</span></td>
                <td>
                  <span className={`${styles.statusBadge} ${holiday.status === 'Active' ? styles.active : styles.inactive}`}>
                    {holiday.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Edit size={18} onClick={() => openEditModal(holiday)} className={styles.editIcon} style={{cursor:'pointer'}} />
                    <Trash2 size={18} onClick={() => handleDelete(holiday._id)} className={styles.deleteIcon} style={{cursor:'pointer'}} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Showing {filteredHolidays.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredHolidays.length)} of {filteredHolidays.length}
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
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '600px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{isEditing ? 'Edit' : 'Add'} Holiday</h2>
              <X size={20} onClick={() => setShowModal(false)} style={{cursor:'pointer'}} />
            </div>
            <form onSubmit={handleSubmit} className={styles.modalBody}>
              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.formLabel}>Holiday Name</label>
                  <input 
                    type="text" 
                    className={styles.formInput} 
                    required 
                    value={formData.holidayName} 
                    onChange={e => setFormData({...formData, holidayName: e.target.value})} 
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Date</label>
                  <input 
                    type="date" 
                    className={styles.formInput} 
                    required 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Organization</label>
                  <select 
                    className={styles.formSelect} 
                    required 
                    value={formData.organisationId} 
                    onChange={e => setFormData({...formData, organisationId: e.target.value})}
                  >
                    <option value="">Select Organization</option>
                    {organizations.map((org: any) => <option key={org._id} value={org._id}>{org.name}</option>)}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Holiday Type</label>
                  <select 
                    className={styles.formSelect} 
                    value={formData.holidayType} 
                    onChange={e => setFormData({...formData, holidayType: e.target.value as any})}
                  >
                    <option value="Public">Public</option>
                    <option value="Optional">Optional</option>
                    <option value="Company Specific">Company Specific</option>
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

                {/* Image Upload */}
                <div className={styles.formGroup} style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                  <div className={styles.imagePreviewWrapper} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className={styles.imagePlaceholder} style={{ width: '100px', height: '100px' }}>
                      {previewUrl ? (
                        <>
                          <img src={previewUrl} alt="Preview" className={styles.imgPreview} />
                          <button type="button" className={styles.removeImageBtn} onClick={removeImage}>
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <label htmlFor="holiday-image-upload" style={{ cursor: 'pointer' }}>
                          <Camera size={32} />
                        </label>
                      )}
                    </div>
                    <label htmlFor="holiday-image-upload" className={styles.imageUploadLabel} style={{ cursor: 'pointer', marginTop: '10px' }}>
                      {isEditing ? 'Change Image' : 'Upload Holiday Image'}
                    </label>
                    <input 
                      id="holiday-image-upload" 
                      type="file" 
                      accept="image/*" 
                      hidden 
                      onChange={handleImageChange} 
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">{isEditing ? 'Update' : 'Save'} Holiday</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Holidays;