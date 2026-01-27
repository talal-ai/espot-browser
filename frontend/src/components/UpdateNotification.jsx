import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react';

/**
 * UpdateNotification Component
 * Displays update status and allows users to download/install updates
 */
export function UpdateNotification() {
  const [updateStatus, setUpdateStatus] = useState({
    checking: false,
    available: false,
    downloaded: false,
    progress: 0,
    version: null,
    error: null,
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Get initial status
    if (window.electronAPI?.updates) {
      window.electronAPI.updates.getStatus().then((status) => {
        setUpdateStatus(status);
      });

      // Listen for status changes
      const unsubscribe = window.electronAPI.updates.onStatusChange((status) => {
        setUpdateStatus(status);
        if (status.downloaded) {
          setIsDownloading(false);
        }
      });

      return () => unsubscribe();
    }
  }, []);

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.updates) return;
    
    try {
      await window.electronAPI.updates.check();
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  };

  const handleDownload = async () => {
    if (!window.electronAPI?.updates) return;
    
    setIsDownloading(true);
    try {
      await window.electronAPI.updates.download();
    } catch (error) {
      console.error('Failed to download update:', error);
      setIsDownloading(false);
    }
  };

  const handleInstall = async () => {
    if (!window.electronAPI?.updates) return;
    
    try {
      await window.electronAPI.updates.install();
    } catch (error) {
      console.error('Failed to install update:', error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show if no update API available
  if (!window.electronAPI?.updates) {
    return null;
  }

  // Don't show if dismissed
  if (dismissed) {
    return null;
  }

  // Don't show if checking or no update available (unless there's an error)
  if (updateStatus.checking || (!updateStatus.available && !updateStatus.error)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50 max-w-md"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-2xl p-4 text-white">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              {updateStatus.error ? (
                <AlertCircle className="w-5 h-5 text-red-300" />
              ) : updateStatus.downloaded ? (
                <CheckCircle className="w-5 h-5 text-green-300" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <h3 className="font-semibold text-lg">
                {updateStatus.error
                  ? 'Update Error'
                  : updateStatus.downloaded
                  ? 'Update Ready'
                  : `Update Available ${updateStatus.version ? `(v${updateStatus.version})` : ''}`}
              </h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error State */}
          {updateStatus.error && (
            <div className="mb-3">
              <p className="text-sm text-red-100 mb-3">{updateStatus.error}</p>
              <button
                onClick={handleCheckForUpdates}
                className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* Downloaded State */}
          {!updateStatus.error && updateStatus.downloaded && (
            <div>
              <p className="text-sm text-white/90 mb-3">
                A new version has been downloaded and is ready to install. The app will restart to complete the update.
              </p>
              <button
                onClick={handleInstall}
                className="w-full bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium transition-all"
              >
                Restart & Install
              </button>
            </div>
          )}

          {/* Downloading State */}
          {!updateStatus.error && !updateStatus.downloaded && isDownloading && (
            <div>
              <p className="text-sm text-white/90 mb-2">Downloading update...</p>
              <div className="w-full bg-white/20 rounded-full h-2 mb-3">
                <motion.div
                  className="bg-white h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${updateStatus.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-white/70 text-center">{updateStatus.progress}%</p>
            </div>
          )}

          {/* Available State */}
          {!updateStatus.error && !updateStatus.downloaded && !isDownloading && updateStatus.available && (
            <div>
              <p className="text-sm text-white/90 mb-3">
                A new version of ESPOT Browser is available. Download and install to get the latest features and improvements.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium transition-all"
                >
                  Download Update
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                >
                  Later
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default UpdateNotification;
