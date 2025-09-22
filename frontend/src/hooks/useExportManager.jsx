import { useState, useCallback } from 'react';

export const useExportManager = () => {
  const [exportState, setExportState] = useState({
    isLoading: false,
    progress: 0,
    status: 'idle',
    error: null
  });

  const exportRecords = useCallback(async (params) => {
    setExportState({ 
      isLoading: true, 
      progress: 0, 
      status: 'processing', 
      error: null 
    });
    
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `/api/calls/export?${queryString}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // **Simplified: Just get the blob directly**
      const blob = await response.blob();
      
      setExportState({ 
        isLoading: false, 
        progress: 100, 
        status: 'completed', 
        error: null 
      });
      
      return blob;

    } catch (err) {
      setExportState({ 
        isLoading: false, 
        progress: 0, 
        status: 'error',
        error: err.message 
      });
      throw err;
    }
  }, []);

  const downloadBlob = useCallback((blob, format = 'csv') => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `call_records_${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }, []);

  const resetExportState = useCallback(() => {
    setExportState({
      isLoading: false,
      progress: 0,
      status: 'idle',
      error: null
    });
  }, []);

  return { 
    exportState, 
    exportRecords, 
    downloadBlob, 
    resetExportState 
  };
};