import {useEffect, useMemo} from "react";
import {useNavigate} from "react-router";
import {Button} from "@/components/ui/button";
import {Plus, LayoutDashboard, Search, Trash2} from "lucide-react";
import {useDashboardListStore} from "@/features/dashboard/stores/list-store";
import {createDashboard} from "@/features/dashboard/api/dashboard-api";
import {useQueryClient} from "@tanstack/react-query";

export function DashboardListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dashboards = useDashboardListStore((s) => s.dashboards);
  const isLoading = useDashboardListStore((s) => s.isLoading);
  const searchQuery = useDashboardListStore((s) => s.searchQuery);
  const fetchDashboards = useDashboardListStore((s) => s.fetchDashboards);
  const deleteDashboard = useDashboardListStore((s) => s.deleteDashboard);
  const setSearchQuery = useDashboardListStore((s) => s.setSearchQuery);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  const filteredDashboards = useMemo(() => {
    if (!searchQuery) return dashboards;
    const q = searchQuery.toLowerCase();
    return dashboards.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [dashboards, searchQuery]);

  const handleCreate = async () => {
    const dashboard = await createDashboard({title: "New Dashboard"});
    queryClient.invalidateQueries({queryKey: ["dashboards"]});
    navigate(`/dashboards/${dashboard.uid}`);
  };

  const handleDelete = async (uid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteDashboard(uid);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboards</h1>
        {0 < dashboards.length && (
          <Button onClick={handleCreate}>
            <Plus className="size-4" /> New Dashboard
          </Button>
        )}
      </div>

      {dashboards.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search dashboards..."
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading...
        </div>
      ) : filteredDashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <LayoutDashboard className="size-12 mb-4" />
          <p className="text-lg">{searchQuery ? "No dashboards match your search" : "No dashboards yet"}</p>
          {!searchQuery && (
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="size-4" /> New Dashboard
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDashboards.map((d) => (
            <button
              key={d.uid}
              className="group p-4 rounded-xl border bg-card hover:bg-accent/50 text-left transition-colors"
              onClick={() => navigate(`/dashboards/${d.uid}`)}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium">{d.title}</h3>
                <span
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-opacity"
                  onClick={(e) => handleDelete(d.uid, e)}
                >
                  <Trash2 className="size-3.5" />
                </span>
              </div>
              <div className="flex gap-1 mt-2">
                {d.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded bg-muted">{tag}</span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Updated {d.updatedAt}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
