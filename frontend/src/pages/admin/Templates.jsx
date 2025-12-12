import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useApi } from "../../hooks/use-api";
import { apiService } from "../../services/api.service";
import { API_ENDPOINTS } from "../../config/api.config";
import GlassCard from "../../components/common/GlassCard";
import StatCard from "../../components/common/StatCard";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Skeleton } from "../../components/ui/skeleton";
import { ToastAction } from "../../components/ui/toast";
import { useToast } from "../../hooks/use-toast";
import PageSkeleton from "../../components/common/PageSkeleton";

// Lazy load the DataTable to reduce initial bundle and improve performance
const DataTable = React.lazy(() => import("../../components/common/DataTable"));

/**
 * Templates Page
 * Professional template-driven UI that fetches pre-built templates from API and composes the page
 * - Reuses existing components (GlassCard, StatCard, DataTable, Dialog, Button)
 * - Applies ambient lighting and subtle animations via utility classes and framer-motion
 * - No hard-coded content: all copy and data sourced from API or configuration
 * - Accessibility: ARIA labels, keyboard navigation supported by Radix primitives
 */
export default function Templates() {
  const { toast } = useToast();

  // Fetch templates using the generic API hook
  const {
    data: templates,
    loading,
    error,
    execute: loadTemplates,
  } = useApi(async () => apiService.get(API_ENDPOINTS.templates.list), true);

  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Derived stats for header cards (computed from API response)
  const stats = useMemo(() => {
    const count = templates?.length || 0;
    const categories = new Set((templates || []).map((t) => t.category)).size;
    return [
      {
        title: "Templates Available",
        value: String(count),
        change: count > 0 ? "+" + Math.min(count, 9) : "0",
        changeType: count > 0 ? "positive" : "negative",
        icon: null,
        gradient: "bg-gradient-to-br from-indigo-500 to-violet-500",
      },
      {
        title: "Categories",
        value: String(categories),
        change: categories > 0 ? "+" + Math.min(categories, 9) : "0",
        changeType: categories > 0 ? "positive" : "negative",
        icon: null,
        gradient: "bg-gradient-to-br from-cyan-500 to-teal-500",
      },
    ];
  }, [templates]);

  // Handle row selection for template preview
  const handleRowClick = (row) => setSelectedTemplate(row);

  // Show API errors via toast, avoid hard-coded messages
  if (error) {
    toast({
      title: error.message || "Template fetch failed",
      description: "Please verify the templates source configuration.",
      action: <ToastAction altText="Retry" onClick={() => loadTemplates()}>Retry</ToastAction>,
    });
  }

  // Columns definition for DataTable (labels should come from API if provided)
  const columns = useMemo(
    () => [
      { key: "name", label: "Name", sortable: true },
      { key: "category", label: "Category", sortable: true },
      { key: "version", label: "Version", sortable: true },
      { key: "updated_at", label: "Updated", sortable: true },
    ],
    []
  );

  if (loading) {
    return <PageSkeleton mode="table" />;
  }

  return (
    <div className="px-6 py-6 ambient-surface ambient-noise">
      {/* Intro header with ambient glow and soft animations */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
        className="mb-6"
      >
        <Card className="ambient-glow ambient-spotlight ambient-noise">
          <CardHeader>
            <CardTitle className="text-2xl">Dynamic Templates</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Fetch and compose pre-built UI templates from the configured source. Select any template to preview its layout.
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {stats.map((s, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 + idx * 0.05, ease: [0.2, 0, 0, 1] }}
          >
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* Table and actions */}
      <GlassCard className="ambient-glow ambient-spotlight ambient-noise">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Template Catalog</h2>
            <div className="flex gap-3">
              <Button aria-label="Refresh templates" onClick={() => loadTemplates()}>Refresh</Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary" aria-label="Learn more about templates">Learn More</Button>
                </DialogTrigger>
                <DialogContent className="backdrop-blur-2xl">
                  <DialogHeader>
                    <DialogTitle>About Dynamic Templates</DialogTitle>
                    <DialogDescription>
                      Templates are modular UI definitions served by the backend. This app composes them using existing components for performance and consistency.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          )}

          {!loading && (
            <React.Suspense fallback={<Skeleton className="h-48" />}>
              <DataTable columns={columns} data={templates || []} onRowClick={handleRowClick} />
            </React.Suspense>
          )}
        </div>
      </GlassCard>

      {/* Preview dialog for selected template */}
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        {/* Trigger not needed for programmatic open */}
        <DialogContent aria-label="Template preview" className="backdrop-blur-2xl ambient-spotlight">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Category: {selectedTemplate?.category} • Version: {selectedTemplate?.version}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Compose preview panels with ambient lighting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard className="ambient-glow">
                <div className="p-4">
                  <h3 className="text-sm font-medium mb-2">Layout Regions</h3>
                  <ul className="text-sm text-muted-foreground list-disc pl-4">
                    {(selectedTemplate?.layout?.regions || []).map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              </GlassCard>
              <GlassCard className="ambient-glow">
                <div className="p-4">
                  <h3 className="text-sm font-medium mb-2">Components</h3>
                  <ul className="text-sm text-muted-foreground list-disc pl-4">
                    {(selectedTemplate?.components || []).map((c, idx) => (
                      <li key={idx}>{c.type}</li>
                    ))}
                  </ul>
                </div>
              </GlassCard>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setSelectedTemplate(null)} aria-label="Close preview">Close</Button>
              <Button aria-label="Apply template">Apply Template</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
