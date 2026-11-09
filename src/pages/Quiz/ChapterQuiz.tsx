import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, HelpCircle, CheckCircle2, Save, AlertCircle, BookOpen
} from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface FormQuestion {
  _tempId: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  marks: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateTempId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const emptyQuestion = (): FormQuestion => ({
  _tempId: generateTempId(),
  questionText: '',
  options: ['', ''],
  correctOptionIndex: 0,
  explanation: '',
  marks: '1',
});

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

const ChapterQuiz: React.FC = () => {
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>();
  const navigate = useNavigate();

  const [chapterTitle, setChapterTitle] = useState('');
  const [quizTitle, setQuizTitle] = useState('Chapter Quiz');
  const [quizDescription, setQuizDescription] = useState('');
  const [passingScore, setPassingScore] = useState('0');
  const [questions, setQuestions] = useState<FormQuestion[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (courseId && chapterId) fetchQuiz(courseId, chapterId);
  }, [courseId, chapterId]);

  const fetchQuiz = async (cId: string, chId: string) => {
    setLoading(true);
    try {
      const res = await httpClient.get(`/courses/${cId}/chapters/${chId}/quiz`);
      const { chapterTitle: title, quiz } = res.data || {};
      setChapterTitle(title || '');

      if (quiz) {
        setQuizTitle(quiz.title || 'Chapter Quiz');
        setQuizDescription(quiz.description || '');
        setPassingScore(quiz.passingScore != null ? String(quiz.passingScore) : '0');
        setQuestions(
          (quiz.questions || []).map((q: any) => ({
            _tempId: generateTempId(),
            questionText: q.questionText,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            explanation: q.explanation || '',
            marks: String(q.marks ?? 1),
          }))
        );
      } else {
        setQuizTitle('Chapter Quiz');
        setQuizDescription('');
        setPassingScore('0');
        setQuestions([]);
      }
      setDirty(false);
    } catch {
      toast.error('Failed to load quiz for this chapter');
    } finally {
      setLoading(false);
    }
  };

  // ─── Question operations ─────────────────────────────────────────────────

  const addQuestion = () => {
    setQuestions(prev => [...prev, emptyQuestion()]);
    setDirty(true);
  };

  const removeQuestion = (qTempId: string) => {
    setQuestions(prev => prev.filter(q => q._tempId !== qTempId));
    setDirty(true);
  };

  const updateQuestionField = (
    qTempId: string,
    field: 'questionText' | 'explanation' | 'marks',
    value: string,
  ) => {
    setQuestions(prev => prev.map(q => q._tempId === qTempId ? { ...q, [field]: value } : q));
    setDirty(true);
  };

  const setCorrectOption = (qTempId: string, optionIdx: number) => {
    setQuestions(prev => prev.map(q =>
      q._tempId === qTempId ? { ...q, correctOptionIndex: optionIdx } : q
    ));
    setDirty(true);
  };

  const updateOptionText = (qTempId: string, optionIdx: number, value: string) => {
    setQuestions(prev => prev.map(q => {
      if (q._tempId !== qTempId) return q;
      const options = [...q.options];
      options[optionIdx] = value;
      return { ...q, options };
    }));
    setDirty(true);
  };

  const addOption = (qTempId: string) => {
    setQuestions(prev => prev.map(q =>
      q._tempId === qTempId ? { ...q, options: [...q.options, ''] } : q
    ));
    setDirty(true);
  };

  const removeOption = (qTempId: string, optionIdx: number) => {
    setQuestions(prev => prev.map(q => {
      if (q._tempId !== qTempId || q.options.length <= 2) return q;
      const options = q.options.filter((_, oi) => oi !== optionIdx);
      const correctOptionIndex = q.correctOptionIndex >= options.length ? 0 : q.correctOptionIndex;
      return { ...q, options, correctOptionIndex };
    }));
    setDirty(true);
  };

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (questions.length === 0) {
      toast.error('Add at least one question before saving.');
      return;
    }
    for (const q of questions) {
      if (!q.questionText.trim()) {
        toast.error('Every question needs question text.');
        return;
      }
      if (q.options.some(o => !o.trim())) {
        toast.error(`All options in "${q.questionText || 'a question'}" must be filled.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        title: quizTitle || 'Chapter Quiz',
        description: quizDescription,
        passingScore: Number(passingScore) || 0,
        questions: questions.map(q => ({
          questionText: q.questionText,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
          marks: Number(q.marks) || 1,
        })),
      };

      await httpClient.put(`/courses/${courseId}/chapters/${chapterId}/quiz`, payload);
      toast.success('Quiz saved successfully!');
      setDirty(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          <span>Loading quiz...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 760, margin: '0 auto' }}>
      <button
        onClick={() => navigate(`/admin/courses/${courseId}/quiz`)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none',
          border: 'none', color: '#6366f1', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', marginBottom: 12, padding: 0,
        }}
      >
        <ArrowLeft size={15} /> Back to Chapters
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <BookOpen size={18} style={{ color: '#6366f1' }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{chapterTitle}</h1>
        {dirty && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            color: '#d97706', fontSize: 12, fontWeight: 500,
          }}>
            <AlertCircle size={13} /> Unsaved changes
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
        {questions.length} question{questions.length !== 1 ? 's' : ''}
      </p>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Quiz meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Quiz Title</label>
            <input
              style={inputStyle}
              value={quizTitle}
              onChange={e => { setQuizTitle(e.target.value); setDirty(true); }}
            />
          </div>
          <div>
            <label style={labelStyle}>Passing Score</label>
            <input
              type="number"
              min={0}
              style={inputStyle}
              value={passingScore}
              onChange={e => { setPassingScore(e.target.value); setDirty(true); }}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Description (optional)</label>
          <input
            style={inputStyle}
            value={quizDescription}
            onChange={e => { setQuizDescription(e.target.value); setDirty(true); }}
          />
        </div>

        {/* Questions */}
        {questions.map((q, qIdx) => (
          <div
            key={q._tempId}
            style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>
                <HelpCircle size={14} style={{ color: '#6366f1' }} /> Question {qIdx + 1}
              </div>
              <button
                type="button"
                onClick={() => removeQuestion(q._tempId)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                title="Remove question"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Question Text</label>
              <input
                style={inputStyle}
                placeholder="Enter the question..."
                value={q.questionText}
                onChange={e => updateQuestionField(q._tempId, 'questionText', e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Options (select the correct one)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setCorrectOption(q._tempId, oIdx)}
                      title="Mark as correct"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: q.correctOptionIndex === oIdx ? '#059669' : '#d1d5db',
                        flexShrink: 0, display: 'flex',
                      }}
                    >
                      <CheckCircle2 size={18} fill={q.correctOptionIndex === oIdx ? '#d1fae5' : 'none'} />
                    </button>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder={`Option ${oIdx + 1}`}
                      value={opt}
                      onChange={e => updateOptionText(q._tempId, oIdx, e.target.value)}
                    />
                    {q.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(q._tempId, oIdx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', flexShrink: 0 }}
                        title="Remove option"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addOption(q._tempId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, marginTop: 8,
                  background: 'none', border: '1px dashed #d1d5db', borderRadius: 6,
                  padding: '4px 10px', color: '#6b7280', fontSize: 12, cursor: 'pointer',
                }}
              >
                <Plus size={13} /> Add Option
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12 }}>
              <div>
                <label style={labelStyle}>Explanation (optional)</label>
                <input
                  style={inputStyle}
                  placeholder="Why this answer is correct..."
                  value={q.explanation}
                  onChange={e => updateQuestionField(q._tempId, 'explanation', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Marks</label>
                <input
                  type="number"
                  min={0}
                  style={inputStyle}
                  value={q.marks}
                  onChange={e => updateQuestionField(q._tempId, 'marks', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add question + Save row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={addQuestion}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px solid #6366f1', borderRadius: 6,
              padding: '8px 14px', color: '#6366f1', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add Question
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#6366f1', border: 'none', borderRadius: 6,
              padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChapterQuiz;