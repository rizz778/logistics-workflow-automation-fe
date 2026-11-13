import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface UploadZoneProps {
    onUploadStart: (file: File) => void;
    disabled: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUploadStart, disabled }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndUpload(e.target.files[0]);
        }
    };

    const validateAndUpload = (file: File) => {
        const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
        const hasAllowedExt = allowed.some(ext => file.name.toLowerCase().endsWith(ext));
        if (!hasAllowedExt) {
            alert('Only PDF and Image files are allowed.');
            return;
        }
        onUploadStart(file);
    };

    return (
        <div className="bg-[#1E293B]/50 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md">
            <h2 className="font-outfit text-lg font-semibold text-white mb-1">Upload Document</h2>
            <p className="text-xs text-slate-400 mb-5">Supported formats: PDF, PNG, JPG, JPEG (Max 25MB)</p>

            <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 text-center ${isDragOver
                    ? 'border-indigo-500 bg-indigo-500/5'
                    : 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/10'
                    } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
            >
                <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    disabled={disabled}
                />
                <UploadCloud
                    size={44}
                    className={`text-slate-400 transition-transform duration-300 ${isDragOver ? 'translate-y-[-4px] text-indigo-400' : ''
                        }`}
                />
                <p className="text-sm text-slate-300">
                    Drag and drop your trade document here or <span className="text-indigo-500 font-semibold underline">browse</span>
                </p>
            </label>
        </div>
    );
};
