import { useState } from 'react';
import {
  Sparkles, X, ChevronRight, ChevronLeft, Check, Layers,
  LayoutTemplate, Film, Wand2, Plus, Trash2, ArrowRight
} from 'lucide-react';
import { useStore } from '../store';
import { api } from '../api';
import type { Template } from '../types';

interface RankDraftItem {
  rank: number;
  label: string;
  duration: number;
  description: string;
}

const INSPIRATION_CHIPS = [
  'Top 5 Unreal Cat Moments',
  'Top 5 Impossible Gym Fails',
  'Top 5 Craziest Skate Tricks',
  'Top 5 Scariest Rollercoasters',
  'Top 5 Viral TikTok Dances',
  'Top 5 Mind-Blowing Science Facts',
];

export default function Wizard() {
  const { state, dispatch } = useStore();
  const { wizardOpen, wizardStep, templates, project } = state;

  const [topic, setTopic] = useState('Top 5 Unreal Cat Moments');
  const [platform, setPlatform] = useState('YouTube Shorts');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [itemCount, setItemCount] = useState(5);
  const [hookText, setHookText] = useState('WAIT FOR NUMBER ONE 🐈');
  const [selectedTemplateId, setSelectedTemplateId] = useState('cats');
  const [selectedLayoutPreset, setSelectedLayoutPreset] = useState('Full Black');
  const [loadingAi, setLoadingAi] = useState(false);

  const [items, setItems] = useState<RankDraftItem[]>([
    { rank: 5, label: 'Swimming Cat Fail', duration: 3.5, description: 'Hilarious miscalculation' },
    { rank: 4, label: 'Laser Pointer Drift', duration: 3.2, description: 'Instant Tokyo drift move' },
    { rank: 3, label: 'The Cucumber Jump', duration: 3.0, description: 'Zero gravity takeoff' },
    { rank: 2, label: 'Keyboard Typist Cat', duration: 3.8, description: 'Working overtime' },
    { rank: 1, label: 'The Ultimate Plot Twist', duration: 4.2, description: 'Unbelievable jump save' },
  ]);

  if (!wizardOpen) return null;

  const handleGenerateAi = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch(`${api.baseUrl}/ai/generate-ranking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          platform,
          itemCount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.title) setTopic(data.title);
        if (data.hookText) setHookText(data.hookText);
        if (Array.isArray(data.items)) {
          setItems(
            data.items.map((it: any, i: number) => ({
              rank: data.items.length - i,
              label: it.label || `Rank ${data.items.length - i}`,
              duration: it.duration || 3.5,
              description: it.description || '',
            }))
          );
        }
        if (data.templateId) setSelectedTemplateId(data.templateId);
        dispatch({ type: 'SET_NOTICE', message: 'AI ranking generated!' });
        dispatch({ type: 'SET_WIZARD_STEP', step: 1 });
      } else {
        fallbackGenerate();
      }
    } catch {
      fallbackGenerate();
    } finally {
      setLoadingAi(false);
    }
  };

  const fallbackGenerate = () => {
    const title = topic.trim() || 'Top 5 Moments';
    const cleanTopic = title.replace(/^top\s*\d+\s*/i, '');
    setHookText(`WAIT TILL YOU SEE #1! 😱`);
    const newItems: RankDraftItem[] = [];
    for (let i = itemCount; i >= 1; i--) {
      newItems.push({
        rank: i,
        label: i === 1 ? `The Greatest ${cleanTopic}` : `${cleanTopic} #${i}`,
        duration: 3.2 + (itemCount - i) * 0.2,
        description: `Highlight ranked at #${i}`,
      });
    }
    setItems(newItems);
    dispatch({ type: 'SET_NOTICE', message: 'AI generated ranking outline!' });
    dispatch({ type: 'SET_WIZARD_STEP', step: 1 });
  };

  const finishWizard = () => {
    dispatch({ type: 'COMMIT' });
    const chosenTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
    const accent = chosenTemplate?.accent || '#22d3ee';

    // Pair available video assets with ranking entries
    const videoAssets = state.assets.filter(a => a.type === 'video');
    const audioAssets = state.assets.filter(a => a.type === 'audio');

    // Build clips from items
    const clips = items.map((it, idx) => {
      const assignedAsset = videoAssets[idx % Math.max(1, videoAssets.length)] || null;
      return {
        id: crypto.randomUUID(),
        assetId: assignedAsset ? assignedAsset.id : null,
        name: assignedAsset ? assignedAsset.name : `${it.label}.mp4`,
        url: assignedAsset ? assignedAsset.url : undefined,
        sourceStart: 0,
        sourceEnd: it.duration,
        duration: it.duration,
        label: it.label,
        rank: it.rank,
        color: idx === items.length - 1 ? accent : '#ffffff',
        description: it.description,
        speed: 1.0,
        adjustments: { brightness: 100, contrast: 100, saturation: 100 },
      };
    });

    // Layout preset colors
    let bgColor = '#000000';
    if (selectedLayoutPreset === 'Dark Navy') bgColor = '#0a1628';
    if (selectedLayoutPreset === 'Charcoal') bgColor = '#1a1a2e';
    if (selectedLayoutPreset === 'Deep Purple') bgColor = '#16082e';

    const bgMusicId = audioAssets[0]?.id || project.musicAssetId || null;

    dispatch({
      type: 'UPDATE_PROJECT',
      payload: {
        name: topic,
        title: topic,
        hookText,
        aspectRatio,
        templateId: selectedTemplateId,
        titleColor: '#ffffff',
        accentColor: accent,
        platform,
        clips,
        musicAssetId: bgMusicId,
        layout: {
          ...project.layout,
          canvasBackground: bgColor,
          topRegion: {
            ...project.layout.topRegion,
            backgroundColor: bgColor,
            title: topic,
            subtitle: platform,
          },
          bottomRegion: {
            ...project.layout.bottomRegion,
            backgroundColor: bgColor,
            caption: hookText,
            creatorHandle: '@RankForgeCreator',
          },
        },
      },
    });

    dispatch({ type: 'SET_WIZARD_OPEN', open: false });
    dispatch({ type: 'SET_NOTICE', message: 'Project created from wizard with footage paired!' });
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
            { num: 2, label: 'Rank Entries' },
            { num: 3, label: 'Sandwich Style' },
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
                  <b style={{ fontSize: 13, color: '#e7f0fa' }}>What ranking video do you want to create?</b>
                </div>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Top 5 Most Dangerous Water Slides in the World"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 13,
                    background: '#090e15',
                    border: '1px solid #233448',
                    borderRadius: 7,
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
                    <option value={5}>Top 5</option>
                    <option value={7}>Top 7</option>
                    <option value={10}>Top 10</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: RANK ENTRIES */}
          {wizardStep === 1 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: '#9bb0c4', display: 'block', marginBottom: 5 }}>
                  Opening Hook Text (shown at 00:00 - 00:01.8 to maximize retention):
                </label>
                <input
                  type="text"
                  value={hookText}
                  onChange={e => setHookText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 12,
                    background: '#121a26',
                    border: '1px solid #28394e',
                    borderRadius: 6,
                    color: '#facc15',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <b style={{ fontSize: 12, color: '#ecf3fa' }}>Ranked Items ({items.length})</b>
                <button
                  className="small-btn"
                  onClick={() => {
                    const nextRank = items.length + 1;
                    setItems([
                      ...items,
                      { rank: nextRank, label: `New Rank #${nextRank}`, duration: 3.5, description: '' },
                    ]);
                  }}
                >
                  <Plus size={13} /> Add Item
                </button>
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="rank-item-card">
                  <span className="rank-item-num">#{it.rank}</span>
                  <div className="rank-item-fields">
                    <input
                      type="text"
                      value={it.label}
                      placeholder="Title / Moment name"
                      onChange={e => {
                        const copy = [...items];
                        copy[idx].label = e.target.value;
                        setItems(copy);
                      }}
                    />
                    <input
                      type="text"
                      value={it.description}
                      placeholder="Short description / commentary"
                      onChange={e => {
                        const copy = [...items];
                        copy[idx].description = e.target.value;
                        setItems(copy);
                      }}
                    />
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="30"
                    value={it.duration}
                    onChange={e => {
                      const copy = [...items];
                      copy[idx].duration = parseFloat(e.target.value) || 3;
                      setItems(copy);
                    }}
                    style={{ width: 60, padding: '5px 7px', background: '#0b1119', border: '1px solid #223246', color: '#fff', fontSize: 11, borderRadius: 4 }}
                    title="Duration in seconds"
                  />
                  <button
                    className="icon"
                    title="Remove item"
                    disabled={items.length <= 1}
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* STEP 3: TEMPLATE & SANDWICH STYLE */}
          {wizardStep === 2 && (
            <div>
              <b style={{ fontSize: 12, color: '#ecf3fa', display: 'block', marginBottom: 10 }}>
                Choose Visual Template
              </b>
              <div className="template-grid" style={{ marginBottom: 20 }}>
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

              <b style={{ fontSize: 12, color: '#ecf3fa', display: 'block', marginBottom: 8 }}>
                Sandwich Canvas Theme
              </b>
              <div className="layout-presets">
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
              Skip to Editor
            </button>
          )}

          {wizardStep === 0 && (
            <button
              className="primary"
              disabled={loadingAi}
              onClick={handleGenerateAi}
            >
              <Wand2 size={14} /> {loadingAi ? 'Generating Idea…' : 'Generate with AI'}
            </button>
          )}

          {wizardStep === 1 && (
            <button
              className="primary"
              onClick={() => dispatch({ type: 'SET_WIZARD_STEP', step: 2 })}
            >
              Next: Select Style <ChevronRight size={14} />
            </button>
          )}

          {wizardStep === 2 && (
            <button
              className="primary"
              onClick={finishWizard}
            >
              <Check size={14} /> Launch Video Project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
