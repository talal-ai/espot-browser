import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, RefreshCw, X } from 'lucide-react';

const UpdateNotification = () => {
  const [status, setStatus] = useState('idle'); // idle, checking, available, downloading, downloaded, error
  const [progress, setProgress] = useState(0);
  const [versionInfo, setVersionInfo] = useState(null);
  const [speed, setSpeed] = useState('');

  useEffect(() => {
    if (!window.electron?.updater) return;

    const listeners = [];

    listeners.push(window.electron.updater.onStatusChange((s) => {
      if (s === 'checking') setStatus('checking');
    }));

    listeners.push(window.electron.updater.onUpdateAvailable((info) => {
      setStatus('available');
      setVersionInfo(info);
      // Removed toast.info to avoid duplicate notifications (UI component handles it)
    }));

    listeners.push(window.electron.updater.onUpdateNotAvailable(() => {
      // functional but strictly handled elsewhere if manual check
    }));

    listeners.push(window.electron.updater.onDownloadProgress((prog) => {
      setStatus('downloading');
      setProgress(prog.percent);
      const mbs = (prog.bytesPerSecond / 1024 / 1024).toFixed(2);
      setSpeed(`${mbs} MB/s`);
    }));

    listeners.push(window.electron.updater.onUpdateDownloaded((info) => {
      setStatus('downloaded');
      setVersionInfo(info);
      toast.success("Update downloaded and ready to install!");
    }));

    listeners.push(window.electron.updater.onError((err) => {
      setStatus('error');
      console.error('Updater error:', err);
    }));

    return () => {
      window.electron.updater.removeAllListeners();
    };
  }, []);

  const handleDownload = () => {
    window.electron?.updater?.downloadUpdate();
    setStatus('downloading'); // Optimistic update
  };
  
  const handleInstall = () => {
    window.electron?.updater?.quitAndInstall();
  };

  if (status === 'idle' || status === 'checking' || status === 'error') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg p-4 animate-in slide-in-from-bottom-5">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm">
          {status === 'available' ? 'Update Available' : 
           status === 'downloaded' ? 'Update Ready' : 'Downloading Update...'}
        </h4>
        <button onClick={() => setStatus('idle')} className="text-gray-500 hover:text-gray-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      {versionInfo && (
        <p className="text-xs text-gray-500 mb-2">
          New version {versionInfo.version} is available.
        </p>
      )}

      {status === 'available' && (
        <Button size="sm" className="w-full mt-2 gap-2" onClick={handleDownload}>
          <Download className="w-4 h-4" />
          Download Update
        </Button>
      )}

      {status === 'downloading' && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{Math.round(progress)}%</span>
            <span>{speed}</span>
          </div>
        </div>
      )}

      {status === 'downloaded' && (
        <Button size="sm" className="w-full mt-2 gap-2" onClick={handleInstall}>
          <RefreshCw className="w-4 h-4" />
          Restart to Update
        </Button>
      )}
    </div>
  );
};

export default UpdateNotification;
