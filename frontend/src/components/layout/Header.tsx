import React from "react";
import { Search, Sparkles, LayoutDashboard, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (mode: boolean) => void;
  autoMode: boolean;
  setAutoMode: (mode: boolean) => void;
  handleCapture: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  cooldown: boolean;
}

const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  isDarkMode,
  setIsDarkMode,
  autoMode,
  setAutoMode,
  handleCapture,
  handleFileUpload,
  uploading,
  cooldown
}) => {
  return (
    <header className="h-14 flex items-center justify-between px-8 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
         <div className="relative group">
           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
           <input 
             type="text" 
             placeholder="搜索菜品名称或记录..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
           />
           {searchQuery && (
             <button 
               onClick={() => setSearchQuery("")}
               className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
             >
               ×
             </button>
           )}
         </div>
      </div>
      <div className="flex items-center gap-3">
         <Button 
           variant="ghost" 
           size="icon" 
           className="h-9 w-9 rounded-full"
           onClick={() => setIsDarkMode(!isDarkMode)}
         >
           {isDarkMode ? <Sparkles size={18} className="text-amber-400" /> : <LayoutDashboard size={18} />}
         </Button>
         <div className="flex items-center gap-2 mr-4 pr-4 border-r relative">
            {autoMode && <div className="pulse-indicator" />}
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
               自动检测模式: {autoMode ? '开启' : '关闭'}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`h-6 w-10 p-0 rounded-full transition-colors ${autoMode ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-muted'}`}
              onClick={() => setAutoMode(!autoMode)}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${autoMode ? 'translate-x-2' : '-translate-x-2'}`} />
            </Button>
         </div>
        <Button 
          className="btn-primary h-9 px-4 text-xs font-semibold gap-2"
          onClick={handleCapture}
          disabled={uploading || cooldown}
        >
          <Camera size={14} />
          {uploading ? "正在分析..." : cooldown ? "冷却中..." : "触发识别采集"}
        </Button>
        <div className="relative">
          <label className="btn-secondary h-9 px-4 text-xs font-semibold flex items-center cursor-pointer border hover:bg-muted/50 transition-colors rounded-md">
            上传本地图片
            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
          </label>
        </div>
      </div>
    </header>
  );
};

export default Header;
