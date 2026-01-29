import React from "react";
import { 
  LayoutDashboard, 
  BarChart3, 
  History, 
  Settings, 
  User, 
  Sparkles 
} from "lucide-react";
import { Magnetic, ShinyText } from "@/components/ui/animated-components";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const SidebarItem: React.FC<{ id: string; icon: any; label: string }> = ({ id, icon: Icon, label }) => (
    <Magnetic distance={0.2}>
      <div 
        className={`sidebar-item ${activeTab === id ? 'active' : ''}`}
        onClick={() => onTabChange(id)}
      >
        <Icon size={18} strokeWidth={2.5} />
        <span>{label}</span>
      </div>
    </Magnetic>
  );

  return (
    <aside className="w-56 flex flex-col h-full bg-background border-r">
      <div className="h-14 flex items-center px-6 border-b">
        <Magnetic distance={0.3}>
          <div className="flex items-center gap-2 font-semibold tracking-tight cursor-default">
            <img src="/logo-transparent.png" alt="Smart Canteen" className="w-8 h-8 object-contain" />
            得鹿山智慧餐厅
          </div>
        </Magnetic>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1">
        <SidebarItem id="overview" icon={LayoutDashboard} label="控制台总览" />
        <SidebarItem id="analytics" icon={BarChart3} label="统计分析" />
        <SidebarItem id="history" icon={History} label="历史记录" />
        <Magnetic distance={0.2}>
          <div 
            className={`sidebar-item group relative overflow-hidden ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => onTabChange("ai")}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Sparkles size={18} className={`${activeTab === 'ai' ? 'text-primary' : 'text-amber-500'}`} strokeWidth={2.5} />
            <span className="flex-1">AI 智能专家</span>
            <div className="bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm overflow-hidden">
              <ShinyText text="PRO" speed={3} className="text-[10px] font-black text-amber-600" />
            </div>
          </div>
        </Magnetic>
        <SidebarItem id="settings" icon={Settings} label="系统设置" />
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <User size={16} />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold truncate leading-none">管理员</p>
            <p className="text-[10px] text-muted-foreground truncate mt-1">admin@canteen.ai</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
