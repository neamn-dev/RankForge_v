import { useState, useEffect } from 'react';
import {
  Sparkles, X, ChevronRight, ChevronLeft, Check, Layers,
  LayoutTemplate, Film, Wand2, Plus, Trash2, ArrowUp, ArrowDown,
  Eye, ExternalLink, Link2, Download, Flame, ThumbsUp, Shuffle, Play
} from 'lucide-react';
import { useStore } from '../store';
import { api } from '../api';
import type { Template, ViralCandidate, TitleWord } from '../types';

const INSPIRATION_CHIPS = [
  'Ranking Best Shark Moments',
  'Ranking Best Cheetah Moments',
  'Craziest Roller-Skating Fails',
  'Top 10 Funniest Animal Moments',
  'Ranking Funniest WaterSlide Fail Moments',
  'Top 5 Unreal Cat Moments',
  'Ranking Funniest Trampoline Moments',
  'Top 5 Impossible Gym Fails',
];

const COLOR_PALETTE = [
  '#ffffff', // White
  '#facc15', // Gold / Yellow
  '#38bdf8', // Sky Blue / Cyan
  '#ef4444', // Red
  '#fb923c', // Orange
  '#4ade80', // Lime
  '#c084fc', // Purple
  '#f43f5e', // Rose
];

function parseTitleWords(title: string): TitleWord[] {
  const words = (title || 'Top 5 Moments').trim().split(/\s+/);
  return words.map(w => {
    const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    let color = '#ffffff';
    if (['funniest', 'best', 'craziest', 'unreal', 'greatest', 'wildest', 'top'].includes(clean)) {
      color = '#facc15';
    } else if (['shark', 'cheetah', 'animal', 'skate', 'roller', 'trampoline', 'waterslide', 'sports', 'pool', 'water'].includes(clean)) {
      color = '#38bdf8';
    } else if (['fail', 'fails', 'disaster', 'crash', 'deadly', 'drop', 'danger'].includes(clean)) {
      color = '#ef4444';
    } else if (['gaming', 'clutch', 'legend'].includes(clean)) {
      color = '#c084fc';
    } else if (['bruh', 'meme', 'comedy', 'lol', 'humor'].includes(clean)) {
      color = '#4ade80';
    }
    return { text: w, color };
  });
}

export default function Wizard() {
  const { state, dispatch } = useStore();
  const { wizardOpen, wizardStep, templates, project } = state;

  const [topic, setTopic] = useState('Ranking Best Shark Moments');
  const [platform, setPlatform] = useState('YouTube Shorts');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [itemCount, setItemCount] = useState(5);
  const [hookText, setHookText] = useState('WAIT FOR NUMBER ONE 🦈');
  const [selectedTemplateId, setSelectedTemplateId] = useState('shark');
  const [selectedLayoutPreset, setSelectedLayoutPreset] = useState('Full Black');
  const [downloadClips, setDownloadClips] = useState(true);
  const [creditsText, setCreditsText] = useState('Original credits to: @happypawsdaily6 @storieswise @melissalohhi');
  const [titleWords, setTitleWords] = useState<TitleWord[]>([]);

  // Discovery State
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [discoveryStepText, setDiscoveryStepText] = useState('');
  const [candidates, setCandidates] = useState<ViralCandidate[]>([]);

  // Custom URL import
  const [customUrl, setCustomUrl] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);

  // Video preview modal
  const [previewCandidate, setPreviewCandidate] = useState<ViralCandidate | null>(null);

  // Sync title words when topic changes
  useEffect(() => {
    setTitleWords(parseTitleWords(topic));
  }, [topic]);

  if (!wizardOpen) return null;

  const handleDiscoverViralVideos = async () => {
    setLoadingDiscovery(true);
    setDiscoveryStepText(`Searching YouTube Shorts & social media for "${topic}"…`);

    const t1 = setTimeout(() => {
      setDiscoveryStepText('Analyzing view counts, viral velocity & like ratios…');
    }, 1100);

    const t2 = setTimeout(() => {
      setDiscoveryStepText('Ranking clips into high-impact countdown order…');
    }, 2200);

    try {
      const res = await api.discoverVideos({
        topic,
        platform,
        itemCount,
      });

      clearTimeout(t1);
      clearTimeout(t2);

      if (res && res.candidates && res.candidates.length > 0) {
        setCandidates(res.candidates);
        if (res.hookText) setHookText(res.hookText);
        if (res.templateId) setSelectedTemplateId(res.templateId);

        // Gather credits
        const credits = res.candidates
          .map(c => c.originalCredits || c.creator)
          .filter(Boolean);
        if (credits.length) {
          setCreditsText(`Original credits to: ${Array.from(new Set(credits)).slice(0, 5).join(' ')}`);
        }

        dispatch({ type: 'SET_NOTICE', message: `Found ${res.candidates.length} viral video candidates!` });
        dispatch({ type: 'SET_WIZARD_STEP', step: 1 });
      } else {
        fallbackCandidates();
      }
    } catch {
      clearTimeout(t1);
      clearTimeout(t2);
      fallbackCandidates();
    } finally {
      setLoadingDiscovery(false);
    }
  };

  const fallbackCandidates = () => {
    const clean = topic.replace(/top\s*\d+\s*/i, '').replace(/ranking\s*/i, '').trim();
    const fallbackList: ViralCandidate[] = [];
    for (let i = 1; i <= itemCount; i++) {
      const isTop = i === 1;
      const rank = i;
      fallbackList.push({
        id: `cand-${rank}-${Date.now()}`,
        rank: rank,
        title: isTop ? `The Legendary ${clean}` : `${clean} #${rank}`,
        description: `Highlight ranked at position #${rank}`,
        comment: isTop ? 'Apex Launch' : (rank === itemCount ? 'Direct hit' : ''),
        emoji: isTop ? '🔥' : (rank === itemCount ? '💀' : ''),
        rankColor: rank === 1 ? '#facc15' : (rank === 2 ? '#38bdf8' : (rank === 3 ? '#ef4444' : '#ffffff')),
        duration: 4.0,
        views: 25000000 + (itemCount - rank + 1) * 15000000,
        viewsFormatted: `${25 + (itemCount - rank + 1) * 15}M`,
        likes: 1800000 + (itemCount - rank + 1) * 900000,
        likesFormatted: `${(1.8 + (itemCount - rank + 1) * 0.9).toFixed(1)}M`,
        creator: '@viralranks',
        originalCredits: '@viralranks',
        viralScore: 90 + (itemCount - rank),
        license: 'Attribution / Fair Use',
      });
    }
    setCandidates(fallbackList);
    dispatch({ type: 'SET_NOTICE', message: 'Generated viral ranking candidate outline!' });
    dispatch({ type: 'SET_WIZARD_STEP', step: 1 });
  };

  const handleImportSingleUrl = async () => {
    const url = customUrl.trim();
    if (!url) return;
    setImportingUrl(true);
    try {
      const res = await api.inspectUrl(url);
      const newRank = candidates.length + 1;
      const newCand: ViralCandidate = {
        id: `url-cand-${Date.now()}`,
        rank: newRank,
        title: res.title || `Imported Clip #${newRank}`,
        description: res.description || 'Imported from URL',
        comment: '',
        emoji: '🔥',
        rankColor: '#38bdf8',
        duration: res.duration ? Math.min(8, Math.max(3, res.duration)) : 4.0,
        sourceUrl: url,
        thumbnailUrl: res.thumbnailUrl || res.thumbnail,
        views: res.views || 1000000,
        viewsFormatted: res.viewsFormatted || '1M',
        likes: res.likes || 80000,
        likesFormatted: res.likesFormatted || '80K',
        creator: res.creator || '@creator',
        originalCredits: res.originalCredits || res.creator,
        viralScore: res.viralScore || 88,
        license: 'Attribution Required',
      };
      setCandidates([...candidates, newCand]);
      setCustomUrl('');
      dispatch({ type: 'SET_NOTICE', message: 'Clip imported from URL!' });
    } catch {
      // Fallback manual add if URL probe fails
      const newRank = candidates.length + 1;
      setCandidates([
        ...candidates,
        {
          id: `url-cand-${Date.now()}`,
          rank: newRank,
          title: `Custom Video #${newRank}`,
          description: 'User provided video clip',
          comment: '',
          emoji: '🎬',
          rankColor: '#38bdf8',
          duration: 4.0,
          sourceUrl: url,
          views: 500000,
          viewsFormatted: '500K',
          creator: '@custom',
          viralScore: 85,
        },
      ]);
      setCustomUrl('');
      dispatch({ type: 'SET_NOTICE', message: 'Clip added to candidates!' });
    } finally {
      setImportingUrl(false);
    }
  };

  const handleReorder = (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= candidates.length) return;
    const copy = [...candidates];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    // Reassign ranks
    const reindexed = copy.map((c, i) => ({
      ...c,
      rank: i + 1,
      rankColor: i === 0 ? '#facc15' : (i === 1 ? '#38bdf8' : (i === 2 ? '#ef4444' : '#ffffff')),
    }));
    setCandidates(reindexed);
  };

  const handleDeleteCandidate = (idx: number) => {
    const filtered = candidates.filter((_, i) => i !== idx);
    const reindexed = filtered.map((c, i) => ({
      ...c,
      rank: i + 1,
      rankColor: i === 0 ? '#facc15' : (i === 1 ? '#38bdf8' : (i === 2 ? '#ef4444' : '#ffffff')),
    }));
    setCandidates(reindexed);
  };

  const handleCycleWordColor = (wordIdx: number) => {
    const copy = [...titleWords];
    const curColor = copy[wordIdx].color;
    const curIdx = COLOR_PALETTE.indexOf(curColor);
    const nextColor = COLOR_PALETTE[(curIdx + 1) % COLOR_PALETTE.length];
    copy[wordIdx].color = nextColor;
    setTitleWords(copy);
  };

  const handleFinishAndAssemble = async () => {
    dispatch({ type: 'SET_BUSY', message: 'Downloading footage & assembling CapCut ranking project…' });
    try {
      let bgColor = '#000000';
      if (selectedLayoutPreset === 'Dark Navy') bgColor = '#0a1628';
      if (selectedLayoutPreset === 'Charcoal') bgColor = '#1a1a2e';
      if (selectedLayoutPreset === 'Deep Purple') bgColor = '#16082e';

      const assembled = await api.assembleProject({
        topic,
        hookText,
        platform,
        aspectRatio,
        templateId: selectedTemplateId,
        canvasBackground: bgColor,
        candidates,
        downloadClips,
      });

      if (assembled && assembled.clips) {
        dispatch({ type: 'COMMIT' });
        dispatch({
          type: 'UPDATE_PROJECT',
          payload: {
            ...assembled,
            layout: {
              ...assembled.layout,
              topRegion: {
                ...assembled.layout.topRegion,
                titleWords: titleWords.length ? titleWords : assembled.layout.topRegion.titleWords,
              },
              bottomRegion: {
                ...assembled.layout.bottomRegion,
                caption: creditsText,
              },
            },
          },
        });
        dispatch({ type: 'SET_SELECTED', clipId: assembled.clips[0]?.id || '' });
        dispatch({ type: 'SET_PLAYHEAD', time: 0 });
        dispatch({ type: 'SET_WIZARD_OPEN', open: false });
        dispatch({ type: 'SET_NOTICE', message: 'Viral ranking video assembled into CapCut timeline editor!' });
      }
    } catch (e) {
      dispatch({ type: 'SET_NOTICE', message: e instanceof Error ? e.message : 'Assembly failed' });
    } finally {
      dispatch({ type: 'SET_BUSY', message: '' });
    }
  };

  return (
    <div className="wizard-overlay" onClick={() => dispatch({ type: 'SET_WIZARD_OPEN', open: false })}>
      <div className="wizard-modal" onClick={e => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="wizard-header">
          <div className="wizard-brand">
            <span className="logo"><i /><i /><i /><i /></span>
            <b style={{ fontSize: 16, fontFamily: 'Space Grotesk' }}>RankForge AI Studio</b>
            <span className="ai-chip">
              <Sparkles size={11} /> Viblo-Powered
            </span>
          </div>
          <button className="icon" onClick={() => dispatch({ type: 'SET_WIZARD_OPEN', open: false })}>
            <X size={16} />
          </button>
        </div>

        {/* ── Steps Indicator ── */}
        <div className="wizard-steps">
          {[
            { num: 1, label: 'Topic & Idea' },
            { num: 2, label: 'Discover & Rank Clips' },
            { num: 3, label: 'Sandwich Style & 3D Title' },
          ].map(s => (
            <div
              key={s.num}
              className={`step-indicator ${wizardStep === s.num - 1 ? 'active' : wizardStep > s.num - 1 ? 'done' : ''}`}
            >
              <div className="step-num">
                {wizardStep > s.num - 1 ? <Check size={11} /> : s.num}
              </div>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="wizard-body">
          {/* STEP 1: TOPIC & AI PROMPT */}
          {wizardStep === 0 && (
            <div>
              <div className="ai-prompt-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <Wand2 size={16} style={{ color: '#20c8f2' }} />
                  <b style={{ fontSize: 13, color: '#e7f0fa' }}>Enter a ranking video topic or idea:</b>
                </div>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Ranking Best Shark Moments, Craziest Roller-Skating Fails, Top 10 Funniest Animals"
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    fontSize: 13,
                    background: '#090e15',
                    border: '1px solid #233448',
                    borderRadius: 8,
                    color: '#fff',
                    outline: 'none',
                  }}
                />

                <div className="prompt-chips">
                  {INSPIRATION_CHIPS.map(chip => (
                    <button
                      key={chip}
                      className="prompt-chip"
                      onClick={() => setTopic(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct URL import option */}
              <div style={{ background: '#101723', border: '1px solid #1f2f42', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 11, color: '#9bb0c4' }}>
                  <Link2 size={13} style={{ color: '#38bdf8' }} /> Or import from a video link (YouTube Shorts, TikTok, Instagram Reels):
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={e => setCustomUrl(e.target.value)}
                    placeholder="https://youtube.com/shorts/iVaDuaWzgyw"
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      fontSize: 11,
                      background: '#0a1018',
                      border: '1px solid #243548',
                      borderRadius: 6,
                      color: '#fff',
                      outline: 'none',
                    }}
                  />
                  <button
                    className="small-btn"
                    disabled={!customUrl.trim() || importingUrl}
                    onClick={() => {
                      setTopic(customUrl.trim());
                      handleDiscoverViralVideos();
                    }}
                  >
                    {importingUrl ? 'Probing…' : 'Use Video'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                <label style={{ fontSize: 11, color: '#9bb0c4', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  Target Platform
                  <select
                    value={platform}
                    onChange={e => {
                      setPlatform(e.target.value);
                      if (e.target.value === 'YouTube') setAspectRatio('16:9');
                      else setAspectRatio('9:16');
                    }}
                    style={{
                      background: '#131c28',
                      border: '1px solid #26384c',
                      borderRadius: 6,
                      color: '#dbe5ef',
                      padding: 8,
                      fontSize: 11,
                    }}
                  >
                    <option>YouTube Shorts (9:16)</option>
                    <option>TikTok (9:16)</option>
                    <option>Instagram Reels (9:16)</option>
                    <option>YouTube (16:9)</option>
                  </select>
                </label>

                <label style={{ fontSize: 11, color: '#9bb0c4', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  Aspect Ratio
                  <select
                    value={aspectRatio}
                    onChange={e => setAspectRatio(e.target.value)}
                    style={{
                      background: '#131c28',
                      border: '1px solid #26384c',
                      borderRadius: 6,
                      color: '#dbe5ef',
                      padding: 8,
                      fontSize: 11,
                    }}
                  >
                    <option value="9:16">9:16 (Vertical)</option>
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="1:1">1:1 (Square)</option>
                  </select>
                </label>

                <label style={{ fontSize: 11, color: '#9bb0c4', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  Rank Count
                  <select
                    value={itemCount}
                    onChange={e => setItemCount(Number(e.target.value))}
                    style={{
                      background: '#131c28',
                      border: '1px solid #26384c',
                      borderRadius: 6,
                      color: '#dbe5ef',
                      padding: 8,
                      fontSize: 11,
                    }}
                  >
                    <option value={3}>Top 3</option>
                    <option value={5}>Top 5 (Recommended)</option>
                    <option value={7}>Top 7</option>
                    <option value={10}>Top 10</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: DISCOVER & RANK VIRAL CLIPS */}
          {wizardStep === 1 && (
            <div>
              {loadingDiscovery ? (
                <div className="ai-scanner-box">
                  <div className="scanner-radar">
                    <div className="scanner-radar-inner">
                      <Sparkles size={18} />
                    </div>
                  </div>
                  <b style={{ fontSize: 14, color: '#f0f6fc', display: 'block', marginBottom: 6 }}>
                    AI Viral Video Discovery Engine Active
                  </b>
                  <p style={{ fontSize: 12, color: '#38bdf8', margin: 0 }}>
                    {discoveryStepText}
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <b style={{ fontSize: 13, color: '#ecf3fa', display: 'block' }}>
                        Curated Viral Clips ({candidates.length})
                      </b>
                      <small style={{ fontSize: 10, color: '#7a8e9f' }}>
                        Preview, reorder rank, customize viral comments & emojis, or replace candidate footage.
                      </small>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="Paste custom clip URL…"
                        value={customUrl}
                        onChange={e => setCustomUrl(e.target.value)}
                        style={{
                          width: 170,
                          padding: '5px 8px',
                          fontSize: 10,
                          background: '#0b111a',
                          border: '1px solid #203144',
                          borderRadius: 5,
                          color: '#fff',
                        }}
                      />
                      <button
                        className="small-btn"
                        disabled={!customUrl.trim() || importingUrl}
                        onClick={handleImportSingleUrl}
                      >
                        <Plus size={11} /> {importingUrl ? 'Adding…' : 'Add Clip'}
                      </button>
                    </div>
                  </div>

                  <div className="candidate-list">
                    {candidates.map((cand, idx) => (
                      <div key={cand.id || idx} className="candidate-card">
                        {/* Rank Badge */}
                        <div
                          className="candidate-rank-badge"
                          style={{
                            borderColor: cand.rankColor || '#38bdf8',
                            color: cand.rankColor || '#38bdf8',
                          }}
                        >
                          <span style={{ fontSize: 11, opacity: 0.7 }}>RANK</span>
                          <span>#{cand.rank}</span>
                        </div>

                        {/* Thumbnail / Preview trigger */}
                        <div
                          className="candidate-thumb-box"
                          onClick={() => setPreviewCandidate(cand)}
                          title="Click to preview candidate video"
                        >
                          {cand.thumbnailUrl ? (
                            <img src={cand.thumbnailUrl} alt={cand.title} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b121b', color: '#44566c' }}>
                              <Film size={22} />
                            </div>
                          )}
                          <span className="candidate-thumb-dur">{cand.duration}s</span>
                          <div className="candidate-thumb-play">
                            <Play size={18} fill="#fff" color="#fff" />
                          </div>
                        </div>

                        {/* Info & Editing */}
                        <div className="candidate-info">
                          <div className="candidate-top-row">
                            <input
                              className="candidate-title-input"
                              type="text"
                              value={cand.title}
                              placeholder="Moment Highlight Title"
                              onChange={e => {
                                const copy = [...candidates];
                                copy[idx].title = e.target.value;
                                setCandidates(copy);
                              }}
                            />

                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input
                                type="text"
                                value={cand.comment || ''}
                                placeholder="Viral Tag (e.g. Apex Launch)"
                                style={{
                                  width: 120,
                                  fontSize: 11,
                                  background: '#090f17',
                                  border: '1px solid #203144',
                                  borderRadius: 5,
                                  padding: '5px 8px',
                                  color: '#e2edf8',
                                }}
                                onChange={e => {
                                  const copy = [...candidates];
                                  copy[idx].comment = e.target.value;
                                  setCandidates(copy);
                                }}
                              />

                              <input
                                type="text"
                                value={cand.emoji || ''}
                                placeholder="🦈"
                                style={{
                                  width: 38,
                                  textAlign: 'center',
                                  fontSize: 13,
                                  background: '#090f17',
                                  border: '1px solid #203144',
                                  borderRadius: 5,
                                  padding: '5px 4px',
                                  color: '#fff',
                                }}
                                onChange={e => {
                                  const copy = [...candidates];
                                  copy[idx].emoji = e.target.value;
                                  setCandidates(copy);
                                }}
                              />
                            </div>
                          </div>

                          {/* Metrics row */}
                          <div className="candidate-metrics">
                            <span className="metric-pill views">
                              <Eye size={10} /> {cand.viewsFormatted || '25M'} Views
                            </span>
                            <span className="metric-pill likes">
                              <ThumbsUp size={10} /> {cand.likesFormatted || '1.8M'}
                            </span>
                            <span className="metric-pill score">
                              <Flame size={10} /> {cand.viralScore || 92}% Virality
                            </span>
                            <span className="metric-pill creator">
                              {cand.creator || '@creator'}
                            </span>
                          </div>

                          {/* Controls row */}
                          <div className="candidate-bottom-row">
                            <label style={{ fontSize: 10, color: '#7a8e9f', display: 'flex', alignItems: 'center', gap: 6 }}>
                              Duration:
                              <input
                                type="range"
                                min="2.5"
                                max="7.0"
                                step="0.5"
                                value={cand.duration}
                                onChange={e => {
                                  const copy = [...candidates];
                                  copy[idx].duration = parseFloat(e.target.value);
                                  setCandidates(copy);
                                }}
                                style={{ width: 80 }}
                              />
                              <b style={{ color: '#fff', fontSize: 10 }}>{cand.duration}s</b>
                            </label>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                              <span style={{ fontSize: 9, color: '#627588' }}>Rank Color:</span>
                              {['#facc15', '#38bdf8', '#ef4444', '#fb923c', '#ffffff'].map(c => (
                                <button
                                  key={c}
                                  onClick={() => {
                                    const copy = [...candidates];
                                    copy[idx].rankColor = c;
                                    setCandidates(copy);
                                  }}
                                  style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    background: c,
                                    border: cand.rankColor === c ? '2px solid #fff' : 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Actions (Reorder, Delete) */}
                        <div className="candidate-actions">
                          <button
                            className="icon"
                            title="Move Up"
                            disabled={idx === 0}
                            onClick={() => handleReorder(idx, -1)}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            className="icon"
                            title="Move Down"
                            disabled={idx === candidates.length - 1}
                            onClick={() => handleReorder(idx, 1)}
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            className="icon"
                            title="Reject clip"
                            onClick={() => handleDeleteCandidate(idx)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: TEMPLATE & SANDWICH STYLE */}
          {wizardStep === 2 && (
            <div>
              <b style={{ fontSize: 12, color: '#ecf3fa', display: 'block', marginBottom: 6 }}>
                3D Multi-Color Title Words (Click any word to change its viral accent color)
              </b>
              <div className="title-words-editor">
                {titleWords.map((tw, widx) => (
                  <button
                    key={widx}
                    className="word-color-chip"
                    style={{ color: tw.color }}
                    onClick={() => handleCycleWordColor(widx)}
                    title="Click to cycle color"
                  >
                    <span className="color-dot-indicator" style={{ background: tw.color }} />
                    {tw.text}
                  </button>
                ))}
              </div>

              <b style={{ fontSize: 12, color: '#ecf3fa', display: 'block', marginBottom: 10 }}>
                Choose Visual Ranking Template
              </b>
              <div className="template-grid" style={{ marginBottom: 18 }}>
                {templates.map(t => (
                  <div
                    key={t.id}
                    className={`template-card ${selectedTemplateId === t.id ? 'active' : ''}`}
                    onClick={() => setSelectedTemplateId(t.id)}
                  >
                    <div
                      className="template-preview-bar"
                      style={{
                        background: `radial-gradient(ellipse at 60% 110%, color-mix(in srgb, ${t.accent}, transparent 65%), #0f1622)`,
                      }}
                    >
                      <b style={{ fontSize: 13, color: '#fff' }}>{t.title}</b>
                      <span style={{ fontSize: 8, color: t.accent, letterSpacing: 2 }}>RANKING</span>
                      <i style={{ position: 'absolute', left: 10, top: 6, fontStyle: 'normal', color: t.accent, fontWeight: 800 }}>
                        #1
                      </i>
                    </div>
                    <div style={{ padding: 10 }}>
                      <strong style={{ fontSize: 11, display: 'block' }}>{t.name}</strong>
                      <small style={{ fontSize: 9, color: '#7a8c9e' }}>{t.description}</small>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <b style={{ fontSize: 11, color: '#9bb0c4', display: 'block', marginBottom: 6 }}>
                    Opening Retention Hook Text:
                  </b>
                  <input
                    type="text"
                    value={hookText}
                    onChange={e => setHookText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: 11,
                      background: '#121a26',
                      border: '1px solid #28394e',
                      borderRadius: 6,
                      color: '#facc15',
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div>
                  <b style={{ fontSize: 11, color: '#9bb0c4', display: 'block', marginBottom: 6 }}>
                    Creator Attribution (Bottom Banner):
                  </b>
                  <input
                    type="text"
                    value={creditsText}
                    onChange={e => setCreditsText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: 11,
                      background: '#121a26',
                      border: '1px solid #28394e',
                      borderRadius: 6,
                      color: '#dbe5ef',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#121a26', borderRadius: 8, border: '1px solid #203144' }}>
                <b style={{ fontSize: 11, color: '#ecf3fa' }}>Sandwich Canvas Theme:</b>
                <div className="layout-presets" style={{ margin: 0 }}>
                  {[
                    ['Full Black', '#000000'],
                    ['Dark Navy', '#0a1628'],
                    ['Charcoal', '#1a1a2e'],
                    ['Deep Purple', '#16082e'],
                  ].map(([name, color]) => (
                    <button
                      key={name}
                      className={`preset-chip ${selectedLayoutPreset === name ? 'active' : ''}`}
                      onClick={() => setSelectedLayoutPreset(name)}
                    >
                      <span className="color-dot" style={{ background: color }} />
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="wizard-footer">
          {wizardStep > 0 ? (
            <button
              className="secondary"
              onClick={() => dispatch({ type: 'SET_WIZARD_STEP', step: wizardStep - 1 })}
            >
              <ChevronLeft size={14} /> Back
            </button>
          ) : (
            <button
              className="secondary"
              onClick={() => dispatch({ type: 'SET_WIZARD_OPEN', open: false })}
            >
              Cancel
            </button>
          )}

          {wizardStep === 0 && (
            <button
              className="primary"
              disabled={loadingDiscovery || !topic.trim()}
              onClick={handleDiscoverViralVideos}
            >
              <Wand2 size={14} /> {loadingDiscovery ? 'Discovering Videos…' : 'Discover Viral Videos'}
            </button>
          )}

          {wizardStep === 1 && (
            <button
              className="primary"
              disabled={candidates.length === 0}
              onClick={() => dispatch({ type: 'SET_WIZARD_STEP', step: 2 })}
            >
              Approve Clips & Choose Style <ChevronRight size={14} />
            </button>
          )}

          {wizardStep === 2 && (
            <button
              className="primary"
              onClick={handleFinishAndAssemble}
            >
              <Film size={14} /> Assemble Video Project
            </button>
          )}
        </div>
      </div>

      {/* ── Preview Candidate Video Modal ── */}
      {previewCandidate && (
        <div
          className="wizard-overlay"
          style={{ zIndex: 120, background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setPreviewCandidate(null)}
        >
          <div
            style={{
              width: '520px',
              maxWidth: '90vw',
              background: '#0e1520',
              border: '1px solid #26384d',
              borderRadius: 14,
              padding: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <b style={{ fontSize: 13, color: '#fff' }}>{previewCandidate.title}</b>
              <button className="icon" onClick={() => setPreviewCandidate(null)}>
                <X size={15} />
              </button>
            </div>
            {previewCandidate.sourceUrl ? (
              <div style={{ borderRadius: 8, overflow: 'hidden', background: '#000', marginBottom: 12 }}>
                <iframe
                  src={previewCandidate.sourceUrl.replace('watch?v=', 'embed/').replace('/shorts/', '/embed/')}
                  title="Preview"
                  style={{ width: '100%', height: '360px', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <p style={{ color: '#7a8e9f', fontSize: 12 }}>No video stream URL available for preview.</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="secondary" onClick={() => setPreviewCandidate(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
