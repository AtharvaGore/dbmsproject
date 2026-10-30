"use client";

// /career: placements as a Notion-style page: funnel, then the Applications
// database (pipeline board / table / calendar / list) with a side peek.
// Owner: Bhooshan Deshpande (Member B)

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import ApplicationDrawer from "@/components/career/ApplicationDrawer";
import ApplicationsDatabase from "@/components/career/ApplicationsDatabase";
import FunnelBanner from "@/components/career/FunnelBanner";
import LogOAForm from "@/components/career/LogOAForm";
import { Callout, Notice, Page, SidePeek, errorMessage } from "@/components/dsa/ui";
import type { Application, Funnel, Stage } from "@/components/career/types";

export default function CareerPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loaded, setLoaded] = useState(false);
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
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Board drag-and-drop: move the card at once; the API logs history and refreshes the funnel.
  const changeStage = async (id: number, stage: Stage) => {
    setApplications((as) => as.map((a) => (a.oa_id === id ? { ...a, stage } : a)));
    try {
      await apiFetch(`/api/career/applications/${id}/stage`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }),
      });
    } catch (err) {
      setError(errorMessage(err));
    }
    await load();
  };

  return (
    <Page icon="💼" title="Placements" description="Applications, online assessments and interviews, with the funnel computed in the database.">
      {error && <Notice tone="error">{error}</Notice>}
      <FunnelBanner funnel={funnel} />
      {loaded && applications.length === 0 && !error && (
        <Callout icon="👋">No applications yet. Use <b>Log OA</b> to add your first one.</Callout>
      )}
      <ApplicationsDatabase applications={applications} onOpen={setOpenId} onNew={() => setLogging(true)}
                            onStageChange={(id, s) => void changeStage(id, s)} />

      <ApplicationDrawer oaId={openId} onClose={() => setOpenId(null)} onChanged={() => void load()} />

      <SidePeek open={logging} onClose={() => setLogging(false)} header="Log OA event">
        {logging && (
          <LogOAForm onCancel={() => setLogging(false)}
                     onSaved={(r) => { setLogging(false); void load(); setOpenId(r.oa_id); }} />
        )}
      </SidePeek>
    </Page>
  );
}
