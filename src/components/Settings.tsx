import React from 'react';
import { ShieldCheck, Zap, Image, AlertCircle } from 'lucide-react';

interface SettingsProps {
  level: 1 | 2 | 3;
  setLevel: (level: 1 | 2 | 3) => void;
  stripMetadata: boolean;
  setStripMetadata: (strip: boolean) => void;
  rasterizePdf: boolean;
  setRasterizePdf: (rasterize: boolean) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  level,
  setLevel,
  stripMetadata,
  setStripMetadata,
  rasterizePdf,
  setRasterizePdf,
}) => {
  return (
    <div className="w-full bg-card/60 border border-white/5 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-400" /> Cấu hình Nén tệp
        </h2>
        <p className="text-sm text-white/50">Tùy chọn mức độ nén và tùy chỉnh cấu hình bảo mật.</p>
      </div>

      {/* Mức độ nén */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-white/80">Mức độ nén (Compression Level)</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Level 1 */}
          <button
            onClick={() => setLevel(1)}
            className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 ${
              level === 1
                ? 'bg-primary-950/10 border-primary-500 shadow-[0_0_15px_rgba(124,101,252,0.15)]'
                : 'bg-white/5 border-white/5 hover:border-white/20'
            }`}
          >
            <span className="text-sm font-bold text-white">Mức 1: High Quality</span>
            <span className="text-xs text-white/60 mt-1">
              Giữ chất lượng nguyên bản [1]. Ảnh DPI cao ~300. Dọn dẹp đối tượng thừa của PDF [2].
            </span>
          </button>

          {/* Level 2 */}
          <button
            onClick={() => setLevel(2)}
            className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 ${
              level === 2
                ? 'bg-primary-950/10 border-primary-500 shadow-[0_0_15px_rgba(124,101,252,0.15)]'
                : 'bg-white/5 border-white/5 hover:border-white/20'
            }`}
          >
            <span className="text-sm font-bold text-white">Mức 2: Balanced</span>
            <span className="text-xs text-white/60 mt-1">
              Cân bằng tốt nhất. Downsample ảnh xuống ~144 DPI. Nén ảnh JPEG vừa phải [1, 2].
            </span>
          </button>

          {/* Level 3 */}
          <button
            onClick={() => setLevel(3)}
            className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 ${
              level === 3
                ? 'bg-primary-950/10 border-primary-500 shadow-[0_0_15px_rgba(124,101,252,0.15)]'
                : 'bg-white/5 border-white/5 hover:border-white/20'
            }`}
          >
            <span className="text-sm font-bold text-white">Mức 3: Max Compression</span>
            <span className="text-xs text-white/60 mt-1">
              Tối ưu dung lượng gửi mail. Downsample xuống 72 DPI. Nén ảnh JPEG mạnh [1, 2].
            </span>
          </button>
        </div>
      </div>

      <hr className="border-white/5" />

      {/* Cấu hình PDF nâng cao */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <Image className="w-4 h-4 text-primary-400" /> Nén cực hạn PDF (Rasterize Pages)
            </span>
            <span className="text-xs text-white/40">
              Chuyển tất cả trang PDF thành ảnh trước khi nén. Tối ưu cực mạnh cho PDF chứa nhiều đối tượng quét (Scanned PDF) [2, 3].
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rasterizePdf}
              onChange={(e) => setRasterizePdf(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
          </label>
        </div>

        {rasterizePdf && (
          <div className="flex gap-2.5 items-start bg-amber-950/10 border border-amber-900/30 rounded-xl p-3.5 text-xs text-amber-400">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Lưu ý khi Rasterize PDF</p>
              <p className="text-amber-500/70">
                Phương pháp này sẽ chuyển toàn bộ văn bản và cấu trúc trang thành ảnh tĩnh. Văn bản trong file xuất ra sẽ không thể bôi đen (select) hoặc tìm kiếm được nữa.
              </p>
            </div>
          </div>
        )}
      </div>

      <hr className="border-white/5" />

      {/* Xóa siêu dữ liệu */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Loại bỏ siêu dữ liệu (Metadata Stripping)
            </span>
            <span className="text-xs text-white/40">
              Xóa thông tin định danh: EXIF của ảnh, tác giả, phần mềm tạo tài liệu PDF [3, 4].
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={stripMetadata}
              onChange={(e) => setStripMetadata(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
          </label>
        </div>

        {stripMetadata && (
          <div className="flex gap-2.5 items-start bg-emerald-950/10 border border-emerald-900/30 rounded-xl p-3.5 text-xs text-emerald-400">
            <ShieldCheck className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Kiến trúc Zero-Trust & Bảo mật tối đa</p>
              <p className="text-emerald-500/70">
                Toàn bộ dữ liệu được xóa EXIF (GPS, thiết bị, thời gian) và Catalog PDF trong bộ nhớ RAM trình duyệt của bạn trước khi tải xuống [3, 4]. File gốc của bạn không bao giờ rời khỏi thiết bị [2].
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
