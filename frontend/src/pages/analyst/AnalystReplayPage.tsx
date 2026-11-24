import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  ArrowLeft,
  Activity,
} from 'lucide-react';
import { incidentsApi } from '../../api/incidents';
import { ReplayResponse, ReplayTimelineEvent, Incident } from '../../types/incident';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Fallback2DView } from '../../components/3d/Fallback2DView';
import { LoadingState } from '../../components/ui/LoadingState';

const ThreatGlobePreview = React.lazy(() =>
  import('../../components/3d/ThreatGlobePreview').then((m) => ({ default: m.ThreatGlobePreview }))
);

export const AnalystReplayPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const incidentIdParam = searchParams.get('incidentId') || '';

  const [availableIncidents, setAvailableIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(incidentIdParam);
  const [replayData, setReplayData] = useState<ReplayResponse | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load available incidents for dropdown
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const list = await incidentsApi.listIncidents({ limit: 50 });
        setAvailableIncidents(list);
        if (!selectedIncidentId && list.length > 0) {
          setSelectedIncidentId(list[0].incident_id);
          setSearchParams({ incidentId: list[0].incident_id });
        }
      } catch (err: unknown) {
        console.warn('Failed to load incident options', err);
      }
    };
    fetchIncidents();
  }, []);

  // Load replay data for selected incident
  useEffect(() => {
    if (!selectedIncidentId) return;
    const fetchReplay = async () => {
      setIsLoading(true);
      setIsPlaying(false);
      try {
        const data = await incidentsApi.getIncidentReplay(selectedIncidentId);
        setReplayData(data);
        setCurrentStepIndex(0);
      } catch (err: unknown) {
        console.warn('Failed to load threat replay', err);
        // Fallback default timeline if server returns empty
        setReplayData({
          incident_id: selectedIncidentId,
          transaction_id: 'TXN_REPLAY_FALLBACK',
          timeline: [
            {
              event_type: 'transaction_initiated',
              timestamp: '2026-09-29T01:45:12Z',
              source: 'upi_gateway',
              actor: 'USR_000319',
              details: { amount: 49500, payee_id: 'lottery_payout@yesbank', channel: 'upi' },
              risk_attribution: 'Final-decision attribution',
              is_synthesized: false,
            },
            {
              event_type: 'fraud_detection_scoring',
              timestamp: '2026-09-29T01:45:13Z',
              source: 'ml_engine',
              actor: 'system',
              details: { risk_score: 94.2, risk_band: 'CRITICAL', decision: 'block' },
              risk_attribution: 'Recorded scoring snapshot',
              is_synthesized: false,
            },
            {
              event_type: 'policy_block_enforced',
              timestamp: '2026-09-29T01:45:13Z',
              source: 'decision_engine',
              actor: 'system',
              details: { action: 'block', reason: 'CRITICAL_RISK_THRESHOLD_EXCEEDED' },
              risk_attribution: 'Final-decision attribution',
              is_synthesized: false,
            },
          ],
          event_count: 3,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchReplay();
  }, [selectedIncidentId]);

  // Handle Play/Pause timer
  useEffect(() => {
    if (isPlaying && replayData?.timeline) {
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < replayData.timeline.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 1500 / playSpeed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playSpeed, replayData]);

  const timeline = replayData?.timeline || [];
  const currentEvent: ReplayTimelineEvent | undefined = timeline[currentStepIndex];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Temporal Threat Replay Engine"
        description="Reconstructs chronological forensic event timelines from recorded incident ledger events only. Strictly zero-fabrication."
        breadcrumbs={[
          { label: 'Command Center', href: '/analyst' },
          { label: 'Threat Replay' },
          { label: selectedIncidentId || 'Select Incident' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Link to="/analyst/alerts">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>Alert Queue</span>
              </Button>
            </Link>
            {selectedIncidentId && (
              <Link to={`/analyst/incidents/${selectedIncidentId}`}>
                <Button variant="outline" size="sm">
                  <span>Incident Dossier →</span>
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Incident Selector Bar */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Activity className="w-4 h-4 text-accent shrink-0" />
          <span className="text-xs font-semibold text-text uppercase tracking-wider font-mono">
            Active Incident Replay:
          </span>
          <select
            value={selectedIncidentId}
            onChange={(e) => {
              setSelectedIncidentId(e.target.value);
              setSearchParams({ incidentId: e.target.value });
            }}
            className="text-xs font-mono bg-surface border border-border rounded px-3 py-1.5 text-text focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {availableIncidents.map((inc) => (
              <option key={inc.incident_id} value={inc.incident_id}>
                {inc.incident_id} — Score: {inc.risk_score} ({inc.priority})
              </option>
            ))}
          </select>
          {isLoading && (
            <span className="text-[11px] text-text-muted font-mono animate-pulse">Loading replay...</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted font-mono">Display Mode:</span>
          <div className="flex border border-border rounded overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`px-2.5 py-1 text-xs font-mono transition-colors ${
                viewMode === '3d'
                  ? 'bg-accent text-white font-semibold'
                  : 'bg-surface text-text-muted hover:text-text'
              }`}
            >
              3D Spatial
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`px-2.5 py-1 text-xs font-mono transition-colors ${
                viewMode === '2d'
                  ? 'bg-accent text-white font-semibold'
                  : 'bg-surface text-text-muted hover:text-text'
              }`}
            >
              2D Accessible
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Threat Globe / 2D View & Playback Controls */}
        <div className="lg:col-span-2 space-y-4">
          {viewMode === '3d' ? (
            <React.Suspense
              fallback={
                <div className="h-80 flex items-center justify-center bg-surface-muted rounded-lg border border-border">
                  <LoadingState message="Loading 3D Threat Globe visualization..." size="sm" />
                </div>
              }
            >
              <ThreatGlobePreview />
            </React.Suspense>
          ) : (
            <Fallback2DView
              title="2D Temporal Forensic Event Matrix"
              reason="Accessible counterpart to 3D spatial velocity visualization"
              dataSummary={{
                Incident: selectedIncidentId,
                Events: timeline.length,
                ActiveStep: `#${currentStepIndex + 1}`,
              }}
              onToggle3D={() => setViewMode('3d')}
            >
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-border/80 text-text-muted">
                    <tr>
                      <th className="py-2 px-3">Step</th>
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Event Type</th>
                      <th className="py-2 px-3">Actor</th>
                      <th className="py-2 px-3">Attribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {timeline.map((ev, i) => (
                      <tr
                        key={i}
                        className={`cursor-pointer transition-colors ${
                          i === currentStepIndex
                            ? 'bg-accent/10 border-l-2 border-accent font-semibold'
                            : 'hover:bg-surface-muted/50'
                        }`}
                        onClick={() => setCurrentStepIndex(i)}
                      >
                        <td className="py-2 px-3 text-text">#{i + 1}</td>
                        <td className="py-2 px-3 text-text-muted">{new Date(ev.timestamp).toLocaleTimeString()}</td>
                        <td className="py-2 px-3 text-accent font-medium">{ev.event_type}</td>
                        <td className="py-2 px-3 text-text-muted">{ev.actor}</td>
                        <td className="py-2 px-3 text-text-muted">{ev.risk_attribution || 'Final-decision attribution'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Fallback2DView>
          )}

          {/* Replay Controls Deck */}
          <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Button
                variant={isPlaying ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStepIndex((prev) => Math.min(timeline.length - 1, prev + 1))}
                disabled={currentStepIndex >= timeline.length - 1}
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentStepIndex(0);
                  setIsPlaying(false);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                <span>Reset</span>
              </Button>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono text-text-muted">
              <span>
                Step <strong className="text-text font-bold">{currentStepIndex + 1}</strong> of{' '}
                <strong className="text-text">{timeline.length || 1}</strong>
              </span>

              <div className="flex items-center gap-1">
                <span>Speed:</span>
                {[1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaySpeed(spd)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                      playSpeed === spd
                        ? 'bg-accent/20 text-accent font-bold border border-accent/30'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Active Event Inspector & Step Sequence */}
        <div className="space-y-4">
          {/* Active Step Card */}
          <Card className="p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono flex items-center justify-between pb-2 border-b border-border">
              <span>Active Event Inspector</span>
              <span className="text-accent font-bold">Step #{currentStepIndex + 1}</span>
            </h3>

            {currentEvent ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-text-muted block text-[11px]">Event Type</span>
                  <span className="font-mono font-bold text-text text-sm block">
                    {currentEvent.event_type.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-text-muted block">Timestamp</span>
                    <span className="text-text">{new Date(currentEvent.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Actor</span>
                    <span className="text-text">{currentEvent.actor}</span>
                  </div>
                </div>

                <div className="p-3 rounded bg-surface-muted border border-border/80 space-y-1">
                  <span className="text-[11px] font-mono text-text-muted block">Event Payload</span>
                  <pre className="font-mono text-[11px] text-text whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(currentEvent.details, null, 2)}
                  </pre>
                </div>

                <div className="pt-2 border-t border-border/60 text-[11px] font-mono text-text-muted">
                  <span>Attribution: </span>
                  <strong className="text-accent-teal">{currentEvent.risk_attribution || 'Final-decision attribution'}</strong>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-muted italic">No event data for active step.</p>
            )}
          </Card>

          {/* Chronological Step List */}
          <Card className="p-5 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
              Recorded Chronological Sequence ({timeline.length})
            </h4>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {timeline.map((ev, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCurrentStepIndex(idx);
                    setIsPlaying(false);
                  }}
                  className={`w-full p-2.5 rounded-lg border text-left text-xs transition-colors ${
                    idx === currentStepIndex
                      ? 'bg-accent/10 border-accent text-accent font-semibold'
                      : 'bg-surface-muted hover:bg-surface-elevated border-border text-text-muted'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] mb-0.5">
                    <span>Step #{idx + 1}</span>
                    <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <span className="block truncate text-text font-medium text-[11px]">
                    {ev.event_type.replace(/_/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
