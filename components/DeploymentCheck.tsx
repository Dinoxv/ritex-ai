'use client';

import { useEffect } from 'react';

export default function DeploymentCheck() {
  useEffect(() => {
    const currentDeploymentId = process.env.NEXT_PUBLIC_DEPLOYMENT_ID ?? '';

    if (!currentDeploymentId) {
      return;
    }

    let isUnmounted = false;

    const checkForNewDeployment = async () => {
      try {
        const response = await fetch('/api/ping/', {
          cache: 'no-store',
          headers: { 'cache-control': 'no-cache' },
        });

        if (!response.ok) {
          return;
        }

        const payload: { deploymentId?: string } = await response.json();
        const serverDeploymentId = payload.deploymentId ?? '';

        if (!isUnmounted && serverDeploymentId && serverDeploymentId !== currentDeploymentId) {
          window.location.reload();
        }
      } catch {
        // Ignore transient network errors.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkForNewDeployment();
      }
    };

    const intervalId = window.setInterval(() => {
      void checkForNewDeployment();
    }, 5 * 60 * 1000);

    document.addEventListener('visibilitychange', onVisibilityChange);
    void checkForNewDeployment();

    return () => {
      isUnmounted = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
}
