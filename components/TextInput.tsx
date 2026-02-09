import React, { useState, useRef } from 'react';
import { Upload, Loader2, ArrowRight } from 'lucide-react';
import { extractTextFromPDF } from '../services/pdfService';
import { ProcessingStatus } from '../types';

interface TextInputProps {
  onStartReading: (title: string, text: string) => void;
}

export const TextInput: React.FC<TextInputProps> = ({ onStartReading }) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStart = () => {
    if (!text.trim()) return;
    const finalTitle = title.trim() || `Untitled Note ${new Date().toLocaleDateString()}`;
    onStartReading(finalTitle, text);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('processing');
    setTitle(file.name.replace('.pdf', ''));

    try {
      if (file.type === 'application/pdf') {
        const extractedText = await extractTextFromPDF(file);
        setText(extractedText);
        setStatus('success');
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          setText(event.target?.result as string || '');
          setStatus('success');
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-500">
      
      <div className="text-center mb-10">
        <h2 className="text-3xl font-header font-bold text-text-primary mb-2">Read faster, retain more.</h2>
        <p className="text-text-secondary">Paste your text below or upload a document to begin.</p>
      </div>

      <div className="relative group">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste text here..."
          className="w-full h-64 bg-transparent border-2 border-dashed border-text-primary/10 rounded-xl p-6 text-lg text-text-primary placeholder:text-text-primary/30 focus:border-accent-red/50 focus:outline-none focus:bg-transparent focus:ring-0 focus:ring-offset-0 transition-all resize-none font-ui"
        />
        
        {/* Actions Bar inside */}
        <div className="absolute bottom-4 right-4 flex gap-2">
           <button
             onClick={() => fileInputRef.current?.click()}
             className="flex items-center gap-2 px-4 py-2 bg-panel-bg border border-text-primary/10 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-text-primary/30 transition-all font-medium"
           >
             {status === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
             {status === 'processing' ? 'Processing...' : 'Upload PDF'}
           </button>
           
           {text.trim() && (
             <button
               onClick={handleStart}
               className="flex items-center gap-2 px-6 py-2 bg-accent-red text-white rounded-lg text-sm font-bold shadow-glow hover:bg-accent-red/90 transition-all"
             >
               Start Reading <ArrowRight className="w-4 h-4" />
             </button>
           )}
        </div>
      </div>

      {status === 'error' && (
        <p className="mt-4 text-center text-red-500 text-sm">
          Failed to load file. Please try again.
        </p>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".txt,.pdf"
        className="hidden"
      />
    </div>
  );
};
