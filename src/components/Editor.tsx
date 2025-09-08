/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, FC, useRef, DragEvent } from 'react';
import { IChapter } from '../models/Chapter'; // Using our new centralized type
import { IStory } from '@/models/Story';
import ReactMarkdown from 'react-markdown'; // Added for Markdown parsing
import remarkGfm from 'remark-gfm'; // Added for GitHub Flavored Markdown support

type Quill = any;
// **NEW**: A configurable constant for how many recent chapters to send as context.
const CONTEXT_CHAPTER_COUNT = 10;

// --- Helper function to strip HTML from content ---
const stripHtml = (html: string) => {
  if (typeof window === 'undefined') return html; // Don't run on the server
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

// --- COMPONENT: QuillEditor ---
// (This could also be moved to its own file in the future if it gets more complex)
const QuillEditor: FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (editorRef.current && typeof window !== 'undefined' && (window as any).Quill && !quillInstanceRef.current) {
      const quill = new (window as any).Quill(editorRef.current, {
        theme: 'snow',
        modules: { toolbar: [[{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['clean']] },
      });
      quill.on('text-change', () => onChange(quill.root.innerHTML));
      quillInstanceRef.current = quill;
    }
  }, [onChange]);

  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (quill && value !== quill.root.innerHTML) {
      quill.clipboard.dangerouslyPasteHTML(value);
    }
  }, [value]);

  return <div ref={editorRef} className="bg-white text-gray-900 rounded-md h-[65vh] max-h-[90dvh] overflow-y-auto custom-scrollbar"></div>;
};

// --- COMPONENT: AiResponseModal ---
const AiResponseModal: FC<{ title: string; content: string; onClose: () => void; isAiLoading: boolean; }> = ({ title, content, onClose, isAiLoading }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-teal-400">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                {/* UPDATED: Container now uses Tailwind's typography plugin for styling the rendered markdown */}
                <div className="overflow-y-auto custom-scrollbar pr-4 prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                    </ReactMarkdown>
                    {/* The blinking cursor now only shows if content is loading */}
                    {isAiLoading && <span className="inline-block w-2 h-5 bg-teal-400 animate-pulse ml-1"></span>}
                </div>
            </div>
        </div>
    );
};

const StoryContextModal: FC<{
  initialSummary: string;
  onSave: (newSummary: string) => void;
  onClose: () => void;
}> = ({ initialSummary, onSave, onClose }) => {
  const [summary, setSummary] = useState(initialSummary);

  const handleSaveClick = () => {
    onSave(summary);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-3xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-teal-400">Overall Story Context</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <p className="text-gray-400 mb-4">
          This is the master summary of your novel. The AI will use this context for all critiques to ensure plot and character consistency. Keep it updated with major plot beats, character arcs, and world-building details.
        </p>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full flex-grow bg-gray-900 text-gray-300 rounded-md p-4 custom-scrollbar resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Enter your main plot points here..."
        />
        <div className="mt-4 flex justify-end">
          <button onClick={handleSaveClick} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition duration-300">
            Save Context
          </button>
        </div>
      </div>
    </div>
  );
};

// --- THE MAIN EDITOR COMPONENT ---
const Editor: FC<{ onContentUpdate: () => void }> = ({ onContentUpdate }) => {
  const [chapters, setChapters] = useState<IChapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<IChapter | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<false | 'critique' | 'summarize'>(false);
  const [aiResponse, setAiResponse] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  
  const dragChapterId = useRef<string | null>(null);
  
  // **NEW** State for the story context
  const [storyContext, setStoryContext] = useState<IStory | null>(null);
  const [showStoryContextModal, setShowStoryContextModal] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoading(true);
        // Fetch chapters and story context in parallel
        const [chaptersRes, storyRes] = await Promise.all([
          fetch('/api/chapters'),
          fetch('/api/story')
        ]);

        if (!chaptersRes.ok) throw new Error('Failed to fetch chapters');
        const { data: chapterData } = await chaptersRes.json();
        setChapters(chapterData);
        if (chapterData.length > 0) setActiveChapter(chapterData[0]);

        if (!storyRes.ok) throw new Error('Failed to fetch story context');
        const { data: storyData } = await storyRes.json();
        setStoryContext(storyData);

      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeChapter) setEditorContent(activeChapter.content);
    else setEditorContent('');
  }, [activeChapter]);

  const handleAddChapter = async () => {
    try {
      const res = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Chapter',
          content: '<p>Start writing...</p>',
          order: chapters.length, // order is 0-indexed
        }),
      });
      const { data: newChapter } = await res.json();
      setChapters([...chapters, newChapter]);
      setActiveChapter(newChapter);
      onContentUpdate();
    } catch (error) {
      console.error("Failed to add chapter:", error);
    }
  };
  
  // **NEW** Handler to save the overall story context
  const handleSaveStoryContext = async (newSummary: string) => {
    if (!storyContext) return;
    try {
      const res = await fetch('/api/story', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotSummary: newSummary }),
      });
      const { data } = await res.json();
      setStoryContext(data);
      setShowStoryContextModal(false); // Close modal on save
    } catch (error) {
      console.error("Failed to save story context:", error);
    }
  };

  const handleDeleteChapter = async (id: string) => {
    // A simple confirm dialog. For better UX, consider a custom modal.
    if (window.confirm('Are you sure you want to delete this chapter?')) {
      try {
        await fetch(`/api/chapters/${id}`, { method: 'DELETE' });
        const updatedChapters = chapters.filter(c => c._id !== id);
        setChapters(updatedChapters);
        if (activeChapter?._id === id) {
          setActiveChapter(updatedChapters.length > 0 ? updatedChapters[0] : null);
        }
        onContentUpdate();
      } catch (error) {
        console.error("Failed to delete chapter:", error);
      }
    }
  };
  const handleSaveChapter = async (extraFields: Partial<IChapter> = {}) => {
    if (!activeChapter) return;
    setIsSaving(true);
    try {
      const titleInput = document.getElementById(`chapter-title-input-${activeChapter._id}`) as HTMLInputElement;
      const updatedTitle = titleInput ? titleInput.value : activeChapter.title;
      
      const body = { 
        title: updatedTitle, 
        content: editorContent,
        ...extraFields // Merge AI critique/summary here
      };

      const res = await fetch(`/api/chapters/${activeChapter._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const { data: updatedChapter } = await res.json();
      
      const newChapters = chapters.map(c => c._id === activeChapter._id ? updatedChapter : c);
      setChapters(newChapters);
      setActiveChapter(updatedChapter);
      onContentUpdate();
    } catch (error) {
      console.error("Failed to save chapter:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: DragEvent<HTMLLIElement>, id: string) => {
    dragChapterId.current = id;
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e: DragEvent<HTMLLIElement>) => {
    e.currentTarget.style.opacity = '1';
    dragChapterId.current = null;
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>, chapterId: string) => {
    const newTitle = e.target.value;
    const updatedChapters = chapters.map(chapter => 
      chapter._id === chapterId ? { ...chapter, title: newTitle } : chapter
    );
    setChapters(updatedChapters as any);
  };
  
  const handleDrop = async (e: DragEvent<HTMLLIElement>, dropChapterId: string) => {
    e.preventDefault();
    if (!dragChapterId.current) return;

    const draggedChapterIndex = chapters.findIndex(c => c._id === dragChapterId.current);
    const dropChapterIndex = chapters.findIndex(c => c._id === dropChapterId);
    
    const newChapters = [...chapters];
    const [draggedChapter] = newChapters.splice(draggedChapterIndex, 1);
    newChapters.splice(dropChapterIndex, 0, draggedChapter);
    
    setChapters(newChapters);

    // Update order in the database
    const updatePromises = newChapters.map((chapter, index) => 
      fetch(`/api/chapters/${chapter._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: index }),
      })
    );
    await Promise.all(updatePromises);
    onContentUpdate(); // Refresh reader view with new order
  };

  
  const handleAiRequest = async (promptType: 'critique' | 'summarize') => {
    if (!activeChapter) return;
    setModalTitle(promptType === 'critique' ? 'AI Critique' : 'AI Summary');
    setShowAiModal(true);
    setIsAiLoading(promptType);
    setAiResponse('');
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editorContent;
        const plainTextContent = activeChapter.title + "\n\n"+ tempDiv.textContent || tempDiv.innerText || "";
        const activeChapterIndex = chapters.findIndex(c => c._id === activeChapter._id);

        // **NEW LOGIC**: Gather content from the last few chapters.
        const startIndex = Math.max(0, activeChapterIndex - CONTEXT_CHAPTER_COUNT);
        const contextChapters = chapters.slice(startIndex, activeChapterIndex);
        const recentChaptersContent = contextChapters
          .map(chap => `Chapter (Order ${chap.order + 1}): ${chap.title}\n${stripHtml(chap.content)}`)
          .join('\n\n---\n\n');

        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: plainTextContent,
              promptType,
              // **UPDATED**: Pass the global story context and chapter number
              storyContext: storyContext?.plotSummary || '',
              chapterNumber: activeChapterIndex + 1,
              // **NEW**: Send the recent chapters' content to the backend.
              recentChaptersContent: recentChaptersContent,
            }),
        });

        if (!response.ok || !response.body) throw new Error(`API error: ${response.statusText}`);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let finalResponseText = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            finalResponseText += chunk;
            setAiResponse(finalResponseText);
        }
        
        const fieldToUpdate = { [promptType]: finalResponseText };
        await handleSaveChapter(fieldToUpdate);
        // await handleSaveStoryContext(finalResponseText);

    } catch (error: any) {
        console.error("AI Stream Failed:", error);
        setAiResponse(prev => `${prev}\n\n--- ERROR ---\n${error.message}`);
    } finally {
        setIsAiLoading(false);
    }
  };

  if (isLoading) return <div className="text-center p-10">Loading chapters...</div>;

  return (
    <>
      {showAiModal && <AiResponseModal isAiLoading={isAiLoading !== false} title={modalTitle} content={aiResponse} onClose={() => setShowAiModal(false)} />}
      {showStoryContextModal && storyContext && (
        <StoryContextModal 
          initialSummary={storyContext.plotSummary}
          onSave={handleSaveStoryContext}
          onClose={() => setShowStoryContextModal(false)}
        />
      )}
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-1/4 bg-gray-800 p-4 rounded-lg shadow-inner">
          <h2 className="text-xl font-semibold mb-4 border-b border-gray-600 pb-2">Chapters</h2>
            <button onClick={handleAddChapter} className="w-full mt-4 bg-teal-500 hover:bg-teal-400 text-white font-bold py-2 px-4 rounded-md transition-all duration-300">
              + Add Chapter
            </button>
            {/* **NEW** Button to open the story context modal */}
            <button onClick={() => setShowStoryContextModal(true)} title="Edit Overall Story Context" className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition duration-300">
              📝
            </button>
          <ul className="space-y-2 max-h-[90dvh] overflow-y-auto">
            {chapters.map(chapter => (
              <li
                key={String(chapter._id)}
                onClick={() => setActiveChapter(chapter)}
                className={`p-3 rounded-md cursor-pointer transition-all duration-200 flex justify-between items-center ${activeChapter?._id === chapter._id ? 'bg-teal-600 shadow-md' : 'hover:bg-gray-700'}`}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, String(chapter._id))}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()} // Necessary to allow dropping
                onDrop={(e) => handleDrop(e, String(chapter._id))}
              >
                <span className="font-medium truncate pr-2">{chapter.title}</span>
                <button
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteChapter(String(chapter._id)); }}
                  className="text-red-400 hover:text-red-200 text-sm flex-shrink-0"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="w-full md:w-3/4">
          {activeChapter ? (
            <div className="bg-gray-800 p-6 rounded-lg shadow-inner">
              <div className="flex justify-between items-center mb-4">
                <input
                  id={`chapter-title-input-${activeChapter._id}`}
                  type="text"
                  // **FIX**: Input is now a controlled component
                  value={chapters.find(c => c._id === activeChapter._id)?.title || ''}
                  onChange={(e) => handleTitleChange(e, String(activeChapter._id))}
                  className="text-2xl font-bold bg-transparent border-b-2 border-gray-600 focus:border-teal-400 outline-none w-full"
                  placeholder="Chapter Title"
                />
                <button onClick={() => handleSaveChapter()} disabled={isSaving} className="ml-4 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-wait flex-shrink-0">
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <QuillEditor value={editorContent} onChange={setEditorContent} />
              
              <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleAiRequest('critique')}
                    disabled={!!isAiLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500"
                  >
                    {isAiLoading === 'critique' ? 'Analyzing...' : 'Critique'}
                  </button>
                  <button
                    onClick={() => handleAiRequest('summarize')}
                    disabled={!!isAiLoading}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500"
                  >
                    {isAiLoading === 'summarize' ? 'Summarizing...' : 'Summarize'}
                  </button>
              </div>
            </div>
          ) : (
            <div className="text-center p-10 bg-gray-800 rounded-lg">
              <h2 className="text-2xl">No Chapters Yet</h2>
              <p className="mt-2 text-gray-400">Click &quot;Add Chapter&quot; to begin your story.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default Editor;
