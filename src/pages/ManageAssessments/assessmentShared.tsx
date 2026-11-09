import React from 'react';
import styles from '../Employees/Employees.module.css';
import { Plus, X, Trash2, HelpCircle, CheckCircle2, Link2 } from 'lucide-react';
import { imgUrl } from '../../lib/httpClient';
import toast from 'react-hot-toast';

// ─── Interfaces (API) ─────────────────────────────────────────────────────────

export interface SubjectItem {
  _id: string;
  subjectName: string;
  image: string;
}

export interface BatchItem {
  _id: string;
  batchStartDate?: string;
  batchTimings?: string;
  courseId?: { _id?: string; title?: string } | string | null;
}

export interface AssessmentSection {
  _id: string;
  subjectId: SubjectItem | null;
  questionCount: number;
  marks: number;
}

export interface Assessment {
  _id: string;
  title: string;
  description: string;
  duration: number;
  passPercentage: number;
  totalQuestions: number;
  totalMarks: number;
  isActive: boolean;
  batchIds: BatchItem[];
  sections: AssessmentSection[];
  createdAt: string;
}

// ─── Interfaces (form) ────────────────────────────────────────────────────────

export interface OptionForm {
  _id?: string;
  text: string;
}

export interface QuestionForm {
  _id?: string;
  questionText: string;
  options: OptionForm[];
  correctOptionIndex: number;
  explanation: string;
  externalLink: string;
  marks: string;
}

export interface SectionForm {
  _id?: string;
  subjectId: string;
  questions: QuestionForm[];
}

export interface FormState {
  title: string;
  description: string;
  duration: string;
  passPercentage: string;
  instructions: string; // one instruction per line
  isActive: boolean;
  batchIds: string[];
  sections: SectionForm[];
}

// ─── Factories & helpers ──────────────────────────────────────────────────────

export const emptyQuestion = (): QuestionForm => ({
  questionText: '',
  options: [{ text: '' }, { text: '' }],
  correctOptionIndex: 0,
  explanation: '',
  externalLink: '',
  marks: '1',
});

export const emptyForm = (): FormState => ({
  title: '',
  description: '',
  duration: '60',
  passPercentage: '40',
  instructions: '',
  isActive: true,
  batchIds: [],
  sections: [],
});

// handles both { message } and express-validator { errors: [{ msg }] }
export const getErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message ||
  err?.response?.data?.errors?.[0]?.msg ||
  fallback;

export const subjectImageUrl = (image: string) =>
  `${imgUrl}/assessments-subjects/${image}`;

export const batchLabel = (b: BatchItem) => {
  const course =
    b.courseId && typeof b.courseId === 'object' ? b.courseId.title : undefined;
  const date = b.batchStartDate
    ? new Date(b.batchStartDate).toLocaleDateString('en-IN')
    : '';
  return [course || 'Batch', date, b.batchTimings].filter(Boolean).join(' · ');
};

// API assessment (GET /assessments/:id) → form state
export const mapToForm = (a: any): FormState => ({
  title: a.title,
  description: a.description || '',
  duration: String(a.duration),
  passPercentage: String(a.passPercentage ?? 40),
  instructions: (a.instructions || []).join('\n'),
  isActive: a.isActive,
  batchIds: (a.batchIds || []).map((b: any) => (typeof b === 'string' ? b : b._id)),
  sections: (a.sections || []).map((s: any) => ({
    _id: s._id,
    subjectId: typeof s.subjectId === 'string' ? s.subjectId : s.subjectId?._id || '',
    questions: (s.questions || []).map((q: any) => ({
      _id: q._id,
      questionText: q.questionText,
      options: (q.options || []).map((o: any) => ({ _id: o._id, text: o.text })),
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation || '',
      externalLink: q.externalLink || '',
      marks: String(q.marks ?? 1),
    })),
  })),
});

const cardStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  background: '#fff',
  padding: 16,
};

const subLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#4b5563',
  marginBottom: 6,
};

// ─── Batch picker ─────────────────────────────────────────────────────────────

export const BatchPicker: React.FC<{
  batches: BatchItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
}> = ({ batches, selected, onChange }) => {
  if (batches.length === 0) {
    return <p style={{ color: '#6b7280', fontSize: 14 }}>No batches found.</p>;
  }

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  const allSelected = selected.length === batches.length;

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    fontSize: 14,
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, maxHeight: 240, overflowY: 'auto', background: '#fff' }}>
      <label style={{ ...rowStyle, fontWeight: 600, background: '#f9fafb' }}>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => onChange(allSelected ? [] : batches.map(b => b._id))}
        />
        Select all ({selected.length}/{batches.length})
      </label>
      {batches.map(b => (
        <label key={b._id} style={rowStyle}>
          <input type="checkbox" checked={selected.includes(b._id)} onChange={() => toggle(b._id)} />
          {batchLabel(b)}
        </label>
      ))}
    </div>
  );
};

// ─── Single question editor ───────────────────────────────────────────────────

export const QuestionEditor: React.FC<{
  index: number;
  q: QuestionForm;
  onChange: (q: QuestionForm) => void;
  onRemove: () => void;
}> = ({ index, q, onChange, onRemove }) => {
  const setOptionText = (i: number, text: string) =>
    onChange({ ...q, options: q.options.map((o, idx) => (idx === i ? { ...o, text } : o)) });

  const addOption = () => {
    if (q.options.length >= 6) {
      toast.error('Maximum 6 options allowed');
      return;
    }
    onChange({ ...q, options: [...q.options, { text: '' }] });
  };

  const removeOption = (i: number) => {
    if (q.options.length <= 2) return;
    let correct = q.correctOptionIndex;
    if (i < correct) correct -= 1;
    else if (i === correct) correct = 0;
    onChange({ ...q, options: q.options.filter((_, idx) => idx !== i), correctOptionIndex: correct });
  };

  return (
    <div style={{ ...cardStyle, background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <HelpCircle size={18} color="#6366f1" /> Question {index + 1}
        </div>
        <button
          type="button"
          onClick={onRemove}
          title="Remove question"
          aria-label={`Remove question ${index + 1}`}
          style={{ background: 'none', border: 0, cursor: 'pointer', color: '#ef4444' }}
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Question text */}
      <label style={subLabel}>Question Text</label>
      <input
        type="text"
        className={styles.formInput}
        placeholder="Enter the question..."
        value={q.questionText}
        onChange={e => onChange({ ...q, questionText: e.target.value })}
      />

      {/* Options */}
      <label style={{ ...subLabel, marginTop: 16 }}>Options (select the correct one)</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {q.options.map((o, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => onChange({ ...q, correctOptionIndex: i })}
              title="Mark as correct answer"
              aria-label={`Mark option ${i + 1} as correct`}
              style={{ background: 'none', border: 0, cursor: 'pointer', display: 'flex' }}
            >
              <CheckCircle2 size={26} color={q.correctOptionIndex === i ? '#059669' : '#d1d5db'} />
            </button>
            <input
              type="text"
              className={styles.formInput}
              placeholder={`Option ${i + 1}`}
              value={o.text}
              onChange={e => setOptionText(i, e.target.value)}
              style={{ flex: 1 }}
            />
            {q.options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                title="Remove option"
                aria-label={`Remove option ${i + 1}`}
                style={{ background: 'none', border: 0, cursor: 'pointer', color: '#6b7280' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addOption}
        style={{
          marginTop: 10,
          padding: '8px 14px',
          border: '1px dashed #9ca3af',
          borderRadius: 8,
          background: '#fff',
          color: '#4b5563',
          cursor: 'pointer',
          fontSize: 13,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Plus size={14} /> Add Option
      </button>

      {/* Explanation + marks */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px' }}>
          <label style={subLabel}>Explanation (optional)</label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="Why this answer is correct..."
            value={q.explanation}
            onChange={e => onChange({ ...q, explanation: e.target.value })}
          />
        </div>
        <div style={{ flex: '0 0 110px' }}>
          <label style={subLabel}>Marks</label>
          <input
            type="number"
            min={0.5}
            step={0.5}
            className={styles.formInput}
            value={q.marks}
            onChange={e => onChange({ ...q, marks: e.target.value })}
          />
        </div>
      </div>

      {/* External link */}
      <div style={{ marginTop: 16 }}>
        <label style={subLabel}>
          <Link2 size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
          External Link (optional)
        </label>
        <input
          type="url"
          className={styles.formInput}
          placeholder="https://example.com/reference"
          value={q.externalLink}
          onChange={e => onChange({ ...q, externalLink: e.target.value })}
        />
      </div>
    </div>
  );
};