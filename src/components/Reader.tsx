import { useState, useEffect, FC } from 'react';

// --- Type Definition ---
interface Chapter {
  _id: string;
  title: string;
  content: string;
  order: number;
}

// --- Component: Reader ---
const Reader: FC = () => {
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [fontSize, setFontSize] = useState<'base' | 'lg' | 'xl'>('lg');
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif'>('serif');

    useEffect(() => {
        const fetchChapters = async () => {
            try {
                setIsLoading(true);
                const res = await fetch('/api/chapters');
                const { data } = await res.json();
                // Make sure to sort by the 'order' field
                const sortedData = data.sort((a: Chapter, b: Chapter) => a.order - b.order);
                setChapters(sortedData);
            } catch (error) {
                console.error("Failed to fetch chapters for reader:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchChapters();
    }, []);

    const goToNextChapter = () => {
        setCurrentChapterIndex(prev => Math.min(prev + 1, chapters.length - 1));
    };

    const goToPrevChapter = () => {
        setCurrentChapterIndex(prev => Math.max(prev - 1, 0));
    };

    const fontSizeClasses = {
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
    };

    if (isLoading) return <div className="text-center p-10">Loading story...</div>;
    
    if (!chapters || chapters.length === 0) return <div className="text-center p-10 bg-gray-800 rounded-lg">This story has no chapters yet.</div>;

    const chapter = chapters[currentChapterIndex];

    return (
        <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-2xl flex flex-col h-[80vh]">
            {/* --- Reader Controls --- */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center space-x-4">
                     {/* Font Size Selector */}
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-400">Size:</span>
                        <button onClick={() => setFontSize('base')} className={`px-2 py-1 text-xs rounded ${fontSize === 'base' ? 'bg-teal-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>S</button>
                        <button onClick={() => setFontSize('lg')} className={`px-2 py-1 text-sm rounded ${fontSize === 'lg' ? 'bg-teal-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>M</button>
                        <button onClick={() => setFontSize('xl')} className={`px-2 py-1 text-base rounded ${fontSize === 'xl' ? 'bg-teal-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>L</button>
                    </div>
                     {/* Font Family Selector */}
                     <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-400">Font:</span>
                        <button onClick={() => setFontFamily('sans')} className={`px-3 py-1 text-sm rounded ${fontFamily === 'sans' ? 'bg-teal-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Sans</button>
                        <button onClick={() => setFontFamily('serif')} className={`px-3 py-1 text-sm rounded ${fontFamily === 'serif' ? 'bg-teal-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Serif</button>
                    </div>
                </div>
            </div>
            
            {/* --- Scrollable Content --- */}
            <article className={`flex-grow overflow-y-auto p-6 md:p-10 prose prose-invert max-w-none ${fontSizeClasses[fontSize]} ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}>
                <h2 className="text-xl font-bold text-teal-300 truncate pr-4">{chapter.title}</h2>
                <div dangerouslySetInnerHTML={{ __html: chapter.content }} />
            </article>

            {/* --- Sticky Footer Navigation --- */}
            <div className="p-4 border-t border-gray-700 flex justify-between items-center flex-shrink-0">
                <button
                    onClick={goToPrevChapter}
                    disabled={currentChapterIndex === 0}
                    className="px-6 py-2 bg-gray-700 rounded-md hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                    Previous
                </button>
                <span className="text-gray-400">Chapter {currentChapterIndex + 1} of {chapters.length}</span>
                <button
                    onClick={goToNextChapter}
                    disabled={currentChapterIndex === chapters.length - 1}
                    className="px-6 py-2 bg-gray-700 rounded-md hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Reader;
