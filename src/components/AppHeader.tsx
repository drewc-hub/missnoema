import React, { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import type { Breadcrumb } from "@/types";

type RouteMetaState = {
  breadcrumbs?: Breadcrumb[];
};

export default function Header() {
  const location = useLocation();
  const params = useParams<{ gameId?: string }>();

  const breadcrumbs = useMemo<Breadcrumb[]>(() => {
    const state = location.state as RouteMetaState | null;

    if (state?.breadcrumbs) {
      return state.breadcrumbs;
    }

    const crumbs: Breadcrumb[] = [{ label: "Home", href: "/" }];
    const path = location.pathname;

    const isGameRoute = path === `/games/${params.gameId}`;
    const isGameChildRoute =
      Boolean(params.gameId) && path.startsWith(`/games/${params.gameId}/`);

    if (params.gameId && (isGameRoute || isGameChildRoute)) {
      crumbs.push({
        label: "Game",
        href: isGameRoute ? undefined : `/games/${params.gameId}`,
      });

      if (path.endsWith("/map")) crumbs.push({ label: "Map" });
      if (path.endsWith("/images")) crumbs.push({ label: "Images" });
      if (path.endsWith("/history")) crumbs.push({ label: "History" });
    }

    return crumbs;
  }, [location.pathname, location.state, params.gameId]);

  return (
    <header>
      <h1>
        <Link to="/">DMCP Game Viewer</Link>
      </h1>

      {breadcrumbs.length > 1 && (
        <nav className="breadcrumbs">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.label}-${index}`}>
              {crumb.href && index < breadcrumbs.length - 1 ? (
                <Link to={crumb.href}>{crumb.label}</Link>
              ) : (
                <span>{crumb.label}</span>
              )}

              {index < breadcrumbs.length - 1 && <span> / </span>}
            </React.Fragment>
          ))}
        </nav>
      )}
    </header>
  );
}
