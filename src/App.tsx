import React, { useState, useEffect } from 'react';
import { Menu, Compass, Plus } from 'lucide-react';
import { Group } from './types';
import {
  loadGroups,
  saveGroups,
  loadActiveGroupId,
  saveActiveGroupId,
  clearAllData,
  createDemoGroup,
} from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { GroupDetails } from './pages/GroupDetails';
import { CreateGroupModal } from './components/CreateGroupModal';
import { ConfirmDialog } from './components/ConfirmDialog';

export const App: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>(() => loadGroups());
  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => loadActiveGroupId());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);

  // Sync groups to localStorage
  useEffect(() => {
    saveGroups(groups);
  }, [groups]);

  // Sync activeGroupId to localStorage
  useEffect(() => {
    saveActiveGroupId(activeGroupId);
  }, [activeGroupId]);

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null;

  // If the active group was deleted or invalid, return to dashboard
  useEffect(() => {
    if (activeGroupId && !activeGroup) {
      setActiveGroupId(null);
    }
  }, [activeGroupId, activeGroup]);

  const handleGroupCreated = (newGroup: Group) => {
    const updated = [newGroup, ...groups];
    setGroups(updated);
    setActiveGroupId(newGroup.id);
  };

  const handleUpdateGroup = (updatedGroup: Group) => {
    const updated = groups.map((g) =>
      g.id === updatedGroup.id ? updatedGroup : g
    );
    setGroups(updated);
  };

  const handleDeleteGroup = (groupId: string) => {
    const updated = groups.filter((g) => g.id !== groupId);
    setGroups(updated);
    if (activeGroupId === groupId) {
      setActiveGroupId(null);
    }
  };

  const handleLoadDemoGroup = () => {
    const existingDemo = groups.find((g) => g.id === 'demo-group-goa');
    if (existingDemo) {
      setActiveGroupId(existingDemo.id);
      return;
    }
    const demo = createDemoGroup();
    setGroups([demo, ...groups]);
    setActiveGroupId(demo.id);
  };

  const handleRemoveDemoGroup = () => {
    const updated = groups.filter((g) => g.id !== 'demo-group-goa');
    setGroups(updated);
    if (activeGroupId === 'demo-group-goa') {
      setActiveGroupId(null);
    }
  };

  const handleClearAllConfirm = () => {
    clearAllData();
    setGroups([]);
    setActiveGroupId(null);
    setIsClearAllDialogOpen(false);
  };

  const hasDemoGroup = groups.some((g) => g.id === 'demo-group-goa');

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        groups={groups}
        activeGroupId={activeGroupId}
        isOpenMobile={isMobileNavOpen}
        onSelectDashboard={() => setActiveGroupId(null)}
        onSelectGroup={(id) => setActiveGroupId(id)}
        onCreateGroupClick={() => setIsCreateGroupModalOpen(true)}
        onLoadDemoClick={handleLoadDemoGroup}
        onClearAllClick={() => setIsClearAllDialogOpen(true)}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Mobile Header Bar */}
        <div className="mobile-nav-bar">
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            onClick={() => setActiveGroupId(null)}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Compass size={18} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>SplitWise</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsCreateGroupModalOpen(true)}
            >
              <Plus size={16} /> New
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '6px' }}
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>

        {/* Dynamic Page View */}
        {activeGroup ? (
          <GroupDetails
            group={activeGroup}
            onBackToDashboard={() => setActiveGroupId(null)}
            onUpdateGroup={handleUpdateGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        ) : (
          <Dashboard
            groups={groups}
            onSelectGroup={(id) => setActiveGroupId(id)}
            onCreateGroupClick={() => setIsCreateGroupModalOpen(true)}
            onLoadDemoClick={handleLoadDemoGroup}
            onRemoveDemoClick={handleRemoveDemoGroup}
            hasDemoGroup={hasDemoGroup}
          />
        )}
      </div>

      {/* Global Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />

      {/* Global Clear All Data Dialog */}
      <ConfirmDialog
        isOpen={isClearAllDialogOpen}
        title="Reset & Clear All Data"
        message="Are you sure you want to clear all expense groups, recorded payments, and local history? This action is permanent and cannot be undone."
        confirmLabel="Clear Everything"
        variant="danger"
        onConfirm={handleClearAllConfirm}
        onCancel={() => setIsClearAllDialogOpen(false)}
      />
    </div>
  );
};

export default App;
