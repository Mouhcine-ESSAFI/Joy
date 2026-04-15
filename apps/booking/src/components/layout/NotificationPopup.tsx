'use client';

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/lib/use-push-notifications';
import { useAuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';

export function NotificationPopup() {
  const { isAuthenticated } = useAuthContext();
  const { permission, requestPermission } = usePushNotifications();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    
    if (permission === 'default') {
      const dismissed = localStorage.getItem('notification-popup-dismissed');
      
      if (!dismissed) {
        const timer = setTimeout(() => {
          setShow(true);
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [permission, mounted, isAuthenticated]);

  const handleEnable = async () => {
    setLoading(true);
    setErrorMsg(null);
    const result = await requestPermission();
    setLoading(false);

    if (result.success) {
      setShow(false);
      localStorage.setItem('notification-popup-dismissed', 'true');
    } else if (result.error === 'permission_denied') {
      setShow(false);
      localStorage.setItem('notification-popup-dismissed', 'true');
    } else if (result.error === 'unsupported') {
      setErrorMsg('Push notifications are not supported in this browser.');
    } else if (result.error === 'vapid_missing') {
      setErrorMsg('Notification configuration is missing. Contact your administrator.');
    } else if (result.error === 'backend_failed') {
      setErrorMsg('Could not connect to server. Please try again later.');
    } else {
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('notification-popup-dismissed', 'true');
  };

  if (!mounted || !isAuthenticated) {
    return null;
  }

  if (permission !== 'default' || !show) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 animate-in fade-in duration-300"
        onClick={handleDismiss}
      />
      
      {/* Popup */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white border-t shadow-2xl mx-auto max-w-2xl">
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Enable Order Notifications
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Get instant alerts when new orders arrive - even when the app is closed.
                </p>

                {errorMsg && (
                  <p className="text-sm text-red-600 mb-3 bg-red-50 border border-red-200 rounded px-3 py-2">
                    {errorMsg}
                  </p>
                )}

                {/* Buttons */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleEnable}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? 'Requesting...' : 'Enable Notifications'}
                  </Button>
                  
                  <Button
                    onClick={handleDismiss}
                    variant="ghost"
                    className="text-gray-600"
                  >
                    Maybe Later
                  </Button>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}