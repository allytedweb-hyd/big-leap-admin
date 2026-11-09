import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from '../Employees/Employees.module.css';
import pageStyles from './Assessments.module.css';
import { Button } from '../../components/ui/Button/Button';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';
import type { SubjectItem, BatchItem, FormState, QuestionForm } from './AssessmentShared';
import {
  emptyForm,
  emptyQuestion,
  getErrorMessage,
  mapToForm,
  subjectImageUrl,
  BatchPicker,
  QuestionEditor,
} from './AssessmentShared';

// Routes:
//   /manage-assessments/create      → create mode
//   /manage-assessments/edit/:id    → edit mode

const AssessmentForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormState>(emptyForm());
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loadingPage, setLoadingPage] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [activeSubjectId, setActiveSubjectId] = useState('');

  const goBack = () => navigate('/manage-assessments');

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchSubjects();
    fetchBatches();
  }, []);

  useEffect(() => {
    if (id) loadAssessment(id);
  }, [id]);

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchSubjects = async () => {
    try {
      const res = await httpClient.get('/assessments-subjects', { params: { limit: 'all' } });
      setSubjects(res.data?.subjects || []);
    } catch {
      toast.error('Failed to load subjects');
    }
  };

  // NOTE: adjust if your batches API returns a different shape
  const fetchBatches = async () => {
    try {
      const res = await httpClient.get('/batches');
      const list = res.data?.batches ?? res.data;
      setBatches(Array.isArray(list) ? list : []);
    } catch {
      toast.error('Failed to load batches');
    }
  };

  const loadAssessment = async (assessmentId: string) => {
    setLoadingPage(true);
    try {
      const res = await httpClient.get(`/assessments/${assessmentId}`);
      const form = mapToForm(res.data.assessment);
      setFormData(form);
      setActiveSubjectId(form.sections[0]?.subjectId || '');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load assessment'));
      goBack();
    } finally {
      setLoadingPage(false);
    }
  };

  // ─── Sections / questions ─────────────────────────────────────────────────

  const subjectById = (sid: string) => subjects.find(s => s._id === sid);

  const availableSubjects = subjects.filter(
    s => !formData.sections.some(sec => sec.subjectId === s._id),
  );

  const activeIndex =
    formData.sections.length === 0
      ? -1
      : Math.max(0, formData.sections.findIndex(s => s.subjectId === activeSubjectId));
  const activeSection = activeIndex >= 0 ? formData.sections[activeIndex] : null;

  const addSection = () => {
    if (!newSubjectId) {
      toast.error('Select a subject to add');
      return;
    }
    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, { subjectId: newSubjectId, questions: [emptyQuestion()] }],
    }));
    setActiveSubjectId(newSubjectId);
    setNewSubjectId('');
  };

  const removeSection = (sIdx: number) => {
    const name = subjectById(formData.sections[sIdx].subjectId)?.subjectName || 'this subject';
    if (!window.confirm(`Remove "${name}" and all its questions from this assessment?`)) return;
    const remaining = formData.sections.filter((_, i) => i !== sIdx);
    setFormData(prev => ({ ...prev, sections: remaining }));
    setActiveSubjectId(remaining[Math.min(sIdx, remaining.length - 1)]?.subjectId || '');
  };

  const addQuestion = (sIdx: number) =>
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sIdx ? { ...s, questions: [...s.questions, emptyQuestion()] } : s,
      ),
    }));

  const updateQuestion = (sIdx: number, qIdx: number, q: QuestionForm) =>
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sIdx ? { ...s, questions: s.questions.map((old, j) => (j === qIdx ? q : old)) } : s,
      ),
    }));

  const removeQuestion = (sIdx: number, qIdx: number) =>
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sIdx ? { ...s, questions: s.questions.filter((_, j) => j !== qIdx) } : s,
      ),
    }));

  // ─── Validation + payload ─────────────────────────────────────────────────

  const validateForm = (): { message: string; sIdx?: number } | null => {
    if (!formData.title.trim()) return { message: 'Please enter assessment title' };
    if (!Number(formData.duration) || Number(formData.duration) < 1)
      return { message: 'Please enter a valid duration (minutes)' };
    const pass = Number(formData.passPercentage);
    if (formData.passPercentage === '' || pass < 0 || pass > 100)
      return { message: 'Pass percentage must be between 0 and 100' };
    if (formData.sections.length === 0) return { message: 'Add at least one subject' };

    for (let s = 0; s < formData.sections.length; s++) {
      const sec = formData.sections[s];
      const name = subjectById(sec.subjectId)?.subjectName || `Subject ${s + 1}`;
      if (!sec.subjectId)
        return { message: `${name}: subject no longer exists, remove it`, sIdx: s };
      if (sec.questions.length === 0)
        return { message: `${name}: add at least one question`, sIdx: s };

      for (let q = 0; q < sec.questions.length; q++) {
        const ques = sec.questions[q];
        const label = `${name}, Question ${q + 1}`;
        if (!ques.questionText.trim())
          return { message: `${label}: enter the question text`, sIdx: s };
        if (ques.options.some(o => !o.text.trim()))
          return { message: `${label}: fill all options or remove empty ones`, sIdx: s };
        if (!(Number(ques.marks) > 0))
          return { message: `${label}: marks must be greater than 0`, sIdx: s };
        if (ques.externalLink.trim()) {
          try {
            const u = new URL(ques.externalLink.trim());
            if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
          } catch {
            return { message: `${label}: external link must be a valid http/https URL`, sIdx: s };
          }
        }
      }
    }
    return null;
  };

  const buildPayload = () => ({
    title: formData.title.trim(),
    description: formData.description.trim(),
    duration: Number(formData.duration),
    passPercentage: Number(formData.passPercentage),
    isActive: formData.isActive,
    instructions: formData.instructions
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean),
    batchIds: formData.batchIds,
    sections: formData.sections.map(s => ({
      ...(s._id ? { _id: s._id } : {}),
      subjectId: s.subjectId,
      questions: s.questions.map(q => ({
        ...(q._id ? { _id: q._id } : {}),
        questionText: q.questionText.trim(),
        options: q.options.map(o => ({
          ...(o._id ? { _id: o._id } : {}),
          text: o.text.trim(),
        })),
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation.trim(),
        externalLink: q.externalLink.trim(),
        marks: Number(q.marks),
      })),
    })),
  });

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const error = validateForm();
    if (error) {
      toast.error(error.message);
      // jump to the subject tab that has the problem
      if (error.sIdx !== undefined) {
        setActiveSubjectId(formData.sections[error.sIdx].subjectId);
      }
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading(
      isEditing ? 'Updating assessment...' : 'Creating assessment...',
    );

    try {
      if (isEditing && id) {
        await httpClient.put(`/assessments/${id}`, buildPayload());
        toast.success('Assessment updated successfully!', { id: loadingToast });
      } else {
        await httpClient.post('/assessments', buildPayload());
        toast.success('Assessment created successfully!', { id: loadingToast });
      }
      goBack();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Operation failed'), { id: loadingToast });
      setSubmitting(false);
    }
  };

  // ─── Totals ───────────────────────────────────────────────────────────────

  const totalQuestions = formData.sections.reduce((t, s) => t + s.questions.length, 0);
  const totalMarks = formData.sections.reduce(
    (t, s) => t + s.questions.reduce((m, q) => m + (Number(q.marks) || 0), 0),
    0,
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={pageStyles.page}>

      {/* Header */}
      <div className={pageStyles.pageHeader}>
        <button
          type="button"
          className={pageStyles.backBtn}
          onClick={goBack}
          aria-label="Back to assessments"
          title="Back to assessments"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className={pageStyles.pageTitle}>{isEditing ? 'Edit' : 'Create'} Assessment</h1>
          <p className={pageStyles.pageSub}>
            {isEditing
              ? 'Update details, questions and batch assignment'
              : 'Add details, subject-wise questions and assign batches'}
          </p>
        </div>
      </div>

      {loadingPage ? (
        <div className={pageStyles.panel} style={{ textAlign: 'center' }}>
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            <span className="ml-2">Loading assessment...</span>
          </div>
        </div>
      ) : (
        /* Enter inside a text input must not submit the whole form */
        <form
          onSubmit={handleSubmit}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
              e.preventDefault();
            }
          }}
        >

          {/* ── 1. Basic details ───────────────────────────────────────────── */}
          <section className={pageStyles.panel}>
            <div className={pageStyles.panelHead}>
              <h2 className={pageStyles.panelTitle}>Basic Details</h2>
            </div>

            <div className={pageStyles.fieldGrid}>
              <div className={`${styles.formGroup} ${pageStyles.full}`}>
                <label className={styles.formLabel}>
                  Assessment Title <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  maxLength={150}
                  placeholder="e.g., Placement Readiness Mock 1"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className={`${styles.formGroup} ${pageStyles.full}`}>
                <label className={styles.formLabel}>
                  Description <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  className={styles.formInput}
                  rows={2}
                  maxLength={1000}
                  placeholder="Short description shown on the assessment overview"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Total Time (minutes) <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  className={styles.formInput}
                  value={formData.duration}
                  onChange={e => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Pass Percentage</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={styles.formInput}
                  value={formData.passPercentage}
                  onChange={e => setFormData({ ...formData, passPercentage: e.target.value })}
                />
              </div>

              <div className={`${styles.formGroup} ${pageStyles.full}`}>
                <label className={styles.formLabel}>
                  Instructions{' '}
                  <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional, one per line)</span>
                </label>
                <textarea
                  className={styles.formInput}
                  rows={4}
                  placeholder={'Each question has one correct answer.\nThe test submits automatically when the timer ends.'}
                  value={formData.instructions}
                  onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                />
              </div>

              <div className={`${styles.formGroup} ${pageStyles.full}`}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  Active (students in assigned batches can see and attempt it)
                </label>
              </div>
            </div>
          </section>

          {/* ── 2. Batches ─────────────────────────────────────────────────── */}
          <section className={pageStyles.panel}>
            <div className={pageStyles.panelHead}>
              <h2 className={pageStyles.panelTitle}>Assign to Batches</h2>
              <span className={pageStyles.panelNote}>
                {formData.batchIds.length} selected · optional, can be changed later
              </span>
            </div>
            <BatchPicker
              batches={batches}
              selected={formData.batchIds}
              onChange={ids => setFormData({ ...formData, batchIds: ids })}
            />
          </section>

          {/* ── 3. Subjects & questions ────────────────────────────────────── */}
          <section className={pageStyles.panel}>
            <div className={pageStyles.panelHead}>
              <h2 className={pageStyles.panelTitle}>
                Subjects &amp; Questions <span style={{ color: 'red' }}>*</span>
              </h2>
              <span className={pageStyles.panelNote}>
                Total: {totalQuestions} questions · {totalMarks} marks
              </span>
            </div>

            {/* Add subject */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <select
                className={styles.formInput}
                style={{ flex: '1 1 260px' }}
                value={newSubjectId}
                onChange={e => setNewSubjectId(e.target.value)}
                aria-label="Select subject to add"
              >
                <option value="">
                  {availableSubjects.length === 0
                    ? subjects.length === 0
                      ? 'No subjects created yet'
                      : 'All subjects already added'
                    : 'Select a subject to add'}
                </option>
                {availableSubjects.map(s => (
                  <option key={s._id} value={s._id}>{s.subjectName}</option>
                ))}
              </select>
              <Button type="button" variant="secondary" onClick={addSection}>
                <Plus size={16} /> Add Subject
              </Button>
            </div>

            {formData.sections.length === 0 || !activeSection ? (
              <div
                style={{
                  padding: 32,
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: 14,
                  border: '1px dashed #d1d5db',
                  borderRadius: 12,
                }}
              >
                No subjects added yet. Select a subject above, then add its questions.
              </div>
            ) : (
              <>
                {/* Subject tabs */}
                <div className={pageStyles.tabs} role="tablist">
                  {formData.sections.map((sec, i) => (
                    <button
                      key={sec.subjectId || i}
                      type="button"
                      role="tab"
                      aria-selected={i === activeIndex}
                      className={`${pageStyles.tab} ${i === activeIndex ? pageStyles.tabActive : ''}`}
                      onClick={() => setActiveSubjectId(sec.subjectId)}
                    >
                      {subjectById(sec.subjectId)?.subjectName || 'Unknown subject'} ({sec.questions.length})
                    </button>
                  ))}
                </div>

                {/* Active subject header */}
                {(() => {
                  const subject = subjectById(activeSection.subjectId);
                  const secMarks = activeSection.questions.reduce(
                    (m, q) => m + (Number(q.marks) || 0),
                    0,
                  );
                  return (
                    <div className={pageStyles.subjectBar}>
                      {subject?.image && (
                        <img
                          src={subjectImageUrl(subject.image)}
                          alt={subject.subjectName}
                          style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#3730a3' }}>
                          {subject?.subjectName || 'Unknown subject'}
                        </div>
                        <div style={{ fontSize: 13, color: '#4b5563' }}>
                          {activeSection.questions.length} questions · {secMarks} marks
                        </div>
                      </div>
                      <Button type="button" variant="secondary" onClick={() => addQuestion(activeIndex)}>
                        <Plus size={16} /> Add Question
                      </Button>
                      <button
                        type="button"
                        onClick={() => removeSection(activeIndex)}
                        title="Remove this subject"
                        aria-label="Remove this subject"
                        style={{ background: 'none', border: 0, cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  );
                })()}

                {/* Questions of the active subject */}
                <div className={pageStyles.questionList}>
                  {activeSection.questions.map((q, qIdx) => (
                    <QuestionEditor
                      key={q._id || qIdx}
                      index={qIdx}
                      q={q}
                      onChange={nq => updateQuestion(activeIndex, qIdx, nq)}
                      onRemove={() => removeQuestion(activeIndex, qIdx)}
                    />
                  ))}
                  <div>
                    <Button type="button" variant="secondary" onClick={() => addQuestion(activeIndex)}>
                      <Plus size={16} /> Add Question
                    </Button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* ── Sticky action bar ──────────────────────────────────────────── */}
          <div className={pageStyles.actionBar}>
            <Button variant="secondary" type="button" onClick={goBack}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {isEditing ? 'Update' : 'Save'} Assessment
            </Button>
          </div>

        </form>
      )}
    </div>
  );
};

export default AssessmentForm;