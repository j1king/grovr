import { useState } from 'react';
import {
  ArrowLeft,
  Settings,
  Palette,
  Terminal,
  GitBranch,
  Github,
  Ticket,
  ChevronRight,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GeneralSettings } from './settings/GeneralSettings';
import { AppearanceSettings } from './settings/AppearanceSettings';
import { IDESettings } from './settings/IDESettings';
import { WorktreeSettings } from './settings/WorktreeSettings';
import { GitHubSettings } from './settings/GitHubSettings';
import { JiraSettings } from './settings/JiraSettings';
import type { SettingsCategory } from '@/types';

interface SettingsPageProps {
  onBack: () => void;
}

const categories: { id: SettingsCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Settings size={14} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={14} /> },
  { id: 'ide', label: 'IDE', icon: <Terminal size={14} /> },
  { id: 'worktree', label: 'Worktree', icon: <GitBranch size={14} /> },
  { id: 'github', label: 'GitHub', icon: <Github size={14} /> },
  { id: 'jira', label: 'Jira', icon: <Ticket size={14} /> },
];

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');

  const renderContent = () => {
    switch (activeCategory) {
      case 'general':
        return <GeneralSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'ide':
        return <IDESettings />;
      case 'worktree':
        return <WorktreeSettings />;
      case 'github':
        return <GitHubSettings />;
      case 'jira':
        return <JiraSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="settings-sidebar">
        {/* Titlebar safe area + Back Button */}
        <div data-tauri-drag-region className="settings-titlebar">
          <button className="settings-back no-drag" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="settings-nav">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`settings-nav-item ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span className="settings-nav-icon">{category.icon}</span>
                <span className="settings-nav-label">{category.label}</span>
                {activeCategory === category.id && (
                  <ChevronRight size={14} className="settings-nav-arrow" />
                )}
              </button>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Content */}
      <main className="settings-content">
        <div data-tauri-drag-region className="settings-content-header" />
        <ScrollArea className="flex-1">
          <div className="settings-content-wrapper">
            <div className="settings-content-inner">
              {renderContent()}
            </div>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
