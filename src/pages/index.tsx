import { useState, useEffect, FC, useRef, DragEvent } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Reader from '../components/Reader'; // Import the new Reader component

// --- Type Definition ---
interface Chapter {
  _id: string;
  title: string;
  content: string;
  order: number;
}

type Quill = any;

// --- COMPONENT: QuillEditor ---
const QuillEditor: FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (editorRef.current && typeof window !== 'undefined' && (window as any).Quill && !quillInstanceRef.current) {
      const quill = new (window as any).Quill(editorRef.current, {
        theme: 'snow',
        modules: { toolbar: [[{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['clean']] },
      });

      quill.on('text-change', () => {
        onChange(quill.root.innerHTML);
      });
      
      quillInstanceRef.current = quill;
    }
  }, [onChange]);

  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (quill && value !== quill.root.innerHTML) {
      quill.clipboard.dangerouslyPasteHTML(value);
    }
  }, [value]);

  // Added fixed height and scroll class
  return <div ref={editorRef} className="bg-white text-gray-900 rounded-md min-h-[50vh] h-[50vh] overflow-y-auto"></div>;
};


// --- Component: StoryBuilder (The Main Page) ---
const StoryBuilder: NextPage = () => {
  const [view, setView] = useState<'editor' | 'reader'>('editor');
  const [readerKey, setReaderKey] = useState(Date.now());

  const refreshReader = () => {
    setReaderKey(Date.now());
  };

  return (
    <>
      <Head>
        <title>Story Builder</title>
        <meta name="description" content="Build and read your stories chapter by chapter." />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet" />
        <script src="https://cdn.quilljs.com/1.3.6/quill.js" defer={true as any}></script>
      </Head>
      <div className="bg-gray-900 text-white min-h-screen font-sans">
        <header className="bg-gray-800 shadow-lg">
          <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-teal-400">StoryForge</h1>
            <div>
              <button
                onClick={() => setView('editor')}
                className={`px-4 py-2 rounded-md mr-4 transition-all duration-300 ${view === 'editor' ? 'bg-teal-500 text-white shadow-md' : 'bg-gray-700 hover:bg-teal-600'}`}
              >
                Editor
              </button>
              <button
                onClick={() => setView('reader')}
                className={`px-4 py-2 rounded-md transition-all duration-300 ${view === 'reader' ? 'bg-teal-500 text-white shadow-md' : 'bg-gray-700 hover:bg-teal-600'}`}
              >
                Reader
              </button>
            </div>
          </nav>
        </header>

        <main className="container mx-auto px-6 py-8">
          {view === 'editor' ? <Editor onContentUpdate={refreshReader} /> : <Reader key={readerKey} />}
        </main>
      </div>
    </>
  );
};

// --- Component: Editor ---
const Editor: FC<{ onContentUpdate: () => void }> = ({ onContentUpdate }) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  // State for drag-and-drop
  const dragChapterId = useRef<string | null>(null);

  useEffect(() => {
    if (activeChapter) {
      setEditorContent(activeChapter.content);
    }
  }, [activeChapter]);
  
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/chapters');
        const { data } = await res.json();
        // Sort chapters by order when fetching
        const sortedData = data.sort((a: Chapter, b: Chapter) => a.order - b.order);
        setChapters(sortedData);
        if (sortedData.length > 0) {
          setActiveChapter(sortedData[0]);
        }
      } catch (error) {
        console.error("Failed to fetch chapters:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChapters();
  }, []);

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

  const handleSaveChapter = async () => {
    if (!activeChapter) return;
    
    setIsSaving(true);
    try {
      const titleInput = document.getElementById('chapter-title-input') as HTMLInputElement;
      const updatedTitle = titleInput ? titleInput.value : activeChapter.title;
      
      const res = await fetch(`/api/chapters/${activeChapter._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: updatedTitle, content: editorContent }),
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


  if (isLoading) return <div className="text-center p-10">Loading your story from the database...</div>;

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-1/4 bg-gray-800 p-4 rounded-lg shadow-inner">
        <h2 className="text-xl font-semibold mb-4 border-b border-gray-600 pb-2">Chapters</h2>
        <ul className="space-y-2">
          {chapters.map(chapter => (
            <li
              key={chapter._id}
              onClick={() => setActiveChapter(chapter)}
              className={`p-3 rounded-md cursor-pointer transition-all duration-200 flex justify-between items-center ${activeChapter?._id === chapter._id ? 'bg-teal-600 shadow-md' : 'hover:bg-gray-700'}`}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, chapter._id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()} // Necessary to allow dropping
              onDrop={(e) => handleDrop(e, chapter._id)}
            >
              <span className="font-medium truncate pr-2">{chapter.title}</span>
              <button
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteChapter(chapter._id); }}
                className="text-red-400 hover:text-red-200 text-sm flex-shrink-0"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <button onClick={handleAddChapter} className="w-full mt-4 bg-teal-500 hover:bg-teal-400 text-white font-bold py-2 px-4 rounded-md transition-all duration-300">
          + Add Chapter
        </button>
      </aside>
      <section className="w-full md:w-3/4">
        {activeChapter ? (
          <div className="bg-gray-800 p-6 rounded-lg shadow-inner">
            <div className="flex justify-between items-center mb-4">
              <input
                id="chapter-title-input"
                key={activeChapter._id}
                type="text"
                defaultValue={activeChapter.title}
                className="w-full bg-gray-900 text-white text-3xl font-bold p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <button onClick={handleSaveChapter} disabled={isSaving} className="ml-4 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-wait flex-shrink-0">
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <QuillEditor value={editorContent} onChange={setEditorContent} />
          </div>
        ) : (
          <div className="text-center p-10 bg-gray-800 rounded-lg">
            <h2 className="text-2xl">No Chapters Yet</h2>
            <p className="mt-2 text-gray-400">Click "Add Chapter" to begin your story.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default StoryBuilder;

