import React, { createContext, useContext, useState, useEffect } from 'react';
import { workspaceService } from '../services/workspaceService';
import { storage } from '../services/storage';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null); // Null means "All Clients"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkspaceData() {
      try {
        const wsList = await workspaceService.getWorkspaces();
        setWorkspaces(wsList);

        const savedWsId = storage.get(LOCAL_STORAGE_KEYS.ACTIVE_WORKSPACE);
        const currentWs = wsList.find((w) => w.id === savedWsId) || wsList[0] || null;
        setActiveWorkspace(currentWs);

        if (currentWs) {
          const clientList = await workspaceService.getClientsByWorkspace(currentWs.id);
          setClients(clientList);
        }
      } catch (err) {
        console.error('Failed to load workspace context:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkspaceData();
  }, []);

  const switchWorkspace = async (workspaceId) => {
    setLoading(true);
    try {
      const ws = workspaces.find((w) => w.id === workspaceId) || null;
      if (ws) {
        setActiveWorkspace(ws);
        storage.set(LOCAL_STORAGE_KEYS.ACTIVE_WORKSPACE, ws.id);
        const clientList = await workspaceService.getClientsByWorkspace(ws.id);
        setClients(clientList);
        setActiveClient(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectClientFilter = (clientOrId) => {
    if (!clientOrId) {
      setActiveClient(null);
    } else if (typeof clientOrId === 'string') {
      const found = clients.find((c) => c.id === clientOrId) || null;
      setActiveClient(found);
    } else {
      setActiveClient(clientOrId);
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        clients,
        activeClient,
        loading,
        switchWorkspace,
        selectClientFilter,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspaceContext = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }
  return context;
};
