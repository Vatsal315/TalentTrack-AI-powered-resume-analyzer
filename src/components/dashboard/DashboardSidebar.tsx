import { Link, useLocation } from "react-router-dom";
import { 
  FileText, 
  Home, 
  BookOpen, 
  BarChart, 
  Upload, 
  List, 
  HelpCircle, 
  FileEdit, 
  LayoutTemplate,
  ChevronRight, 
  Briefcase
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export function DashboardSidebar() {
  const location = useLocation();

  const menuItems = [
    { 
      title: "Dashboard", 
      path: "/dashboard", 
      icon: Home,
      count: 0
    },
    { 
      title: "Resume Analysis", 
      path: "/dashboard/analyze", 
      icon: Upload,
      count: 0 
    },
    { 
      title: "Resume Builder", 
      path: "/dashboard/builder", 
      icon: FileText,
      count: 0 
    },
    { 
      title: "Resume Templates", 
      path: "/dashboard/templates", 
      icon: LayoutTemplate,
      count: 0,
      isNew: true
    },
    { 
      title: "Job Match", 
      path: "/dashboard/job-match", 
      icon: BarChart,
      count: 0 
    },
    { 
      title: "Cover Letters", 
      path: "/dashboard/cover-letter", 
      icon: FileEdit,
      count: 0,
      isNew: true 
    },
    { 
      title: "My Documents", 
      path: "/dashboard/my-resumes", 
      icon: List,
      count: 0 
    },
    { 
      title: "Help & Tips", 
      path: "/dashboard/help", 
      icon: HelpCircle,
      count: 0 
    },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <Sidebar className="bg-white border-r border-gray-200">
      <SidebarRail className="bg-white border-r border-gray-200" />
      
      <SidebarHeader className="border-b border-gray-200 pb-3 sm:pb-4 h-14 sm:h-16 flex items-center">
        <Link to="/" className="flex items-center p-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground mr-2 shadow-sm">
            <FileText size={16} className="sm:size-[18px]" />
          </div>
          <span className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-theme-emerald">TalentTrack</span>
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="py-3 sm:py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 sm:mb-2 px-3">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.path)}
                    tooltip={item.title}
                    className={`group ${isActive(item.path) 
                      ? 'bg-primary/10 text-slate-900 font-medium border-r-2 border-primary' 
                      : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Link to={item.path} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <item.icon className={`${isActive(item.path) ? 'text-primary' : 'text-gray-500'}`} size={18} />
                        <span className="ml-2 sm:ml-3 mr-1 sm:mr-2 text-sm">{item.title}</span>
                        {item.isNew && (
                          <Badge className="text-[8px] sm:text-[10px] h-4 sm:h-5 bg-primary/10 text-primary hover:bg-primary/15">New</Badge>
                        )}
                      </div>
                      
                      {item.count > 0 && (
                        <div className="flex items-center">
                          <Badge variant="outline" className="text-[10px] sm:text-xs bg-gray-100 text-gray-700 border-transparent">
                            {item.count}
                          </Badge>
                          <ChevronRight size={14} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                        </div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-6 sm:mt-8 px-3 sm:px-4">
          <div className="rounded-lg bg-gradient-to-br from-slate-50 to-white p-3 sm:p-4 border border-slate-200">
            <h4 className="font-medium text-slate-900 mb-1 sm:mb-2 flex items-center text-sm">
              <BookOpen size={14} className="mr-1.5 sm:mr-2" />
              Pro Tips
            </h4>
            <p className="text-xs sm:text-sm text-slate-600">
              Match keywords to the role and keep formatting ATS-friendly for better screening results.
            </p>
          </div>
        </div>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-gray-200 py-2 sm:py-3 px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-500"></div>
          <div className="text-[10px] sm:text-xs text-gray-500">
            <span className="font-medium text-gray-700">Premium Plan</span> - Active
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
