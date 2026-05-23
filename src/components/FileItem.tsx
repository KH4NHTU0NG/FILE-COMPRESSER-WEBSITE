import React, { useState, useEffect } from 'react';
import { FileImage, FileText, Download, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export interface FileState {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  compressedSize: number | null;
  compressedBlob: Blob | null;
  status: 'pending' | 'compressing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

interface FileItemProps {
  item: FileState;
  onRemove: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onCompress: (id: string) => void;
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
  onCompress,
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
    
    // Append the original extension back when trigger parent update
    const lastDotIndex = item.file.name.lastIndexOf('.');
    const extension = lastDotIndex !== -1 ? item.file.name.substring(lastDotIndex) : '';
    onRename(item.id, value + extension);
  };

  const handleDownload = () => {
    if (!item.compressedBlob) return;
    const url = URL.createObjectURL(item.compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate saving ratio
  const savingRatio =
    item.compressedSize && item.originalSize
      ? Math.round(((item.originalSize - item.compressedSize) / item.originalSize) * 100)
      : null;

  return (
    <div className="w-full bg-white/5 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all duration-300 backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      {/* File Info */}
      <div className="flex items-center gap-3.5 w-full md:w-auto">
        <div className={`p-3 rounded-lg ${isImage ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' : 'bg-blue-950/20 text-blue-400 border border-blue-900/30'}`}>
          {isImage ? <FileImage className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white/95 truncate max-w-[200px] md:max-w-[250px]">
              {item.name}
            </span>
            <span className="text-xs text-white/40">({formatBytes(item.originalSize)})</span>
          </div>

          {/* Progress / Status indicator */}
          {item.status === 'compressing' && (
            <div className="flex flex-col gap-1 w-full md:w-48 mt-1.5">
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-primary-400 font-medium animate-pulse flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Đang nén {item.progress}%...
              </span>
            </div>
          )}

          {item.status === 'completed' && item.compressedSize && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Nén thành công
              </span>
              <span className="text-xs text-white/60">
                {formatBytes(item.compressedSize)}
              </span>
              {savingRatio !== null && savingRatio > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  -{savingRatio}%
                </span>
              )}
            </div>
          )}

          {item.status === 'failed' && (
            <div className="text-xs font-semibold text-rose-400 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Lỗi: {item.error || 'Nén thất bại'}
            </div>
          )}

          {item.status === 'pending' && (
            <span className="text-xs text-white/40 block mt-1">Sẵn sàng để nén</span>
          )}
        </div>
      </div>

      {/* Settings / Actions */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end border-t border-white/5 pt-3 md:border-t-0 md:pt-0">
        {/* Custom Rename Field (Only visible when pending or completed) */}
        {(item.status === 'pending' || item.status === 'completed') && (
          <div className="flex items-center bg-white/5 border border-white/5 rounded-lg overflow-hidden h-9 px-2 w-full md:w-44 focus-within:border-primary-500 transition-colors">
            <input
              type="text"
              value={customName}
              onChange={handleRenameChange}
              placeholder="Đổi tên file..."
              className="bg-transparent text-xs text-white placeholder-white/30 focus:outline-none w-full"
            />
            <span className="text-[10px] text-white/30 font-medium select-none ml-1">
              {item.file.name.substring(item.file.name.lastIndexOf('.'))}
            </span>
          </div>
        )}

        {/* Compression Action / Download */}
        {item.status === 'pending' && (
          <button
            onClick={() => onCompress(item.id)}
            className="px-4 h-9 bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white rounded-lg text-xs font-semibold transition-all shadow-md flex items-center gap-1.5"
          >
            Nén ngay
          </button>
        )}

        {item.status === 'completed' && (
          <button
            onClick={handleDownload}
            className="px-4 h-9 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow-md flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Tải xuống
          </button>
        )}

        {/* Remove Button */}
        <button
          onClick={() => onRemove(item.id)}
          disabled={item.status === 'compressing'}
          className="p-2 h-9 w-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 text-white/40 hover:text-rose-400 hover:border-rose-900/30 hover:bg-rose-950/10 transition-all disabled:opacity-40 disabled:pointer-events-none"
          title="Xóa khỏi danh sách"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
