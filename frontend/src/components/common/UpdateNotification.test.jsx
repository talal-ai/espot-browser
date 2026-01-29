import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import UpdateNotification from './UpdateNotification';
import * as React from 'react';

// Mock Sonner toast to avoid errors suitable for test environment
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Download: () => <div data-testid="icon-download" />,
  RefreshCw: () => <div data-testid="icon-refresh" />,
  X: () => <div data-testid="icon-close" />,
}));

describe('UpdateNotification', () => {
  let mockUpdater;

  beforeEach(() => {
    // Setup ID wrapper for window.electron if it doesn't exist
    // simplified mock structure
    mockUpdater = {
      onStatusChange: vi.fn(() => () => {}),
      onUpdateAvailable: vi.fn(() => () => {}),
      onUpdateNotAvailable: vi.fn(() => () => {}),
      onDownloadProgress: vi.fn(() => () => {}),
      onUpdateDownloaded: vi.fn(() => () => {}),
      onError: vi.fn(() => () => {}),
      removeAllListeners: vi.fn(),
      quitAndInstall: vi.fn(),
    };

    window.electron = {
      updater: mockUpdater,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not render initially (status idle)', () => {
    const { container } = render(<UpdateNotification />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should show downloading state when update available', () => {
    let updateAvailableCallback;
    mockUpdater.onUpdateAvailable.mockImplementation((cb) => {
      updateAvailableCallback = cb;
      return () => {};
    });

    render(<UpdateNotification />);

    act(() => {
      if (updateAvailableCallback) {
        updateAvailableCallback({ version: '1.2.0' });
      }
    });

    expect(screen.getByText(/Starting download/i)).toBeInTheDocument();
    expect(screen.getByText(/Version 1.2.0/i)).toBeInTheDocument();
  });

  it('should update progress bar', () => {
    let downloadProgressCallback;
    mockUpdater.onDownloadProgress.mockImplementation((cb) => {
      downloadProgressCallback = cb;
      return () => {};
    });

    render(<UpdateNotification />);

    act(() => {
      if (downloadProgressCallback) {
        // Trigger downloading state first (usually happens via status change or progress)
        downloadProgressCallback({ percent: 50, bytesPerSecond: 1048576, transferred: 500, total: 1000 });
      }
    });

    expect(screen.getByText(/50%/i)).toBeInTheDocument();
    expect(screen.getByText(/1.00 MB\/s/i)).toBeInTheDocument();
  });

  it('should show restart button when downloaded', () => {
    let updateDownloadedCallback;
    mockUpdater.onUpdateDownloaded.mockImplementation((cb) => {
      updateDownloadedCallback = cb;
      return () => {};
    });

    render(<UpdateNotification />);

    act(() => {
      if (updateDownloadedCallback) {
        updateDownloadedCallback({ version: '1.2.0' });
      }
    });

    expect(screen.getByText(/Update Ready/i)).toBeInTheDocument();
    const restartBtn = screen.getByText(/Restart to Update/i);
    expect(restartBtn).toBeInTheDocument();

    fireEvent.click(restartBtn);
    expect(mockUpdater.quitAndInstall).toHaveBeenCalled();
  });
});
