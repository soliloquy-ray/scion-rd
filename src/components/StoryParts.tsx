/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, FC, useMemo } from 'react';
import { IPart } from '../models/Part';
import { IChapter } from '../models/Chapter';
import { IStory } from '../models/Story';

// Helper to strip HTML for AI processing
const stripHtml = (html: string) => {
  if (typeof window === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

// Reusable AI Response Modal
const AiResponseModal: FC<{ title: string; content: string; onClose: () => void }> = ({ title, content, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-teal-400">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto custom-scrollbar pr-4 whitespace-pre-wrap text-gray-300">
                    {content}
                    {!content.includes('--- ERROR ---') && <span className="inline-block w-2 h-5 bg-teal-400 animate-pulse ml-1"></span>}
                </div>
            </div>
        </div>
    );
};

// Main Component
const StoryParts: FC = () => {
    const [parts, setParts] = useState<IPart[]>([]);
    const [allChapters, setAllChapters] = useState<IChapter[]>([]);
    const [storyContext, setStoryContext] = useState<IStory | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activePart, setActivePart] = useState<IPart | null>(null);
    
    const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [showAiModal, setShowAiModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [partsRes, chaptersRes, storyRes] = await Promise.all([
                    fetch('/api/parts'),
                    fetch('/api/chapters'),
                    fetch('/api/story'),
                ]);
                const { data: partsData } = await partsRes.json();
                const { data: chaptersData } = await chaptersRes.json();
                const { data: storyData } = await storyRes.json();

                setParts(partsData);
                setAllChapters(chaptersData);
                setStoryContext(storyData);
                if (partsData.length > 0) setActivePart(partsData[0]);

            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Memoized calculations for assigned and available chapters
    const assignedChapterIds = useMemo(() => new Set(activePart ? (activePart.chapters as any[]).map(c => c._id) : []), [activePart]);
    const availableChapters = useMemo(() => allChapters.filter(c => !assignedChapterIds.has(c._id)), [allChapters, assignedChapterIds]);

    const handleAddPart = async () => {
        try {
            const res = await fetch('/api/parts', { method: 'POST' });
            const { data: newPart } = await res.json();
            setParts([...parts, newPart]);
            setActivePart(newPart);
        } catch (error) {
            console.error("Failed to add part:", error);
        }
    };

    const handleDeletePart = async (partId: string) => {
        if (!window.confirm("Are you sure you want to delete this part? This cannot be undone.")) return;
        try {
            await fetch(`/api/parts/${partId}`, { method: 'DELETE' });
            const newParts = parts.filter(p => p._id !== partId);
            setParts(newParts);
            setActivePart(newParts.length > 0 ? newParts[0] : null);
        } catch (error) {
            console.error("Failed to delete part:", error);
        }
    };

    const handleUpdatePart = async (partId: string, updatedData: Partial<IPart>) => {
        try {
            const res = await fetch(`/api/parts/${partId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            const { data: updatedPart } = await res.json();
            
            // Repopulate chapter data on the frontend
            const populatedPart = {
                ...updatedPart,
                chapters: updatedPart.chapters.map((id: string) => allChapters.find(c => c._id === id)).filter(Boolean)
            };

            const newParts = parts.map(p => p._id === partId ? populatedPart : p);
            setParts(newParts);
            setActivePart(populatedPart);
        } catch (error) {
            console.error("Failed to update part:", error);
        }
    };

    const handleAssignChapter = (chapterId: string) => {
        if (!activePart) return;
        const currentChapterIds = (activePart.chapters as any[]).map(c => c._id);
        const updatedChapterIds = [...currentChapterIds, chapterId];
        handleUpdatePart(String(activePart._id), { chapters: updatedChapterIds });
    };

    const handleUnassignChapter = (chapterId: string) => {
        if (!activePart) return;
        const updatedChapterIds = (activePart.chapters as any[]).map(c => c._id).filter(id => id !== chapterId);
        handleUpdatePart(String(activePart._id), { chapters: updatedChapterIds });
    };
    
    const handleChapterSelectionForAI = (chapterId: string) => {
        const newSelection = new Set(selectedChapters);
        newSelection.has(chapterId) ? newSelection.delete(chapterId) : newSelection.add(chapterId);
        setSelectedChapters(newSelection);
    };

const handleAiRequest = async () => {
        if (!activePart || selectedChapters.size === 0) return;
        
        setShowAiModal(true);
        setIsAiLoading(true);
        setAiResponse('');

        try {
            const contentForAI = Array.from(selectedChapters).map(id => {
                const chap = (activePart.chapters as any[]).find(c => c._id === id);
                return `Chapter (Order ${chap.order + 1}): ${chap.title}\n${stripHtml(chap.content)}`;
            }).join('\n\n---\n\n');

            const response = await fetch('/api/ai/part', { // Note: new endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    partContext: contentForAI,
                    systemInstruction: activePart.systemInstruction,
                    storyContext: storyContext?.plotSummary || ''
                })
            });

            if (!response.ok || !response.body) throw new Error(`API error: ${response.statusText}`);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                setAiResponse(prev => prev + chunk);
            }
        } catch (error: any) {
            console.error("AI Request Failed:", error);
            setAiResponse(prev => `${prev}\n\n--- ERROR ---\n${error.message}`);
        } finally {
            setIsAiLoading(false);
        }
    };

    if (isLoading) return <div className="text-center p-10">Loading Story Structure...</div>;

    return (
        <>
            {showAiModal && (
                <AiResponseModal 
                    title="Part Analysis" 
                    content={aiResponse} 
                    onClose={() => setShowAiModal(false)}
                />
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg shadow-inner">
                    <h2 className="text-xl font-semibold mb-4 text-teal-300">Story Parts</h2>
                    <button onClick={handleAddPart} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-md mb-4 transition duration-300">
                        + Add New Part
                    </button>
                    <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {parts.map(part => (
                            <div key={String(part._id)} onClick={() => setActivePart(part)}
                                className={`group p-3 rounded-md mb-2 cursor-pointer flex justify-between items-center ${activePart?._id === part._id ? 'bg-teal-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                <span className="truncate">{part.title}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleDeletePart(String(part._id)); }} className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100">
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-2 bg-gray-800 p-4 rounded-lg shadow-inner">
                    {activePart ? (
                        <div>
                            <input type="text" value={activePart.title} 
                                onChange={(e) => setActivePart({...activePart as any, title: e.target.value})}
                                onBlur={() => handleUpdatePart(String(activePart._id), { title: activePart.title })}
                                className="text-2xl font-bold bg-transparent w-full mb-4 focus:outline-none focus:border-b-2 focus:border-teal-400" />
                            
                            <h3 className="text-lg font-semibold text-teal-300 mb-2">AI System Instruction</h3>
                            <textarea value={activePart.systemInstruction}
                                onChange={(e) => setActivePart({...activePart as any, systemInstruction: e.target.value})}
                                onBlur={() => handleUpdatePart(String(activePart._id), { systemInstruction: activePart.systemInstruction })}
                                className="w-full bg-gray-900 p-2 rounded h-24 custom-scrollbar resize-none focus:outline-none focus:ring-2 focus:ring-teal-500" />

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-teal-300 mb-2">Chapters in this Part</h3>
                                    <div className="bg-gray-900 p-2 rounded h-48 overflow-y-auto custom-scrollbar">
                                        {(activePart.chapters as any as IChapter[]).map(chap => (
                                            <div key={String(chap._id)} className="flex justify-between items-center bg-gray-700 p-2 rounded mb-2">
                                                <span>{chap.title}</span>
                                                <button onClick={() => handleUnassignChapter(String(chap._id))} className="text-red-400 hover:text-red-300">Remove</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-teal-300 mb-2">Available Chapters</h3>
                                    <div className="bg-gray-900 p-2 rounded h-48 overflow-y-auto custom-scrollbar">
                                        {availableChapters.map(chap => (
                                            <div key={String(chap._id)} className="flex justify-between items-center bg-gray-700 p-2 rounded mb-2">
                                                <span>{chap.title}</span>
                                                <button onClick={() => handleAssignChapter(String(chap._id))} className="text-green-400 hover:text-green-300">Add</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-semibold text-teal-300 mt-4 mb-2">Select Chapters for Analysis</h3>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                {(activePart.chapters as any as IChapter[]).map(chap => (
                                    <label key={String(chap._id)} className="flex items-center gap-2 bg-gray-700 p-2 rounded cursor-pointer">
                                        <input type="checkbox"
                                            checked={selectedChapters.has(String(chap._id))}
                                            onChange={() => handleChapterSelectionForAI(String(chap._id))}
                                            className="form-checkbox h-5 w-5 text-teal-600 bg-gray-800 border-gray-600 rounded focus:ring-teal-500"
                                        />
                                        <span>{chap.title}</span>
                                    </label>
                                ))}
                            </div>

                            <button onClick={handleAiRequest} disabled={isAiLoading || selectedChapters.size === 0}
                                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500">
                                {isAiLoading ? 'Analyzing...' : 'Analyze Selected Chapters'}
                            </button>
                        </div>
                    ) : <p className="text-center text-gray-400 pt-20">Select or create a part to begin.</p>}
                </div>
            </div>
        </>
    );
};

export default StoryParts;

