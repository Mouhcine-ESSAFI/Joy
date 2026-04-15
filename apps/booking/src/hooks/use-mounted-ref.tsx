import * as React from 'react';

// hook to check if component is mounted, to avoid calling setState on unmounted components
export function useMountedRef() {
  const mountedRef = React.useRef(false);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  return mountedRef;
}
