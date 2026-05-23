import { useState, useEffect } from 'react';
import { Dropzone } from './components/Dropzone';
import { Settings } from './components/Settings';
import { FileItem } from './components/FileItem';
import type { FileState } from './components/FileItem';
import { compressImage, compressPdfInPlace, compressPdfByRasterization } from './utils/compressor';
import { ShieldCheck, Sparkles, Files, Trash2, Zap, Download } from 'lucide-react';

export default function App() {
  const [files, setFiles] = useState<FileState[]>([]);
  const [level, setLevel] = useState<1 | 2 | 3>(2); // Default compression level
  const [stripMetadata, setStripMetadata] = useState(true); // Default EXIF/PDF metadata setting
  const [rasterizePdf, setRasterizePdf] = useState(false); // Default PDF rasterization setting
  const [isCompressingAll, setIsCompressingAll] = useState(false);

  // Helper to start sequential background compression for all 3 levels of a file [1, 2]
  const startBackgroundCompression = async (fileStateId: string, file: File) => {
    const levels: (1 | 2 | 3)[] = [1, 2, 3];

    for (const lvl of levels) {
      // Set status to compressing for this level
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id !== fileStateId) return f;
          return {
            ...f,
            compressions: {
              ...f.compressions,
              [lvl]: { size: 0, blob: null as any, status: 'compressing' },
            },
          };
        })
      );

      try {
        let compressedBlob: Blob;
        const isPdf = file.type === 'application/pdf';

        if (isPdf) {
          if (rasterizePdf) {
            compressedBlob = await compressPdfByRasterization(file, lvl);
          } else {
            // Try in-place first [2]
            compressedBlob = await compressPdfInPlace(file, lvl, stripMetadata);
            // Self-healing fallback: if in-place compression failed to reduce size significantly
            if (compressedBlob.size >= file.size * 0.95) {
              console.log(`In-place compression failed to reduce size for Level ${lvl}. Falling back to rasterization.`);
              compressedBlob = await compressPdfByRasterization(file, lvl);
            }
          }
        } else {
          // Compress image via Canvas API [3]
          compressedBlob = await compressImage(file, lvl, stripMetadata);
        }

        setFiles((prev) =>
          prev.map((f) => {
            if (f.id !== fileStateId) return f;
            return {
              ...f,
              compressions: {
                ...f.compressions,
                [lvl]: {
                  size: compressedBlob.size,
                  blob: compressedBlob,
                  status: 'completed',
                },
              },
            };
          })
        );
      } catch (err: any) {
        console.error(`Error compressing Level ${lvl} for file ${file.name}:`, err);
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id !== fileStateId) return f;
            return {
              ...f,
              compressions: {
                ...f.compressions,
                [lvl]: {
                  size: 0,
                  blob: null as any,
                  status: 'failed',
                  error: err.message || 'Lỗi nén tệp',
                },
              },
            };
          })
        );
      }
    }
  };

  // Re-run background compressions when default configuration changes
  useEffect(() => {
    if (files.length === 0) return;
    
    // Process all files
    const recompress = async () => {
      setIsCompressingAll(true);
      for (const item of files) {
        await startBackgroundCompression(item.id, item.file);
      }
      setIsCompressingAll(false);
    };
    
    recompress();
  }, [stripMetadata, rasterizePdf]);

  // Handle selected files
  const handleFilesSelected = (selectedFiles: File[]) => {
    const newFiles: FileState[] = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      originalSize: file.size,
      compressions: {
        1: null,
        2: null,
        3: null,
      },
      selectedLevel: level, // Use current default level
      status: 'pending',
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Start background calculations for new files sequentially
    newFiles.forEach((item) => {
      startBackgroundCompression(item.id, item.file);
    });
  };

  // Remove file from list
  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Custom rename file
  const handleRenameFile = (id: string, newName: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
    );
  };

  // Select level per-file
  const handleSelectLevel = (id: string, lvl: 1 | 2 | 3) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, selectedLevel: lvl } : f))
    );
  };

  // Compress all files (re-trigger processing of pending/failed levels)
  const handleCompressAll = async () => {
    const pendingFiles = files.filter((f) => {
      const activeRes = f.compressions[f.selectedLevel];
      return !activeRes || activeRes.status === 'failed' || activeRes.status === 'pending';
    });
    
    if (pendingFiles.length === 0) return;

    setIsCompressingAll(true);
    for (const item of pendingFiles) {
      await startBackgroundCompression(item.id, item.file);
    }
    setIsCompressingAll(false);
  };

  // Download all selected levels of compressed files
  const handleDownloadAll = () => {
    files.forEach((item) => {
      const res = item.compressions[item.selectedLevel];
      if (res?.status === 'completed' && res.blob) {
        const url = URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });
  };

  // Clear file list
  const handleClearAll = () => {
    setFiles([]);
  };

  const hasPending = files.some((f) => {
    const activeRes = f.compressions[f.selectedLevel];
    return !activeRes || activeRes.status === 'pending' || activeRes.status === 'failed';
  });
  const hasCompleted = files.some((f) => f.compressions[f.selectedLevel]?.status === 'completed');

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary-500 selection:text-white pb-20 relative overflow-hidden font-sans">
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-950/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-950/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 pt-12 flex flex-col gap-8 relative z-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Client-Side
              </span>
              <span className="text-white/30 text-xs">•</span>
              <span className="text-white/40 text-xs font-semibold">Zero-Trust Architecture</span>
            </div>
            <h1 className="text-3.5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-primary-400 flex items-center gap-2">
              Shrinkify <Sparkles className="w-6 h-6 text-primary-400 shrink-0" />
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Trình nén PDF và hình ảnh bảo mật. Không upload file lên server [2].
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-950/10 border border-emerald-900/20 px-4 py-2.5 rounded-xl self-start md:self-auto">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-left">
              <p className="text-[11px] font-bold text-emerald-400 leading-tight">An toàn tuyệt đối</p>
              <p className="text-[9px] text-emerald-500/60 leading-none">Files remain on your device [2]</p>
            </div>
          </div>
        </header>

        {/* Settings Panel */}
        <Settings
          level={level}
          setLevel={setLevel}
          stripMetadata={stripMetadata}
          setStripMetadata={setStripMetadata}
          rasterizePdf={rasterizePdf}
          setRasterizePdf={setRasterizePdf}
        />

        {/* Dropzone Area */}
        <Dropzone onFilesSelected={handleFilesSelected} />

        {/* File List / Processing Area */}
        {files.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <Files className="w-4 h-4 text-primary-400" /> Danh sách tệp ({files.length})
              </h3>
              <div className="flex items-center gap-2">
                {hasPending && (
                  <button
                    onClick={handleCompressAll}
                    disabled={isCompressingAll}
                    className="h-8 px-3.5 bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40"
                  >
                    <Zap className="w-3.5 h-3.5" /> Nén lại các lỗi
                  </button>
                )}
                {hasCompleted && (
                  <button
                    onClick={handleDownloadAll}
                    className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải tất cả bản chọn
                  </button>
                )}
                <button
                  onClick={handleClearAll}
                  disabled={isCompressingAll}
                  className="h-8 px-3.5 bg-white/5 hover:bg-rose-950/20 hover:text-rose-400 border border-white/5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Dọn sạch
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {files.map((file) => (
                <FileItem
                  key={file.id}
                  item={file}
                  onRemove={handleRemoveFile}
                  onRename={handleRenameFile}
                  onSelectLevel={handleSelectLevel}
                />
              ))}
            </div>
          </div>
        )}

        {/* Security / Technology Disclosure Info */}
        <section className="bg-card/30 border border-white/5 rounded-2xl p-5 backdrop-blur-md flex flex-col gap-3">
          <h4 className="text-xs font-bold text-white/90 tracking-wide uppercase">Cơ chế hoạt động kỹ thuật & Cam kết An toàn thông tin</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white/50">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-white/70">Nén & Xử lý Hình ảnh</span>
              <span>
                Hình ảnh được giải mã qua browser Canvas API. Chúng tôi vẽ lại pixel trên lưới đồ họa mới và xuất định dạng JPEG ở mức nén thích hợp [3]. EXIF metadata bị loại bỏ hoàn toàn do Canvas API không hỗ trợ xuất siêu dữ liệu gốc [3].
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-white/70">Nén & Xóa siêu dữ liệu PDF</span>
              <span>
                Sử dụng thư viện `pdf-lib` để phân tích tệp nhị phân [2]. Chương trình đi qua cấu trúc PDF, quét các XObject hình ảnh dạng `/DCTDecode` và downsample trực tiếp [2]. Toàn bộ khối thông tin `/Info` và `/Metadata` trong Catalog PDF được ghi đè bằng giá trị rỗng [4].
              </span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
