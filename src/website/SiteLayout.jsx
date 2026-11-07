import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

export default function SiteLayout() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return <Outlet />;
}
