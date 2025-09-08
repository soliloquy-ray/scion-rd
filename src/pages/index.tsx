import { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Reader from '../components/Reader';
import Editor from '../components/Editor'; // Import the new Editor component
import StoryParts from '@/components/StoryParts';

type View = 'editor' | 'reader' | 'parts';
// --- Component: StoryBuilder (The Main Page) ---
const StoryBuilder: NextPage = () => {
  const [view, setView] = useState<View>('editor');
  const [readerKey, setReaderKey] = useState(Date.now());

  // This function is passed down to trigger a re-fetch in the reader
  const refreshReader = () => {
    setReaderKey(Date.now());
  };

  const renderView = () => {
    switch (view) {
      case 'editor':
        return <Editor onContentUpdate={refreshReader} />;
      case 'reader':
        return <Reader key={readerKey} />;
      case 'parts':
        return <StoryParts />;
      default:
        return <Editor onContentUpdate={refreshReader} />;
    }
  };

  return (
    <>
      <Head>
        <title>StoryForge</title>
        <meta name="description" content="Build and read your stories chapter by chapter." />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet" />
        <script src="https://cdn.quilljs.com/1.3.6/quill.js" async={true}></script>
        {/* Custom scrollbar styles */}
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #1a202c; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #2c5282; border-radius: 20px; border: 2px solid #1a202c; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #38b2ac; }
        `}</style>
      </Head>
      <div className="bg-gray-900 text-white min-h-screen font-sans">
        <header className="bg-gray-800 shadow-lg sticky top-0 z-20">
          <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-teal-400">StoryForge</h1>
            <div>
              <button
                onClick={() => setView('editor')}
                className={`px-4 py-2 rounded-md mr-4 transition-all duration-300 ${view === 'editor' ? 'bg-teal-500 text-white shadow-md' : 'bg-gray-700 hover:bg-teal-600'}`}
              >
                Editor
              </button>
              <button onClick={() => setView('parts')}
                className={`px-4 py-2 rounded-md mr-2 ${view === 'parts' ? 'bg-teal-500' : 'bg-gray-700'}`}>
                Parts
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
        <main className="container mx-auto px-6 py-8">{renderView()}</main>
      </div>
    </>
  );
};

export default StoryBuilder;

