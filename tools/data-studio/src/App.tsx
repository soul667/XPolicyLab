import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChartOutlined,
  CameraOutlined,
  CheckCircleFilled,
  CloudServerOutlined,
  CodeOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FlagFilled,
  FolderOpenOutlined,
  ForwardOutlined,
  MoreOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  ThunderboltFilled,
  UploadOutlined,
  WarningFilled,
} from "@ant-design/icons";
import {
  App as AntApp,
  Avatar,
  Badge,
  Button,
  ConfigProvider,
  Divider,
  Dropdown,
  Empty,
  Input,
  Modal,
  Progress,
  Segmented,
  Select,
  Slider,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";

type Decision = "Unreviewed" | "Keep" | "Review" | "Reject";
type CameraKey = "cam_head" | "cam_left_wrist" | "cam_right_wrist";
type VideoSources = Partial<Record<CameraKey, string>>;

type Dataset = {
  id: string;
  name: string;
  robot: string;
  task: string;
  episodes: number;
  size: string;
  status: "Ready" | "Validating" | "Review" | "Archived";
  quality: number;
  localEpisodeIds?: string[];
};

type Episode = {
  id: string;
  duration: string;
  frames: number;
  quality: number;
  sources: VideoSources;
};

const CAMERA_LABELS: Record<CameraKey, string> = {
  cam_head: "Head camera",
  cam_left_wrist: "Left wrist",
  cam_right_wrist: "Right wrist",
};

const CAMERA_ORDER: CameraKey[] = ["cam_head", "cam_left_wrist", "cam_right_wrist"];

const seedDatasets: Dataset[] = [
  { id: "robodojo-stack", name: "RoboDojo · Stack Bowls", robot: "ARX X5", task: "Bimanual stacking", episodes: 50, size: "18.6 GB", status: "Ready", quality: 96 },
  { id: "r2s2r-shelf", name: "R2S2R · Shelf Transfer", robot: "FR3C", task: "Shelf transfer", episodes: 36, size: "11.2 GB", status: "Validating", quality: 88 },
  { id: "fr3c-pick", name: "FR3C · Pick & Place", robot: "FR3C + EPG60", task: "Real-world pick", episodes: 24, size: "7.8 GB", status: "Review", quality: 73 },
  { id: "cotrain-mix", name: "RoboDojo · Co-train Mix", robot: "Mixed fleet", task: "Multi-task corpus", episodes: 180, size: "71.4 GB", status: "Archived", quality: 91 },
];

const statusTone = { Ready: "success", Validating: "processing", Review: "warning", Archived: "default" } as const;

function makeEpisodes(dataset: Dataset, localSources: Record<string, VideoSources>): Episode[] {
  const ids = dataset.localEpisodeIds ?? Array.from({ length: Math.min(dataset.episodes, 24) }, (_, index) => `episode_${String(index + 1).padStart(3, "0")}`);
  return ids.map((id, index) => ({
    id,
    duration: localSources[id] ? "Local video" : `${1 + ((index * 7) % 3)}:${String(8 + ((index * 13) % 51)).padStart(2, "0")}`,
    frames: localSources[id] ? 0 : 920 + (((index + 1) * 137) % 1250),
    quality: index === 6 || index === 12 ? 74 : 91 + (index % 8),
    sources: localSources[id] ?? {},
  }));
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00.00";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${rest.toFixed(2).padStart(5, "0")}`;
}

function DatasetCard({ dataset, active, onClick }: { dataset: Dataset; active: boolean; onClick: () => void }) {
  return (
    <button className={`dataset-card ${active ? "active" : ""}`} onClick={onClick}>
      <span className="dataset-card-top">
        <span className="dataset-icon"><DatabaseOutlined /></span>
        <span className="dataset-title-wrap"><strong>{dataset.name}</strong><small>{dataset.robot}</small></span>
        <MoreOutlined className="quiet-icon" />
      </span>
      <span className="dataset-meta"><span>{dataset.episodes} eps</span><span>{dataset.size}</span><Tag color={statusTone[dataset.status]}>{dataset.status}</Tag></span>
      <span className="quality-line"><i style={{ width: `${dataset.quality}%` }} /></span>
    </button>
  );
}

function EpisodeRow({ episode, active, decision, onClick }: { episode: Episode; active: boolean; decision: Decision; onClick: () => void }) {
  const icon = decision === "Keep" ? <CheckCircleFilled className="keep-icon" /> : decision === "Reject" ? <DeleteOutlined className="reject-icon" /> : decision === "Review" ? <FlagFilled className="review-icon" /> : <span className="unreviewed-dot" />;
  return (
    <button className={`episode-row ${active ? "active" : ""}`} onClick={onClick}>
      <span className="episode-play"><PlayCircleFilled /></span>
      <span className="episode-copy"><strong>{episode.id}</strong><small>{episode.duration} · {episode.frames ? `${episode.frames.toLocaleString()} frames` : "3 video streams"}</small></span>
      {icon}
    </button>
  );
}

function CameraView({ cameraKey, src, videoRef, isMaster, onTimeUpdate, onLoadedMetadata, playing }: {
  cameraKey: CameraKey;
  src?: string;
  videoRef: (node: HTMLVideoElement | null) => void;
  isMaster: boolean;
  onTimeUpdate: (video: HTMLVideoElement) => void;
  onLoadedMetadata: (video: HTMLVideoElement) => void;
  playing: boolean;
}) {
  return (
    <article className={`camera-view ${cameraKey === "cam_head" ? "camera-head" : ""}`}>
      <div className="camera-label"><span><i className={src ? "online" : "offline"} />{CAMERA_LABELS[cameraKey]}</span><code>{cameraKey}</code></div>
      {src ? (
        <video
          ref={videoRef}
          src={src}
          muted
          playsInline
          preload="metadata"
          onTimeUpdate={(event) => isMaster && onTimeUpdate(event.currentTarget)}
          onLoadedMetadata={(event) => onLoadedMetadata(event.currentTarget)}
        />
      ) : (
        <div className="video-placeholder">
          <span className="reticle" />
          <CameraOutlined />
          <strong>{CAMERA_LABELS[cameraKey]}</strong>
          <small>Import a folder containing this stream</small>
        </div>
      )}
      <div className="camera-status"><span>{src ? (playing ? "PLAYING" : "READY") : "NO SOURCE"}</span><span>RGB · 30 FPS</span></div>
    </article>
  );
}

function DataStudio() {
  const { message } = AntApp.useApp();
  const videoRefs = useRef<Partial<Record<CameraKey, HTMLVideoElement>>>({});
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [datasets, setDatasets] = useState(seedDatasets);
  const [datasetId, setDatasetId] = useState(seedDatasets[0].id);
  const [episodeId, setEpisodeId] = useState("episode_001");
  const [localSources, setLocalSources] = useState<Record<string, VideoSources>>({});
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => {
    try { return JSON.parse(localStorage.getItem("xpolicylab-data-decisions") ?? "{}"); } catch { return {}; }
  });
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("xpolicylab-data-notes") ?? "{}"); } catch { return {}; }
  });
  const [search, setSearch] = useState("");
  const [datasetFilter, setDatasetFilter] = useState("All");
  const [decisionFilter, setDecisionFilter] = useState<Decision | "All">("All");
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [helpOpen, setHelpOpen] = useState(false);

  const selectedDataset = datasets.find((item) => item.id === datasetId) ?? datasets[0];
  const episodes = useMemo(() => (selectedDataset ? makeEpisodes(selectedDataset, localSources) : []), [selectedDataset, localSources]);
  const visibleEpisodes = episodes.filter((episode) => decisionFilter === "All" || (decisions[`${datasetId}/${episode.id}`] ?? "Unreviewed") === decisionFilter);
  const selectedEpisode = episodes.find((item) => item.id === episodeId) ?? episodes[0];
  const decisionKey = `${datasetId}/${selectedEpisode?.id ?? "none"}`;
  const decision = decisions[decisionKey] ?? "Unreviewed";
  const masterKey = CAMERA_ORDER.find((key) => Boolean(selectedEpisode?.sources[key]));
  const filteredDatasets = datasets.filter((dataset) => `${dataset.name} ${dataset.robot} ${dataset.task}`.toLowerCase().includes(search.toLowerCase()) && (datasetFilter === "All" || dataset.status === datasetFilter));
  const reviewedCount = episodes.filter((episode) => (decisions[`${datasetId}/${episode.id}`] ?? "Unreviewed") !== "Unreviewed").length;

  useEffect(() => localStorage.setItem("xpolicylab-data-decisions", JSON.stringify(decisions)), [decisions]);
  useEffect(() => localStorage.setItem("xpolicylab-data-notes", JSON.stringify(notes)), [notes]);

  useEffect(() => {
    Object.values(videoRefs.current).forEach((video) => video?.pause());
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [datasetId, episodeId]);

  const setDecision = (next: Decision) => {
    setDecisions((items) => ({ ...items, [decisionKey]: next }));
    message.success(`${selectedEpisode.id} marked ${next.toLowerCase()}.`);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === "Space") { event.preventDefault(); void togglePlayback(); }
      if (event.key === "ArrowLeft") seekBy(-1 / 30);
      if (event.key === "ArrowRight") seekBy(1 / 30);
      if (event.key === "1") setDecision("Keep");
      if (event.key === "2") setDecision("Review");
      if (event.key === "3") setDecision("Reject");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const chooseDataset = (id: string) => { setDatasetId(id); setEpisodeId("episode_001"); };

  const togglePlayback = async () => {
    const videos = Object.values(videoRefs.current).filter(Boolean) as HTMLVideoElement[];
    if (!videos.length) { message.info("Import three-view videos to start reviewing."); return; }
    if (playing) videos.forEach((video) => video.pause());
    else await Promise.all(videos.map((video) => video.play().catch(() => undefined)));
    setPlaying(!playing);
  };

  const seekTo = (time: number) => {
    const bounded = Math.max(0, Math.min(duration || time, time));
    Object.values(videoRefs.current).forEach((video) => { if (video) video.currentTime = bounded; });
    setCurrentTime(bounded);
  };
  const seekBy = (delta: number) => seekTo(currentTime + delta);

  const changeRate = (nextRate: number) => {
    Object.values(videoRefs.current).forEach((video) => { if (video) video.playbackRate = nextRate; });
    setRate(nextRate);
  };

  const syncFromMaster = (master: HTMLVideoElement) => {
    setCurrentTime(master.currentTime);
    Object.entries(videoRefs.current).forEach(([key, video]) => {
      if (key !== masterKey && video && Math.abs(video.currentTime - master.currentTime) > 0.08) video.currentTime = master.currentTime;
    });
  };

  const importFolder = (files: FileList | null) => {
    if (!files?.length) return;
    const grouped: Record<string, VideoSources> = {};
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) continue;
      const path = file.webkitRelativePath || file.name;
      const episodeMatch = path.match(/episode[_-]?(\d+)/i);
      const episodeId = episodeMatch ? `episode_${episodeMatch[1].padStart(3, "0")}` : "episode_001";
      const lower = path.toLowerCase();
      const camera: CameraKey | undefined = /left.*wrist|wrist.*left|left_cam/.test(lower) ? "cam_left_wrist" : /right.*wrist|wrist.*right|right_cam/.test(lower) ? "cam_right_wrist" : /head|front/.test(lower) ? "cam_head" : undefined;
      if (!camera) continue;
      grouped[episodeId] ??= {};
      grouped[episodeId][camera] = URL.createObjectURL(file);
    }
    const ids = Object.keys(grouped).sort();
    if (!ids.length) { message.error("No videos matched episode and camera naming rules."); return; }
    const rootName = Array.from(files)[0]?.webkitRelativePath.split("/")[0] || "Local import";
    const localDataset: Dataset = { id: `local-${Date.now()}`, name: rootName, robot: "Local dataset", task: "Three-view review", episodes: ids.length, size: "Browser-local", status: "Ready", quality: 100, localEpisodeIds: ids };
    setLocalSources(grouped);
    setDatasets((items) => [localDataset, ...items]);
    setDatasetId(localDataset.id);
    setEpisodeId(ids[0]);
    message.success(`Loaded ${ids.length} episode${ids.length === 1 ? "" : "s"} from ${rootName}.`);
  };

  const exportReview = () => {
    const payload = episodes.map((episode) => ({ dataset: selectedDataset.id, episode: episode.id, decision: decisions[`${datasetId}/${episode.id}`] ?? "Unreviewed", note: notes[`${datasetId}/${episode.id}`] ?? "" }));
    const href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${selectedDataset.id}-review.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <div className="studio-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><ThunderboltFilled /></span><span><strong>XPolicyLab</strong><small>DATA STUDIO</small></span></div>
        <Divider type="vertical" />
        <div className="breadcrumb"><DatabaseOutlined /> Review queue <span>/</span><strong>{selectedDataset?.name}</strong></div>
        <div className="top-actions">
          <Badge status="success" text="Local-first" />
          <Button icon={<DownloadOutlined />} onClick={exportReview}>Export review</Button>
          <Button type="primary" icon={<FolderOpenOutlined />} onClick={() => folderInputRef.current?.click()}>Import video folder</Button>
          <input ref={folderInputRef} className="hidden-input" type="file" accept="video/*" multiple {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} onChange={(event) => importFolder(event.target.files)} />
          <Avatar size={30}>XL</Avatar>
        </div>
      </header>

      <aside className="icon-rail">
        <Tooltip title="Review queue" placement="right"><Button className="rail-active" type="text" icon={<DatabaseOutlined />} /></Tooltip>
        <Tooltip title="Quality report" placement="right"><Button type="text" icon={<BarChartOutlined />} /></Tooltip>
        <Tooltip title="Import" placement="right"><Button type="text" icon={<UploadOutlined />} onClick={() => folderInputRef.current?.click()} /></Tooltip>
        <Tooltip title="Jobs" placement="right"><Button type="text" icon={<CloudServerOutlined />} /></Tooltip>
        <span className="rail-spacer" />
        <Tooltip title="Shortcuts" placement="right"><Button type="text" icon={<CodeOutlined />} onClick={() => setHelpOpen(true)} /></Tooltip>
        <Tooltip title="Settings" placement="right"><Button type="text" icon={<SettingOutlined />} /></Tooltip>
      </aside>

      <aside className="catalog panel-border">
        <div className="section-heading"><div><span className="eyebrow">WORKSPACE</span><h2>Dataset catalog</h2></div><Button size="small" type="text" icon={<FolderOpenOutlined />} onClick={() => folderInputRef.current?.click()} /></div>
        <Input prefix={<SearchOutlined />} placeholder="Search datasets" value={search} onChange={(event) => setSearch(event.target.value)} allowClear />
        <Select className="status-filter" value={datasetFilter} onChange={setDatasetFilter} options={["All", "Ready", "Validating", "Review", "Archived"].map((value) => ({ value, label: value === "All" ? "All statuses" : value }))} />
        <div className="catalog-list">
          {filteredDatasets.map((dataset) => <DatasetCard key={dataset.id} dataset={dataset} active={dataset.id === selectedDataset?.id} onClick={() => chooseDataset(dataset.id)} />)}
          {!filteredDatasets.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No matching datasets" />}
        </div>
        <div className="storage-card"><span className="storage-title"><CloudServerOutlined /> Review progress</span><Progress percent={episodes.length ? Math.round((reviewedCount / episodes.length) * 100) : 0} showInfo={false} strokeColor="#5ee7c2" trailColor="#26303b" /><small>{reviewedCount} of {episodes.length} episodes reviewed</small></div>
      </aside>

      <main className="workspace">
        <section className="episode-panel panel-border">
          <div className="episode-head">
            <Segmented value={decisionFilter} onChange={(value) => setDecisionFilter(value as Decision | "All")} options={["All", "Unreviewed", "Keep", "Review", "Reject"]} block />
            <div className="mini-actions"><span>{visibleEpisodes.length} shown</span><Dropdown menu={{ items: [{ key: "name", label: "Sort by episode" }, { key: "decision", label: "Sort by decision" }] }}><Button size="small" type="text" icon={<MoreOutlined />} /></Dropdown></div>
          </div>
          <div className="episode-list">{visibleEpisodes.map((episode) => <EpisodeRow key={episode.id} episode={episode} active={episode.id === selectedEpisode?.id} decision={decisions[`${datasetId}/${episode.id}`] ?? "Unreviewed"} onClick={() => setEpisodeId(episode.id)} />)}</div>
        </section>

        <section className="review-stage">
          <div className="viewer-toolbar">
            <div><span className="live-dot" /><strong>{selectedEpisode?.id}</strong><span>{selectedDataset?.task}</span></div>
            <Space size={6}><Tag icon={<CameraOutlined />}>3 synchronized views</Tag><Tooltip title="Reset timeline"><Button size="small" type="text" icon={<ReloadOutlined />} onClick={() => seekTo(0)} /></Tooltip><Button size="small" icon={<FolderOpenOutlined />} onClick={() => folderInputRef.current?.click()}>Replace source</Button></Space>
          </div>
          <div className="camera-grid">
            {CAMERA_ORDER.map((cameraKey) => <CameraView key={cameraKey} cameraKey={cameraKey} src={selectedEpisode?.sources[cameraKey]} videoRef={(node) => { if (node) videoRefs.current[cameraKey] = node; else delete videoRefs.current[cameraKey]; }} isMaster={cameraKey === masterKey} onTimeUpdate={syncFromMaster} onLoadedMetadata={(video) => { if (cameraKey === masterKey) setDuration(video.duration); video.playbackRate = rate; }} playing={playing} />)}
          </div>
          <div className="transport">
            <div className="transport-buttons"><Tooltip title="Previous frame (←)"><Button type="text" icon={<StepBackwardOutlined />} onClick={() => seekBy(-1 / 30)} /></Tooltip><Button className="play-button" type="primary" shape="circle" icon={playing ? <PauseCircleFilled /> : <PlayCircleFilled />} onClick={() => void togglePlayback()} /><Tooltip title="Next frame (→)"><Button type="text" icon={<StepForwardOutlined />} onClick={() => seekBy(1 / 30)} /></Tooltip></div>
            <code>{formatTime(currentTime)}</code><Slider min={0} max={duration || 1} step={1 / 30} value={Math.min(currentTime, duration || 1)} onChange={seekTo} tooltip={{ formatter: (value) => formatTime(value ?? 0) }} /><code>{formatTime(duration)}</code>
            <Select className="rate-select" value={rate} onChange={changeRate} options={[0.25, 0.5, 1, 1.5, 2].map((value) => ({ value, label: `${value}×` }))} />
          </div>
          <footer className="viewer-status"><span><i className={masterKey ? "status-ok" : "status-warn"} />{masterKey ? "Videos loaded locally" : "Waiting for video folder"}</span><span>Frame {Math.round(currentTime * 30)}</span><span>Drift guard ±80 ms</span><span className="status-fill" /><span>Nothing uploaded</span></footer>
        </section>

        <aside className="inspector panel-border">
          <div className="inspector-head"><div><span className="eyebrow">SCREENING</span><h2>Episode decision</h2></div><Tag color={decision === "Keep" ? "success" : decision === "Reject" ? "error" : decision === "Review" ? "warning" : "default"}>{decision}</Tag></div>
          <div className="decision-stack">
            <Button className={decision === "Keep" ? "decision-active keep" : ""} icon={<CheckCircleFilled />} onClick={() => setDecision("Keep")}><span><strong>Keep episode</strong><small>Shortcut 1</small></span></Button>
            <Button className={decision === "Review" ? "decision-active review" : ""} icon={<FlagFilled />} onClick={() => setDecision("Review")}><span><strong>Needs review</strong><small>Shortcut 2</small></span></Button>
            <Button danger className={decision === "Reject" ? "decision-active reject" : ""} icon={<DeleteOutlined />} onClick={() => setDecision("Reject")}><span><strong>Reject episode</strong><small>Shortcut 3</small></span></Button>
          </div>
          <Divider />
          <div className="stat-grid"><Statistic title="Quality" value={selectedEpisode?.quality ?? 0} suffix="%" /><Statistic title="Rate" value={30} suffix="Hz" /><Statistic title="State" value={14} suffix="D" /><Statistic title="Action" value={14} suffix="D" /></div>
          <Divider />
          <div className="inspector-section">
            <div className="subheading"><strong>Three-view completeness</strong><Tag>{Object.keys(selectedEpisode?.sources ?? {}).length}/3</Tag></div>
            <div className="stream-list">{CAMERA_ORDER.map((camera) => <span key={camera}><CameraOutlined /><span><strong>{camera}</strong><small>{selectedEpisode?.sources[camera] ? "Local video · ready" : "Expected MP4/WebM"}</small></span><Badge status={selectedEpisode?.sources[camera] ? "success" : "default"} /></span>)}</div>
          </div>
          <Divider />
          <div className="inspector-section"><div className="subheading"><strong>Reviewer note</strong><span className="autosave">AUTO-SAVED</span></div><Input.TextArea value={notes[decisionKey] ?? ""} onChange={(event) => setNotes((items) => ({ ...items, [decisionKey]: event.target.value }))} placeholder="Occlusion, failed grasp, unsafe motion…" autoSize={{ minRows: 3, maxRows: 5 }} /></div>
          <div className="inspector-footer"><Button block icon={<ForwardOutlined />} onClick={() => { const index = episodes.findIndex((item) => item.id === selectedEpisode.id); const next = episodes[index + 1]; if (next) setEpisodeId(next.id); }}>Save & next episode</Button></div>
        </aside>
      </main>

      <Modal title="Keyboard shortcuts" open={helpOpen} onCancel={() => setHelpOpen(false)} footer={null}>
        <div className="shortcut-list"><span><kbd>Space</kbd><b>Play / pause all views</b></span><span><kbd>← / →</kbd><b>Previous / next frame</b></span><span><kbd>1</kbd><b>Keep episode</b></span><span><kbd>2</kbd><b>Mark for review</b></span><span><kbd>3</kbd><b>Reject episode</b></span></div>
        <Typography.Paragraph type="secondary">Video files remain in this browser tab. Only compact review decisions and notes are saved in local storage.</Typography.Paragraph>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: "#5ee7c2", colorInfo: "#63a4ff", colorBgBase: "#080c12", colorTextBase: "#e8edf2", borderRadius: 7, fontFamily: 'Inter, "SF Pro Display", "Segoe UI", sans-serif' }, components: { Button: { controlHeight: 32 }, Input: { controlHeight: 34 }, Select: { controlHeight: 34 } } }}>
      <AntApp><DataStudio /></AntApp>
    </ConfigProvider>
  );
}
