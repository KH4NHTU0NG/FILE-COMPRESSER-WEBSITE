import React, { useState, useEffect } from 'react';
import { FileImage, FileText, Download, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export interface CompressionResult {
  size: number;
  blob: Blob;
  status: 'pending' | 'compressing' | 'completed' | 'failed';
  error?: string;
}

export interface FileState {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  compressions: {
    1: CompressionResult | null;
    2: CompressionResult | null;
    3: CompressionResult | null;
  };
  selectedLevel: 1 | 2 | 3;
  status: 'pending' | 'compressing' | 'completed' | 'failed';
  error?: string;
}

interface FileItemProps {
  item: FileState;
  onRemove: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onSelectLevel: (id: string, level: 1 | 2 | 3) => void;
}

// Utility to format bytes into readable string
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const FileItem: React.FC<FileItemProps> = ({
  item,
  onRemove,
  onRename,
  onSelectLevel,
}) => {
  const [customName, setCustomName] = useState('');
  const isImage = item.file.type.startsWith('image/');

  useEffect(() => {
    // Set initial value for rename input without extension
    const lastDotIndex = item.name.lastIndexOf('.');
    const nameWithoutExtension = lastDotIndex !== -1 ? item.name.substring(0, lastDotIndex) : item.name;
    setCustomName(nameWithoutExtension);
  }, [item.name]);

  const handleRenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomName(value);
    
    // Append the original extension back when triggering parent update
    const lastDotIndex = item.file.name.lastIndexOf('.');
    const extension = lastDotIndex !== -1 ? item.file.name.substring(lastDotIndex) : '';
    onRename(item.id, value + extension);
  };

  // Get current selected compression result
  const selectedResult = item.compressions[item.selectedLevel];

  const handleDownload = () => {
    if (!selectedResult || !selectedResult.blob) return;
    const url = URL.createObjectURL(selectedResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRatioString = (original: number, compressed: number) => {
    if (compressed >= original) return '0%';
    const ratio = Math.round(((original - compressed) / original) * 100);
    return `-${ratio}%`;
  };

  return (
    <div className="w-full bg-white/5 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all duration-300 backdrop-blur-sm flex flex-col gap-5">
      {/* File Info */}
      <div className="flex items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`p-3 rounded-lg shrink-0 ${isImage ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' : 'bg-blue-950/20 text-blue-400 border border-blue-900/30'}`}>
            {isImage ? <FileImage className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-white/95 truncate max-w-[200px] md:max-w-[350px]">
                {item.name}
              </span>
              <span className="text-xs text-white/40">({formatBytes(item.originalSize)})</span>
            </div>

            {/* Overall Status indicator */}
            {selectedResult?.status === 'completed' && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sẵn sàng tải xuống
              </span>
            )}
            {selectedResult?.status === 'compressing' && (
              <span className="text-xs text-primary-400 font-medium animate-pulse flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" /> Đang tính toán kích thước...
              </span>
            )}
            {selectedResult?.status === 'failed' && (
              <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Lỗi: {selectedResult.error || 'Nén thất bại'}
              </span>
            )}
            {!selectedResult && (
              <span className="text-xs text-white/40">Đang chờ tính toán...</span>
            )}
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={() => onRemove(item.id)}
          className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 text-white/40 hover:text-rose-400 hover:border-rose-900/30 hover:bg-rose-950/10 transition-all shrink-0"
          title="Xóa khỏi danh sách"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Option Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {([1, 2, 3] as const).map((lvl) => {
          const res = item.compressions[lvl];
          const isSelected = item.selectedLevel === lvl;
          const isComp = res?.status === 'compressing';
          const isDone = res?.status === 'completed';

          let label = 'Mức 1: High Quality';
          if (lvl === 2) label = 'Mức 2: Balanced';
          if (lvl === 3) label = 'Mức 3: Max Comp';

          return (
            <button
              key={lvl}
              onClick={() => onSelectLevel(item.id, lvl)}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-200 ${
                isSelected
                  ? 'bg-primary-950/10 border-primary-500 shadow-[0_0_12px_rgba(124,101,252,0.15)] text-white'
                  : 'bg-white/5 border-white/5 hover:border-white/20 text-white/70'
              }`}
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold">{label}</span>
                {isComp && (
                  <span className="text-[10px] text-primary-400 flex items-center gap-1 mt-0.5 animate-pulse">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Đang tính...
                  </span>
                )}
                {isDone && res && (
                  <span className="text-[10px] text-white/50 mt-0.5">
                    {formatBytes(res.size)}
                  </span>
                )}
                {!res && (
                  <span className="text-[10px] text-white/30 mt-0.5">Đang chờ...</span>
                )}
              </div>

              {isDone && res && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-primary-500/20 text-primary-300' : 'bg-white/10 text-white/60'
                }`}>
                  {getRatioString(item.originalSize, res.size)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Rename / Download Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-white/5 pt-4">
        {/* Custom Rename Field */}
        <div className="flex items-center bg-white/5 border border-white/5 rounded-lg overflow-hidden h-9 px-2 w-full md:max-w-xs focus-within:border-primary-500 transition-colors">
          <span className="text-xs text-white/30 font-medium select-none mr-2">Đổi tên:</span>
          <input
            type="text"
            value={customName}
            onChange={handleRenameChange}
            placeholder="Nhập tên mới..."
            className="bg-transparent text-xs text-white placeholder-white/30 focus:outline-none w-full"
          />
          <span className="text-[10px] text-white/30 font-medium select-none ml-1">
            {item.file.name.substring(item.file.name.lastIndexOf('.'))}
          </span>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={selectedResult?.status !== 'completed'}
          className="px-6 h-9 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-lg text-xs font-semibold transition-all shadow-md flex items-center justify-center gap-1.5 w-full md:w-auto"
        >
          <Download className="w-3.5 h-3.5" /> Tải xuống bản đã chọn
        </button>
      </div>
    </div>
  );
};
