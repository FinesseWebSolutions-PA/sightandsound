import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { returnHistory } from "./lib/return-history";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  router.subscribe("onResolved", ({ fromLocation, toLocation }) => {
    returnHistory.remember(fromLocation, toLocation);
  });

  return router;
};
