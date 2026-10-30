"use client";

// /career: placement funnel, pipeline board, application drawer, OA logging.
// Owner: Bhooshan Deshpande (Member B)

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import ApplicationDrawer from "@/components/career/ApplicationDrawer";
import FunnelBanner from "@/components/career/FunnelBanner";
import LogOAForm from "@/components/career/LogOAForm";
import PipelineBoard from "@/components/career/PipelineBoard";
import { Drawer, Notice, buttonClass, errorMessage } from "@/components/dsa/ui";
import type { Application, Funnel, Stage } from "@/components/career/types";

export default function CareerPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [apps, f] = await Promise.all([
        apiFetch<Application[]>("/api/career/applications"),
        apiFetch<Funnel>("/api/career/funnel"),
      ]);
      setApplications(apps);
      setFunnel(f);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const changeStage = async (id: number, stage: Stage) => {
    try {
      await apiFetch(`/api/career/applications/${id}/stage`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }),
      });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Placements</h1>
          <p className="text-sm text-slate-500">Applications, online assessments and interviews.</p>
        </div>
        <button className={buttonClass} onClick={() => setLogging(true)}><Plus size={15} /> Log OA event</button>
      </header>

      {error && <Notice tone="error">{error}</Notice>}

      <FunnelBanner funnel={funnel} />

      {applications.length === 0 && !error ? (
        <Notice>No applications yet. Log your first OA event to start the pipeline.</Notice>
      ) : (
        <PipelineBoard applications={applications} onOpen={setOpenId} onStage={(id, s) => void changeStage(id, s)} />
      )}

      <ApplicationDrawer oaId={openId} onClose={() => setOpenId(null)} onChanged={() => void load()} />

      <Drawer open={logging} title="Log OA event" onClose={() => setLogging(false)}>
        <LogOAForm onCancel={() => setLogging(false)}
                   onSaved={(r) => { setLogging(false); void load(); setOpenId(r.oa_id); }} />
      </Drawer>
    </main>
  );
}
