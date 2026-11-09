import React, { useState, useEffect, useCallback } from 'react';
import styles from '../Employees/Employees.module.css';
import { Button } from '../../components/ui/Button/Button';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  X, Trash2, Edit, BookOpen, ChevronDown, ChevronUp,
  Video, Clock, Link, CalendarDays, ArrowLeft, File, Upload, FileText, ExternalLink, PlusCircle, MinusCircle
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useParams, useNavigate } from 'react-router-dom';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface LessonDocument {
  _id?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt?: string;
}

interface CourseLesson {
  _id: string;
  title: string;
}

interface CourseChapter {
  _id: string;
  title: string;
  lessons: CourseLesson[];
}

interface BatchOption {
  value: string;
  label: string;
  courseId: string;
}

// A pending document slot: has a tempId and optionally a chosen File
interface PendingDocument {
  tempId: string;
  file: File | null;
}

interface FormLesson {
  lessonId: string;
  lessonTitle: string;
  videoUrl: string;
  duration: string;
  liveSessionLink: string;
  liveSessionDate: Date | null;
  documents: LessonDocument[];       // already-saved docs from the server
  pendingDocuments: PendingDocument[]; // new slots waiting to be submitted
}

interface FormChapter {
  chapterId: string;
  chapterTitle: string;
  lessons: FormLesson[];
  expanded: boolean;
}

interface ManageBatchLesson {
  lessonId: string;
  lessonTitle: string;
  videoUrl: string;
  duration: number;
  liveSessionLink: string;
  liveSessionDate: string | null;
  documents: LessonDocument[];
}

interface ManageBatchChapter {
  chapterId: string;
  chapterTitle: string;
  lessons: ManageBatchLesson[];
}

interface ManageBatch {
  _id: string;
  batchId: { _id: string; batchStartDate: string; batchTimings: string };
  courseId: { _id: string; title: string };
  curriculum: ManageBatchChapter[];
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateTempId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const buildFormCurriculum = (chapters: CourseChapter[]): FormChapter[] =>
  chapters.map(ch => ({
    chapterId: ch._id,
    chapterTitle: ch.title,
    expanded: true,
    lessons: ch.lessons.map(l => ({
      lessonId: l._id,
      lessonTitle: l.title,
      videoUrl: '',
      duration: '',
      liveSessionLink: '',
      liveSessionDate: null,
      documents: [],
      pendingDocuments: [],
    })),
  }));

const rebuildFormFromSaved = (curriculum: ManageBatchChapter[]): FormChapter[] =>
  curriculum.map(ch => ({
    chapterId: ch.chapterId,
    chapterTitle: ch.chapterTitle,
    expanded: true,
    lessons: ch.lessons.map(l => ({
      lessonId: l.lessonId,
      lessonTitle: l.lessonTitle,
      videoUrl: l.videoUrl || '',
      duration: l.duration ? String(l.duration) : '',
      liveSessionLink: l.liveSessionLink || '',
      liveSessionDate: l.liveSessionDate ? new Date(l.liveSessionDate) : null,
      documents: l.documents || [],
      pendingDocuments: [],
    })),
  }));

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '8px',
    borderColor: state.isFocused ? '#6366f1' : '#e5e7eb',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
    '&:hover': { borderColor: '#6366f1' },
    fontSize: '14px',
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: '14px',
    backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#eef2ff' : '#fff',
    color: state.isSelected ? '#fff' : '#111827',
  }),
  placeholder: (base: any) => ({ ...base, color: '#9ca3af', fontSize: '14px' }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
};

// ─── CurriculumEditor ─────────────────────────────────────────────────────────

interface CurriculumEditorProps {
  curriculum: FormChapter[];
  loadingCurriculum: boolean;
  selectedBatch: BatchOption | null;
  toggleChapter: (idx: number) => void;
  updateLesson: (chapterIdx: number, lessonIdx: number, field: keyof FormLesson, value: any) => void;
  addDocumentSlot: (chapterIdx: number, lessonIdx: number) => void;
  removeDocumentSlot: (chapterIdx: number, lessonIdx: number, tempId: string) => void;
  handleFileSelect: (chapterIdx: number, lessonIdx: number, tempId: string, file: File) => void;
  handleDeleteSavedDocument: (chapterIdx: number, lessonIdx: number, docId: string) => void;
}

const CurriculumEditor: React.FC<CurriculumEditorProps> = ({
  curriculum,
  loadingCurriculum,
  selectedBatch,
  toggleChapter,
  updateLesson,
  addDocumentSlot,
  removeDocumentSlot,
  handleFileSelect,
  handleDeleteSavedDocument,
}) => {
  if (!selectedBatch) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
        <BookOpen size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
        <p>Select a batch above to load its curriculum</p>
      </div>
    );
  }

  if (loadingCurriculum) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          <span>Loading curriculum...</span>
        </div>
      </div>
    );
  }

  if (curriculum.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
        <p>No curriculum found for this course.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {curriculum.map((chapter, chIdx) => (
        <div
          key={chapter.chapterId}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {/* Chapter header */}
          <div
            onClick={() => toggleChapter(chIdx)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: '#f3f4f6',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} style={{ color: '#6366f1' }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                {chapter.chapterTitle}
              </span>
              <span style={{
                background: '#e0e7ff', color: '#4338ca',
                borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 500,
              }}>
                {chapter.lessons.length} lesson{chapter.lessons.length !== 1 ? 's' : ''}
              </span>
            </div>
            {chapter.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {/* Lessons */}
          {chapter.expanded && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {chapter.lessons.map((lesson, lIdx) => (
                <div
                  key={lesson.lessonId}
                  style={{
                    background: '#fafafa',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  {/* Lesson title */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 4,
                    }}>
                      <FileText size={14} style={{ color: '#6366f1' }} />
                      {lesson.lessonTitle}
                    </div>
                  </div>

                  {/* Video URL + Duration */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>
                        <Video size={13} style={{ marginRight: 4 }} /> Video URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={lesson.videoUrl}
                        onChange={e => updateLesson(chIdx, lIdx, 'videoUrl', e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        <Clock size={13} style={{ marginRight: 4 }} /> Duration (mins)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 45"
                        min={0}
                        value={lesson.duration}
                        onChange={e => updateLesson(chIdx, lIdx, 'duration', e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Live session link + date */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>
                        <Link size={13} style={{ marginRight: 4 }} /> Live Session Link
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={lesson.liveSessionLink}
                        onChange={e => updateLesson(chIdx, lIdx, 'liveSessionLink', e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        <CalendarDays size={13} style={{ marginRight: 4 }} /> Live Session Date
                      </label>
                      <DatePicker
                        selected={lesson.liveSessionDate}
                        onChange={(date) => updateLesson(chIdx, lIdx, 'liveSessionDate', date)}
                        showTimeSelect
                        dateFormat="dd/MM/yyyy HH:mm"
                        placeholderText="Pick date & time"
                        customInput={<input style={inputStyle} />}
                        popperPlacement="bottom-start"
                      />
                    </div>
                  </div>

                  {/* ── Documents section ── */}
                  <div>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: 10,
                    }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>
                        <File size={13} style={{ marginRight: 4 }} /> Documents
                      </label>
                      {/* + button to add a new file slot */}
                      <button
                        type="button"
                        onClick={() => addDocumentSlot(chIdx, lIdx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: 'none', border: '1px solid #6366f1',
                          borderRadius: 6, padding: '4px 10px',
                          color: '#6366f1', fontSize: 12, fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        <PlusCircle size={14} /> Add Document
                      </button>
                    </div>

                    {/* Already-saved documents */}
                    {lesson.documents.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                        {lesson.documents.map((doc) => (
                          <div
                            key={doc._id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              background: '#fff', border: '1px solid #d1fae5',
                              borderRadius: 6, padding: '8px 12px',
                            }}
                          >
                            <FileText size={14} style={{ color: '#059669', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {doc.fileName}
                              </div>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>
                                {formatFileSize(doc.fileSize)} · {doc.fileType}
                              </div>
                            </div>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#6366f1', flexShrink: 0 }}
                              title="Open"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button
                              type="button"
                              onClick={() => doc._id && handleDeleteSavedDocument(chIdx, lIdx, doc._id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', flexShrink: 0, padding: 2 }}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pending document slots (new, not yet submitted) */}
                    {lesson.pendingDocuments.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {lesson.pendingDocuments.map((pd) => (
                          <div
                            key={pd.tempId}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              background: '#fff', border: '1px dashed #d1d5db',
                              borderRadius: 6, padding: '8px 12px',
                            }}
                          >
                            <Upload size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />

                            {/* File picker */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {pd.file ? (
                                <div style={{ fontSize: 13, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {pd.file.name}
                                  <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>
                                    ({formatFileSize(pd.file.size)})
                                  </span>
                                </div>
                              ) : (
                                <span style={{ fontSize: 12, color: '#9ca3af' }}>No file chosen</span>
                              )}
                            </div>

                            <label
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                background: '#f3f4f6', border: '1px solid #d1d5db',
                                borderRadius: 5, padding: '4px 10px',
                                fontSize: 12, color: '#374151', cursor: 'pointer',
                                flexShrink: 0, whiteSpace: 'nowrap',
                              }}
                            >
                              <Upload size={12} /> Choose
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileSelect(chIdx, lIdx, pd.tempId, file);
                                }}
                              />
                            </label>

                            {/* − button to remove this slot */}
                            <button
                              type="button"
                              onClick={() => removeDocumentSlot(chIdx, lIdx, pd.tempId)}
                              style={{
                                background: 'none', border: 'none',
                                cursor: 'pointer', color: '#ef4444',
                                flexShrink: 0, padding: 2,
                              }}
                              title="Remove"
                            >
                              <MinusCircle size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {lesson.documents.length === 0 && lesson.pendingDocuments.length === 0 && (
                      <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                        No documents yet. Click "Add Document" to attach files.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center',
  fontSize: 12, fontWeight: 500, color: '#6b7280',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  border: '1px solid #e5e7eb', borderRadius: 6,
  fontSize: 13, color: '#111827', outline: 'none',
  background: '#fff', boxSizing: 'border-box',
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ManageBatches: React.FC = () => {
  const { batchId: routeBatchId } = useParams<{ batchId?: string }>();
  const navigate = useNavigate();

  const isDirectMode = !!routeBatchId;

  const [manageBatches, setManageBatches] = useState<ManageBatch[]>([]);
  const [filteredData, setFilteredData] = useState<ManageBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [batchOptions, setBatchOptions] = useState<BatchOption[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [selectedBatch, setSelectedBatch] = useState<BatchOption | null>(null);
  const [curriculum, setCurriculum] = useState<FormChapter[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  const [directBatchInfo, setDirectBatchInfo] = useState<{
    label: string;
    courseId: string;
    existingManageId: string | null;
  } | null>(null);
  const [directPageLoading, setDirectPageLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (isDirectMode) {
      loadDirectBatch(routeBatchId!);
    } else {
      fetchManageBatches();
      fetchBatchOptions();
    }
  }, [routeBatchId]);

  useEffect(() => {
    let filtered = [...manageBatches];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        mb =>
          mb.courseId?.title?.toLowerCase().includes(q) ||
          mb.batchId?.batchTimings?.toLowerCase().includes(q),
      );
    }
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [manageBatches, searchQuery]);

  // ─── Document slot handlers ────────────────────────────────────────────────

  // Add a new empty pending slot (the + button)
  const addDocumentSlot = (chapterIdx: number, lessonIdx: number) => {
    const tempId = generateTempId();
    setCurriculum(prev => {
      const next = prev.map((ch, ci) => {
        if (ci !== chapterIdx) return ch;
        return {
          ...ch,
          lessons: ch.lessons.map((l, li) => {
            if (li !== lessonIdx) return l;
            return {
              ...l,
              pendingDocuments: [...l.pendingDocuments, { tempId, file: null }],
            };
          }),
        };
      });
      return next;
    });
  };

  // Remove a pending slot (the − button)
  const removeDocumentSlot = (chapterIdx: number, lessonIdx: number, tempId: string) => {
    setCurriculum(prev =>
      prev.map((ch, ci) => {
        if (ci !== chapterIdx) return ch;
        return {
          ...ch,
          lessons: ch.lessons.map((l, li) => {
            if (li !== lessonIdx) return l;
            return {
              ...l,
              pendingDocuments: l.pendingDocuments.filter(pd => pd.tempId !== tempId),
            };
          }),
        };
      })
    );
  };

  // Assign a File object to a pending slot
  const handleFileSelect = (
    chapterIdx: number,
    lessonIdx: number,
    tempId: string,
    file: File,
  ) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }
    const allowed = [
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'image/jpeg', 'image/png', 'image/gif',
    ];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, and image files are allowed');
      return;
    }
    setCurriculum(prev =>
      prev.map((ch, ci) => {
        if (ci !== chapterIdx) return ch;
        return {
          ...ch,
          lessons: ch.lessons.map((l, li) => {
            if (li !== lessonIdx) return l;
            return {
              ...l,
              pendingDocuments: l.pendingDocuments.map(pd =>
                pd.tempId === tempId ? { ...pd, file } : pd
              ),
            };
          }),
        };
      })
    );
  };

  // Delete an already-saved document via API
  const handleDeleteSavedDocument = async (
    chapterIdx: number,
    lessonIdx: number,
    docId: string,
  ) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await httpClient.delete(`/manage-batches/documents/${docId}`);
      setCurriculum(prev =>
        prev.map((ch, ci) => {
          if (ci !== chapterIdx) return ch;
          return {
            ...ch,
            lessons: ch.lessons.map((l, li) => {
              if (li !== lessonIdx) return l;
              return { ...l, documents: l.documents.filter(d => d._id !== docId) };
            }),
          };
        })
      );
      toast.success('Document deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete document');
    }
  };

  // ─── Batch loading ─────────────────────────────────────────────────────────

  const loadDirectBatch = async (bId: string) => {
    setDirectPageLoading(true);
    try {
      const batchRes = await httpClient.get(`/batches/${bId}`);
      const batch = batchRes.data?.batch || batchRes.data;

      const batchLabel = `${batch.courseId?.title || 'Course'} — ${batch.batchTimings} (${new Date(batch.batchStartDate).toLocaleDateString('en-IN')})`;
      const courseId = batch.courseId?._id || batch.courseId;

      let existingManageId: string | null = null;
      let existingCurriculum: ManageBatchChapter[] | null = null;
      try {
        const mbRes = await httpClient.get(`/manage-batches/batch/${bId}`);
        const mb = mbRes.data?.manageBatch;
        if (mb) {
          existingManageId = mb._id;
          existingCurriculum = mb.curriculum;
        }
      } catch { /* 404 = no curriculum yet */ }

      setDirectBatchInfo({ label: batchLabel, courseId, existingManageId });

      const batchOption: BatchOption = { value: bId, label: batchLabel, courseId };
      setSelectedBatch(batchOption);

      if (existingCurriculum) {
        setCurriculum(rebuildFormFromSaved(existingCurriculum));
        setIsEditing(true);
        setSelectedId(existingManageId);
      } else {
        await loadCourseCurriculum(courseId);
        setIsEditing(false);
        setSelectedId(null);
      }

      setShowModal(true);
    } catch {
      toast.error('Failed to load batch details');
    } finally {
      setDirectPageLoading(false);
    }
  };

  const fetchManageBatches = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/manage-batches');
      setManageBatches(res.data?.manageBatches || []);
    } catch {
      toast.error('Failed to load managed batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchOptions = async () => {
    try {
      const res = await httpClient.get('/batches');
      const batches = res.data?.batches || [];
      setBatchOptions(
        batches.map((b: any) => ({
          value: b._id,
          label: `${b.courseId?.title || 'Course'} — ${b.batchTimings} (${new Date(b.batchStartDate).toLocaleDateString('en-IN')})`,
          courseId: b.courseId?._id || '',
        })),
      );
    } catch {
      toast.error('Failed to load batches');
    }
  };

  const loadCourseCurriculum = async (courseId: string) => {
    setLoadingCurriculum(true);
    try {
      const res = await httpClient.get(`/courses/${courseId}`);
      const courseCurriculum: CourseChapter[] =
        res.data?.course?.curriculum || res.data?.curriculum || [];
      setCurriculum(buildFormCurriculum(courseCurriculum));
    } catch {
      toast.error('Failed to fetch course curriculum');
      setCurriculum([]);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  const handleBatchSelect = useCallback(async (opt: BatchOption | null) => {
    setSelectedBatch(opt);
    setCurriculum([]);
    if (!opt?.courseId) return;
    await loadCourseCurriculum(opt.courseId);
  }, []);

  const updateLesson = (
    chapterIdx: number,
    lessonIdx: number,
    field: keyof FormLesson,
    value: any,
  ) => {
    setCurriculum(prev =>
      prev.map((ch, ci) => {
        if (ci !== chapterIdx) return ch;
        return {
          ...ch,
          lessons: ch.lessons.map((l, li) => {
            if (li !== lessonIdx) return l;
            return { ...l, [field]: value };
          }),
        };
      })
    );
  };

  const toggleChapter = (idx: number) => {
    setCurriculum(prev =>
      prev.map((ch, i) => i === idx ? { ...ch, expanded: !ch.expanded } : ch)
    );
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing && !selectedBatch) return toast.error('Please select a batch');
    if (curriculum.length === 0) return toast.error('Curriculum is empty');

    // Validate: all pending slots must have a file chosen
    for (let ci = 0; ci < curriculum.length; ci++) {
      for (let li = 0; li < curriculum[ci].lessons.length; li++) {
        const emptySlots = curriculum[ci].lessons[li].pendingDocuments.filter(pd => !pd.file);
        if (emptySlots.length > 0) {
          toast.error(
            `Please choose a file for each document slot in "${curriculum[ci].chapterTitle} > ${curriculum[ci].lessons[li].lessonTitle}", or remove empty slots.`
          );
          return;
        }
      }
    }

    const loadingToast = toast.loading(isEditing ? 'Updating curriculum...' : 'Saving curriculum...');

    try {
      const formData = new FormData();

      if (!isEditing) {
        formData.append('batchId', selectedBatch!.value);
        formData.append('courseId', selectedBatch!.courseId);
      }

      // Build the curriculum payload (without pending slots — those go as files)
      const curriculumPayload = curriculum.map((ch, chIdx) => ({
        chapterId: ch.chapterId,
        chapterTitle: ch.chapterTitle,
        lessons: ch.lessons.map((l, lIdx) => {
          // Append each pending file with the pattern docs[chIdx][lIdx]
          l.pendingDocuments.forEach((pd) => {
            if (pd.file) {
              formData.append(`docs[${chIdx}][${lIdx}]`, pd.file, pd.file.name);
            }
          });

          return {
            lessonId: l.lessonId,
            lessonTitle: l.lessonTitle,
            videoUrl: l.videoUrl,
            duration: l.duration ? parseFloat(l.duration) : 0,
            liveSessionLink: l.liveSessionLink,
            liveSessionDate: l.liveSessionDate?.toISOString() || null,
            documents: l.documents, // already-saved docs preserved
          };
        }),
      }));

      formData.append('curriculum', JSON.stringify(curriculumPayload));

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (isEditing && selectedId) {
        await httpClient.put(`/manage-batches/${selectedId}`, formData, config);
        toast.success('Curriculum updated!', { id: loadingToast });
      } else {
        await httpClient.post('/manage-batches', formData, config);
        toast.success('Curriculum saved!', { id: loadingToast });
      }

      setShowModal(false);
      resetForm();
      isDirectMode ? navigate('/batches') : fetchManageBatches();

    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed', { id: loadingToast });
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete curriculum for "${label}"?`)) return;
    const t = toast.loading('Deleting...');
    try {
      await httpClient.delete(`/manage-batches/${id}`);
      toast.success('Deleted successfully!', { id: t });
      fetchManageBatches();
    } catch {
      toast.error('Failed to delete', { id: t });
    }
  };

  const openEditModal = (mb: ManageBatch) => {
    setIsEditing(true);
    setSelectedId(mb._id);
    setCurriculum(rebuildFormFromSaved(mb.curriculum));
    setSelectedBatch({
      value: mb.batchId._id,
      label: `${mb.courseId?.title} — ${mb.batchId.batchTimings}`,
      courseId: mb.courseId._id,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setSelectedBatch(null);
    setCurriculum([]);
    setIsEditing(false);
    setSelectedId(null);
  };

  const hasFilters = !!searchQuery;
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // ─── Direct mode ───────────────────────────────────────────────────────────

  if (isDirectMode) {
    return (
      <div className={styles.employees}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              onClick={() => navigate('/batches')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6366f1', fontWeight: 500, fontSize: 14, marginBottom: 6,
              }}
            >
              <ArrowLeft size={16} /> Back to Batches
            </button>
            <h1>Manage Curriculum</h1>
            <p>{directBatchInfo?.label || 'Loading batch...'}</p>
          </div>
        </div>

        {directPageLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', gap: 12, color: '#6b7280' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            <span>Loading batch curriculum...</span>
          </div>
        )}

        {!directPageLoading && showModal && (
          <div style={{ width: '100%' }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{
                padding: '16px 24px', borderBottom: '1px solid #e5e7eb',
                background: '#f9fafb', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <BookOpen size={20} style={{ color: '#6366f1' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>
                    {isEditing ? 'Edit' : 'Add'} Curriculum
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    {selectedBatch?.label}
                  </div>
                </div>
                {isEditing && (
                  <span style={{
                    marginLeft: 'auto',
                    background: '#dcfce7', color: '#166534',
                    borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 600,
                  }}>
                    Editing existing curriculum
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ padding: '20px 24px' }}>
                  <CurriculumEditor
                    curriculum={curriculum}
                    loadingCurriculum={loadingCurriculum}
                    selectedBatch={selectedBatch}
                    toggleChapter={toggleChapter}
                    updateLesson={updateLesson}
                    addDocumentSlot={addDocumentSlot}
                    removeDocumentSlot={removeDocumentSlot}
                    handleFileSelect={handleFileSelect}
                    handleDeleteSavedDocument={handleDeleteSavedDocument}
                  />
                </div>

                <div style={{
                  padding: '16px 24px', borderTop: '1px solid #e5e7eb',
                  display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f9fafb',
                }}>
                  <Button variant="secondary" type="button" onClick={() => navigate('/batches')}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={curriculum.length === 0}>
                    {isEditing ? 'Update' : 'Save'} Curriculum
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── List mode ─────────────────────────────────────────────────────────────

  return (
    <div className={styles.employees}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Manage Batches</h1>
          <p>Assign video URLs, durations, live session details and multiple documents per lesson</p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by course or timings..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {hasFilters && (
              <button className={styles.clearFiltersBtn} onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>

          <button className={styles.addBtn} onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={18} /> Add Curriculum
          </button>
        </div>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total:</span>
          <span className={styles.statValue}>{manageBatches.length}</span>
        </div>
        {hasFilters && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Filtered:</span>
            <span className={styles.statValue}>{filteredData.length}</span>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Course</th>
              <th>Batch Timings</th>
              <th>Start Date</th>
              <th>Chapters</th>
              <th>Lessons</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    <span className="ml-2">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {hasFilters ? 'No results match your search' : 'No curricula yet. Click "Add Curriculum" to start.'}
                </td>
              </tr>
            ) : (
              paginatedData.map((mb, index) => (
                <tr key={mb._id}>
                  <td>
                    <span className={styles.orgBadge} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </span>
                  </td>
                  <td>
                    <div className={styles.employeeCell}>
                      <div className={styles.avatar} style={{
                        background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', borderRadius: '50%', flexShrink: 0,
                      }}>
                        <BookOpen size={16} />
                      </div>
                      <div className={styles.employeeInfo}>
                        <span className={styles.employeeName}>{mb.courseId?.title || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className={styles.deptText}>{mb.batchId?.batchTimings || '—'}</span></td>
                  <td>
                    <span className={styles.deptText}>
                      {mb.batchId?.batchStartDate
                        ? new Date(mb.batchId.batchStartDate).toLocaleDateString('en-IN')
                        : '—'}
                    </span>
                  </td>
                  <td>
                    <span className={styles.orgBadge} style={{ background: '#fef3c7', color: '#92400e' }}>
                      {mb.curriculum?.length ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className={styles.orgBadge} style={{ background: '#dcfce7', color: '#166534' }}>
                      {mb.curriculum?.reduce((acc, ch) => acc + (ch.lessons?.length ?? 0), 0)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.deptText}>{new Date(mb.createdAt).toLocaleDateString('en-IN')}</div>
                    <div className={styles.roleText}>{new Date(mb.createdAt).toLocaleTimeString()}</div>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.editBtn}
                        title="Edit"
                        onClick={() => openEditModal(mb)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className={styles.deleteBtn}
                        title="Delete"
                        onClick={() => handleDelete(mb._id, mb.courseId?.title || 'this batch')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`${styles.pageBtn} ${currentPage === page ? styles.activePage : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Add/Edit modal ── */}
      {showModal && !isDirectMode && (
        <div className={styles.modalOverlay} onClick={() => { setShowModal(false); resetForm(); }}>
          <div
            className={styles.modal}
            style={{ maxWidth: 800, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>{isEditing ? 'Edit' : 'Add'} Curriculum</h2>
              <button className={styles.closeBtn} onClick={() => { setShowModal(false); resetForm(); }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                {/* Batch selector (only when creating) */}
                {!isEditing && (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontWeight: 500, fontSize: 13, color: '#374151', marginBottom: 6 }}>
                      Select Batch *
                    </label>
                    <Select
                      options={batchOptions}
                      value={selectedBatch}
                      onChange={handleBatchSelect}
                      placeholder="Choose a batch..."
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      isSearchable
                    />
                  </div>
                )}

                <CurriculumEditor
                  curriculum={curriculum}
                  loadingCurriculum={loadingCurriculum}
                  selectedBatch={selectedBatch}
                  toggleChapter={toggleChapter}
                  updateLesson={updateLesson}
                  addDocumentSlot={addDocumentSlot}
                  removeDocumentSlot={removeDocumentSlot}
                  handleFileSelect={handleFileSelect}
                  handleDeleteSavedDocument={handleDeleteSavedDocument}
                />
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={curriculum.length === 0}>
                  {isEditing ? 'Update' : 'Save'} Curriculum
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageBatches;