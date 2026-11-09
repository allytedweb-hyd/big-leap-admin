import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import toast from 'react-hot-toast';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ChapterListItem {
  chapterId: string;
  chapterTitle: string;
  lessonCount: number;
  hasQuiz: boolean;
  questionCount: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ManageQuiz: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [courseTitle, setCourseTitle] = useState('');
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) fetchChapters(courseId);
  }, [courseId]);

  const fetchChapters = async (cId: string) => {
    setLoading(true);
    try {
      const res = await httpClient.get(`/courses/${cId}/quizzes`);
      setCourseTitle(res.data?.course?.title || '');
      setChapters(res.data?.chapters || []);
    } catch {
      toast.error('Failed to load chapters for this course');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          <span>Loading chapters...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none',
          border: 'none', color: '#6366f1', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', marginBottom: 12, padding: 0,
        }}
      >
        <ArrowLeft size={15} /> Back to Courses
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
        Manage Quiz
      </h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
        {courseTitle} — select a chapter to add or edit its quiz
      </p>

      {chapters.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <p>No chapters found for this course.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {chapters.map((chapter, idx) => (
            <div
              key={chapter.chapterId}
              onClick={() => navigate(`/admin/courses/${courseId}/chapters/${chapter.chapterId}/quiz`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', border: '1px solid #e5e7eb', borderRadius: 10,
                cursor: 'pointer', background: '#fff', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, background: '#eef2ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600, color: '#4338ca', flexShrink: 0,
                }}>
                  {idx + 1}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BookOpen size={14} style={{ color: '#6366f1' }} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                      {chapter.chapterTitle}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      {chapter.lessonCount} lesson{chapter.lessonCount !== 1 ? 's' : ''}
                    </span>
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, color: chapter.hasQuiz ? '#059669' : '#9ca3af',
                    }}>
                      {chapter.hasQuiz ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                      {chapter.hasQuiz
                        ? `${chapter.questionCount} question${chapter.questionCount !== 1 ? 's' : ''} added`
                        : 'No quiz yet'}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageQuiz;