import React, { useState, useRef } from 'react';
import { UploadCloud, FileImage, FileText } from 'lucide-react';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFilesSelected }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      const validFiles = filesArray.filter(file => {
        const type = file.type;
        return type === 'application/pdf' || type.startsWith('image/');
      });
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
      className={`group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-md bg-opacity-10 ${
        isDragActive
          ? 'border-primary-500 bg-primary-950/10 shadow-[0_0_20px_rgba(124,101,252,0.2)]'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInput}
        accept="application/pdf,image/*"
        className="hidden"
      />

      <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
        <div className="mb-4 p-4 rounded-full bg-white/5 border border-white/10 text-white/80 group-hover:scale-110 transition-transform duration-300">
          <UploadCloud className="w-10 h-10 text-primary-400 group-hover:text-primary-300" />
        </div>
        <p className="mb-2 text-lg font-medium text-white/90">
          Kéo thả tệp vào đây, hoặc <span className="text-primary-400 font-semibold group-hover:underline">chọn từ thiết bị</span>
        </p>
        <p className="text-sm text-white/50 mb-4">
          Hỗ trợ PDF, PNG, JPG, JPEG, WebP
        </p>
        
        <div className="flex items-center gap-4 text-xs text-white/40 border-t border-white/5 pt-4 w-64 justify-center">
          <span className="flex items-center gap-1">
            <FileImage className="w-3.5 h-3.5 text-emerald-400" /> Hình ảnh
          </span>
          <span className="h-3 w-px bg-white/10" />
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-blue-400" /> Tài liệu PDF
          </span>
        </div>
      </div>
    </div>
  );
};
