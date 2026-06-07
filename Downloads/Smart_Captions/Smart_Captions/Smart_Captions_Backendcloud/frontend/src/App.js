import React, { useState, useRef, useEffect } from "react";
import "./App.css";


const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000/api";

// 🌍 Comprehensive Language List
const LANGUAGES = [
  { code: "en", label: "🇺🇸 English" },
  { code: "ta", label: "🇮🇳 Tamil" },
  { code: "hi", label: "🇮🇳 Hindi" },
  { code: "ml", label: "🇮🇳 Malayalam" },
  { code: "te", label: "🇮🇳 Telugu" },
  { code: "sa", label: "🇮🇳 Sanskrit" },
  { code: "es", label: "🇪🇸 Spanish" },
  { code: "fr", label: "🇫🇷 French" },
  { code: "de", label: "🇩🇪 German" },
  { code: "it", label: "🇮🇹 Italian" },
  { code: "pt", label: "🇧🇷 Portuguese" },
  { code: "ru", label: "🇷🇺 Russian" },
  { code: "zh", label: "🇨🇳 Chinese (Mandarin)" },
  { code: "ja", label: "🇯🇵 Japanese" },
  { code: "ko", label: "🇰🇷 Korean" },
  { code: "ar", label: "🇸🇦 Arabic" }
];

function App() {
  const [video, setVideo] = useState(null);
  const [rawVideoUrl, setRawVideoUrl] = useState(null);
  const [originalFilename, setOriginalFilename] = useState("");
  const [captions, setCaptions] = useState([]);
  const [currentText, setCurrentText] = useState("");
  const [currentHighlight, setCurrentHighlight] = useState(""); 
  
  const [activeIndex, setActiveIndex] = useState(-1); 
  const [activeKaraokeIndex, setActiveKaraokeIndex] = useState(-1); 
  const [karaokeMode, setKaraokeMode] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isMerged, setIsMerged] = useState(false);
  
  const [sourceLanguage, setSourceLanguage] = useState(""); 
  const [targetLanguage, setTargetLanguage] = useState(""); 

  const [captionFont, setCaptionFont] = useState(""); 
  const [captionFontSize, setCaptionFontSize] = useState("15"); 

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isHooking, setIsHooking] = useState(false);
  const [isChunking, setIsChunking] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false); 
  const [isHighlighting, setIsHighlighting] = useState(false); 
  const [aiTone, setAiTone] = useState("viral");
  const [aiData, setAiData] = useState(null);
  
  const videoRef = useRef();
  const timelineRef = useRef(null); 

  /* -------- Upload & Transcribe -------- */
  const uploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setIsMerged(false);
    setAiData(null); 
    setActiveIndex(-1); 
    setActiveKaraokeIndex(-1);
    
    const formData = new FormData();
    if (sourceLanguage) formData.append("sourceLanguage", sourceLanguage);
    if (targetLanguage) formData.append("targetLanguage", targetLanguage);
    formData.append("video", file);

    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      const fetchedVideoUrl = `${API}/video/${data.file}`;
      
      setVideo(fetchedVideoUrl);
      setRawVideoUrl(fetchedVideoUrl); 
      setOriginalFilename(data.file);
      setCaptions(data.captions || []);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to process video.");
    } finally {
      setIsUploading(false);
    }
  };

  /* -------- PREVIEW SYNC ENGINE -------- */
  useEffect(() => {
    let animationFrameId;
    const syncCaptions = () => {
      if (!videoRef.current || captions.length === 0 || isMerged) return;
      const time = videoRef.current.currentTime;
      
      const currentIdx = captions.findIndex((c) => time >= c.start && time <= c.end);
      setActiveIndex(currentIdx); 

      if (currentIdx !== -1) {
        const cap = captions[currentIdx];
        setCurrentText(cap.text);
        setCurrentHighlight(cap.highlight || "");

        if (karaokeMode && cap.wordTimings && cap.wordTimings.length > 0) {
          const wordIdx = cap.wordTimings.findIndex(w => time >= w.start && time <= w.end);
          setActiveKaraokeIndex(wordIdx);
        } else {
          setActiveKaraokeIndex(-1);
        }

      } else {
        setCurrentText("");
        setCurrentHighlight("");
        setActiveKaraokeIndex(-1);
      }
      
      animationFrameId = requestAnimationFrame(syncCaptions);
    };
    
    if (!isMerged) {
      animationFrameId = requestAnimationFrame(syncCaptions);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [captions, isMerged, karaokeMode]);

  /* -------- Auto-Scroll Timeline -------- */
  useEffect(() => {
    if (activeIndex !== -1 && timelineRef.current && !isMerged) {
      const rowElements = timelineRef.current.querySelectorAll('.caption-row');
      if (rowElements[activeIndex]) {
        rowElements[activeIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'center', 
        });
      }
    }
  }, [activeIndex, isMerged]);

  /* -------- Editor Tools -------- */
  const updateCaptionText = (index, value) => {
    const updated = [...captions];
    updated[index].text = value;
    setCaptions(updated);
  };
  const deleteCaption = (index) => {
    const updated = captions.filter((_, i) => i !== index);
    setCaptions(updated);
  };
  const mergeWithPrevious = (index) => {
    if (index === 0) return; 
    const updated = [...captions];
    const prev = updated[index - 1];
    const curr = updated[index];
    prev.text = `${prev.text} ${curr.text}`.trim();
    prev.end = curr.end;
    updated.splice(index, 1);
    setCaptions(updated);
  };
  const updateHighlight = (index, value) => {
    const updated = [...captions];
    updated[index].highlight = value.trim();
    setCaptions(updated);
  };

  /* -------- Merge to FFmpeg -------- */
  const mergeCaptions = async () => {
    if (!captionFont) {
      alert("Please select a Font Style before merging!");
      return;
    }
    setIsMerging(true);
    try {
      const res = await fetch(`${API}/update-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          videoName: originalFilename, 
          captions: captions,
          fontName: captionFont,          
          fontSize: captionFontSize,
          isKaraoke: karaokeMode 
        }),
      });

      if (!res.ok) throw new Error("Backend failed to merge.");

      const data = await res.json();
      setVideo(`${API}/video/${data.file}`); 
      setIsMerged(true);
      setActiveIndex(-1); 
      setActiveKaraokeIndex(-1);
    } catch (error) {
      console.error("Merge failed", error);
      alert("⚠️ Failed to merge captions.");
    } finally {
      setIsMerging(false);
    }
  };

  const handleEditAgain = () => {
    setIsMerged(false); 
    setVideo(rawVideoUrl); 
  };

  const downloadVideo = async () => {
    if (!video) return;
    try {
      const response = await fetch(video);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `Captioned_Video_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed", error);
    }
  };

  /* -------- AI Content Generation -------- */
  const generateAIContent = async () => {
    if (captions.length === 0) return alert("No captions available.");
    setIsGeneratingAI(true);
    try {
      const res = await fetch(`${API}/ai/generate-social-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions, tone: aiTone }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiData(data);
    } catch (error) {
      alert("Failed to generate AI content.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const rewriteCaptions = async () => {
    if (captions.length === 0) return;
    setIsRewriting(true);
    try {
      const res = await fetch(`${API}/ai/rewrite-transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions, tone: "clear and punchy" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      const updatedCaptions = captions.map((cap, index) => ({
        ...cap,
        text: data.rewrittenText[index] || cap.text 
      }));
      setCaptions(updatedCaptions);
    } catch (err) {
      alert("⚠️ Failed to auto-fix grammar.");
    } finally {
      setIsRewriting(false);
    }
  };

  const highlightKeywords = async () => {
    if (captions.length === 0) return;
    setIsHighlighting(true); 
    try {
      const res = await fetch(`${API}/ai/highlight-keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      const updatedCaptions = captions.map((cap, index) => ({
        ...cap,
        highlight: data.keywords[index] || ""
      }));
      setCaptions(updatedCaptions);
    } catch (err) {
      alert("⚠️ AI Highlighting failed.");
    } finally {
      setIsHighlighting(false);
    }
  };

  const generateHook = async () => {
    if (captions.length === 0) return alert("No captions available.");
    setIsHooking(true);
    try {
      const res = await fetch(`${API}/ai/generate-hook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions, tone: aiTone }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiData((prev) => ({ ...(prev || {}), hook: data.hook }));
    } catch (error) {
      alert("Failed to generate hook.");
    } finally {
      setIsHooking(false);
    }
  };

  const smartChunkCaptions = async () => {
    if (captions.length === 0) return alert("No captions available.");
    setIsChunking(true);
    try {
      const res = await fetch(`${API}/ai/chunk-captions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions, minWords: 3, maxWords: 5 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const chunkedCaptions = data.chunkedCaptions || captions;
      const hasChanged = JSON.stringify(chunkedCaptions) !== JSON.stringify(captions);
      setCaptions(chunkedCaptions);
      setAiData((prev) => ({
        ...(prev || {}),
        chunked: hasChanged,
        chunkingNotice: hasChanged ? "Captions were smartly split into shorter 3–5 word segments." : "Captions are already in short, punchy segments." 
      }));
    } catch (error) {
      console.error(error);
      alert("⚠️ Smart caption chunking failed.");
    } finally {
      setIsChunking(false);
    }
  };

  /* -------- RENDER STYLED TEXT -------- */
  const renderStyledText = () => {
    if (activeIndex === -1 || !captions[activeIndex]) return null;
    const cap = captions[activeIndex];

    if (karaokeMode && cap.wordTimings && cap.wordTimings.length > 0) {
      return cap.wordTimings.map((w, i) => {
        const isSpokenNow = i === activeKaraokeIndex;
        const cleanWord = w.word.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanHighlight = currentHighlight ? currentHighlight.toLowerCase().replace(/[^a-z0-9]/g, '') : "";
        const isStaticHighlight = cleanHighlight && cleanWord === cleanHighlight;

        let color = "white";
        let transform = "scale(1)";
        let opacity = "0.9";
        let textShadow = "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 4px 4px 6px rgba(0,0,0,0.6)";

        if (isSpokenNow) {
          color = "#FACC15";         
          transform = "scale(1.2)";  
          opacity = "1";
        } else if (isStaticHighlight) {
          color = "#38BDF8";         
        }

        return (
          <span 
            key={i} 
            style={{ 
              color, 
              opacity,
              display: "inline-block", 
              marginRight: "8px", 
              transition: "transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.1s", 
              transform,
              textShadow,
              textTransform: "uppercase" 
            }}
          >
            {w.word}
          </span>
        );
      });
    }

    if (!currentHighlight) return (
      <span style={{ textShadow: "2px 2px 0 #000, 4px 4px 6px rgba(0,0,0,0.6)", textTransform: "uppercase" }}>
        {currentText}
      </span>
    );
    
    const parts = currentText.split(new RegExp(`\\b(${currentHighlight})\\b`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === currentHighlight.toLowerCase() ? 
      <span key={i} style={{ color: '#FACC15', textShadow: "2px 2px 0 #000, 4px 4px 6px rgba(0,0,0,0.6)", textTransform: "uppercase" }}>{part}</span> : 
      <span key={i} style={{ textShadow: "2px 2px 0 #000, 4px 4px 6px rgba(0,0,0,0.6)", textTransform: "uppercase" }}>{part}</span>
    );
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo-container">
          <span className="logo-icon">🎬</span>
          <h1 className="title">Smart Caption Studio</h1>
        </div>
        <p className="subtitle">Upload, edit, and burn viral captions seamlessly.</p>
      </header>

      {!video && (
        <div className="upload-section glass-card">
          <div className="language-row">
            <div className="language-picker">
              <label>🗣️ Spoken Language</label>
              {/* 🚀 Changed to map from the LANGUAGES array and updated default text */}
              <select className="modern-select" value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
                <option value="">🌍 Auto-Detect</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </div>
            <div className="language-picker">
              <label>📝 Translation (Optional)</label>
              {/* 🚀 Changed to map from the LANGUAGES array and updated default text */}
              <select className="modern-select" value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
                <option value="">🚫 Keep Original</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <input type="file" id="file-upload" accept="video/*" onChange={uploadVideo} hidden />
            <label htmlFor="file-upload" className="primary-btn pulse-hover">
              {isUploading ? "⏳ Transcribing Audio..." : "📤 Select Video to Auto-Caption"}
            </label>
          </div>
        </div>
      )}

      {video && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '350px minmax(0, 1fr)', 
          gap: '30px', 
          width: '100%', 
          maxWidth: '1200px', 
          margin: '0 auto', 
          paddingBottom: '60px' 
        }}>
          
          {/* ================= TOP LEFT: Video Player ================= */}
          <div className="video-section glass-card" style={{ height: '550px', display: 'flex', flexDirection: 'column', padding: '16px' }}>
            <div className="video-wrapper" style={{ flex: 1, position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
              <video 
                ref={videoRef} 
                src={video} 
                controls 
                autoPlay 
                muted 
                playsInline 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
              
              {!isMerged && currentText && (
                <div className="viral-caption-overlay" style={{ 
                  width: '90%', 
                  textAlign: 'center',
                  bottom: '15%',
                  position: 'absolute'
                }}>
                  <span 
                    className="viral-text" 
                    style={{ 
                      fontFamily: captionFont || 'sans-serif', // Fallback if none selected
                      fontSize: `${captionFontSize}px`,
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      fontWeight: '900',
                      lineHeight: '1.2'
                    }}
                  >
                    {renderStyledText()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ================= TOP RIGHT: Timeline Editor ================= */}
          <div className="tools-section glass-card" style={{ height: '550px', display: 'flex', flexDirection: 'column', padding: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', flexShrink: 0 }}>
              <h2 style={{ margin: 0 }}>📝 Timeline Editor</h2>
              {!isMerged && captions.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="secondary-btn" onClick={rewriteCaptions} disabled={isRewriting || isHighlighting} style={{ height: '32px', fontSize: '0.85rem', padding: '0 12px' }}>
                    {isRewriting ? "⏳..." : "✨ Grammar"}
                  </button>
                  <button className="secondary-btn" onClick={highlightKeywords} disabled={isRewriting || isHighlighting} style={{ height: '32px', fontSize: '0.85rem', padding: '0 12px', background: '#0284C7' }}>
                    {isHighlighting ? "⏳..." : "💡 Auto-Highlight"}
                  </button>
                </div>
              )}
            </div>
            
            <div className="timeline-scroll-area" ref={timelineRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '10px' }}>
              {captions.map((cap, index) => {
                const isActive = index === activeIndex;

                return (
                  <div key={index} className="caption-row"
                    style={{
                      border: isActive ? '2px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: isActive ? '0 0 15px rgba(56, 189, 248, 0.2)' : 'none',
                      backgroundColor: isActive ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                      transition: 'all 0.3s ease',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '10px'
                    }}
                  >
                    <div className="caption-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="timestamp-badge" style={{ background: isActive ? '#38BDF8' : 'rgba(255, 255, 255, 0.1)', color: isActive ? '#0f172a' : '#94A3B8' }}>
                          {Number(cap.start).toFixed(1)}s - {Number(cap.end).toFixed(1)}s
                        </span>
                        
                        {!isMerged && (
                          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(250, 204, 21, 0.1)', borderRadius: '4px', padding: '2px 6px' }}>
                            <span style={{ fontSize: '0.8rem', marginRight: '4px' }}>⭐</span>
                            <input type="text" value={cap.highlight || ""} onChange={(e) => updateHighlight(index, e.target.value)} placeholder="Highlight..." style={{ background: 'transparent', border: 'none', color: '#FACC15', outline: 'none', fontSize: '0.8rem', width: '90px', fontWeight: 'bold' }} />
                          </div>
                        )}
                      </div>
                      
                      {!isMerged && (
                        <div className="action-buttons">
                          {index > 0 && <button onClick={() => mergeWithPrevious(index)} className="icon-btn" title="Merge up">🔗</button>}
                          <button onClick={() => deleteCaption(index)} className="icon-btn delete" title="Delete">🗑️</button>
                        </div>
                      )}
                    </div>
                    <textarea
                      className="modern-textarea"
                      value={cap.text}
                      onChange={(e) => updateCaptionText(index, e.target.value)}
                      disabled={isMerged}
                      rows="2"
                      style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ flexShrink: 0, marginTop: '16px' }}>
              {!isMerged && (
                <div className="style-dashboard" style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    
                    <div className="style-group" style={{ flex: '0 0 auto' }}>
                      <button 
                         onClick={() => setKaraokeMode(!karaokeMode)}
                         style={{
                           background: karaokeMode ? '#FACC15' : 'rgba(255,255,255,0.1)',
                           color: karaokeMode ? '#000' : '#fff',
                           border: 'none',
                           padding: '0 20px',
                           height: '42px', 
                           borderRadius: '8px', 
                           fontSize: '0.85rem',
                           fontWeight: 'bold',
                           cursor: 'pointer',
                           display: 'flex',
                           alignItems: 'center',
                           gap: '8px',
                           transition: 'all 0.2s',
                           whiteSpace: 'nowrap'
                         }}
                      >
                        {karaokeMode ? "🎤 Emerge Style: ON" : "🎤 Emerge Style: OFF"}
                      </button>
                    </div>

                    <div className="style-group" style={{ flex: 1, minWidth: '150px' }}>

                      <select className="modern-select small-select" value={captionFont} onChange={(e) => setCaptionFont(e.target.value)}>
                        <option value="" disabled>Select Font Style</option>
                        <option value="Impact">Impact (Viral)</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Oswald">Oswald</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Lato">Lato</option>
                        <option value="Poppins">Poppins</option>
                        <option value="Latha">Latha (Tamil)</option>
                        <option value="Arial">Arial</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Courier New">Courier</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Comic Sans MS">Comic Sans</option>
                        <option value="Trebuchet MS">Trebuchet</option>
                      </select>
                    </div>
                    
                    <div className="style-group" style={{ flex: 1, minWidth: '150px' }}>
                      <label>📏 Size: {captionFontSize}px</label>
                      <input type="range" min="10" max="48" className="modern-slider" value={captionFontSize} onChange={(e) => setCaptionFontSize(e.target.value)} />
                    </div>

                  </div>
                </div>
              )}

              <div className="export-controls" style={{ marginTop: '16px' }}>
                {!isMerged ? (
                  <button className="primary-btn full-width" onClick={mergeCaptions} disabled={isMerging}>
                    {isMerging ? "🔥 Burning Subtitles (This takes a moment)..." : "✨ Merge Captions & Export"}
                  </button>
                ) : (
                  <div className="success-panel">
                    <div className="success-banner">✅ Video Merged Successfully!</div>
                    <div className="btn-group">
                      <button className="download-btn" onClick={downloadVideo}>⬇️ Download</button>
                      <button className="secondary-btn" onClick={handleEditAgain}>✏️ Edit Again</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= BOTTOM ROW: AI CREATOR TOOLS ================= */}
          <div className="ai-card glass-card" style={{ gridColumn: '1 / -1', padding: '24px', marginTop: '10px' }}>
            <div className="card-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>🤖 AI Creator Tools</h2>
            </div>
            <div className="ai-controls-row" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select className="modern-select" style={{ width: '240px', flex: 'none', margin: 0 }} value={aiTone} onChange={(e) => setAiTone(e.target.value)}>
                <option value="viral">🔥 Viral & Punchy</option>
                <option value="gen z slang">💅 Gen Z Energy</option>
                <option value="y2k aesthetic">💿 2K Aesthetic</option>
                <option value="90s nostalgic">📼 90s Nostalgic</option>
                <option value="storytelling">📖 Storytelling</option>
                <option value="professional">💼 Professional</option>
              </select>

              <button className="magic-btn" onClick={generateAIContent} disabled={isGeneratingAI || captions.length === 0} style={{ padding: '0 28px', flex: 'none', margin: 0, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isGeneratingAI ? "⏳ Thinking..." : "✨ Generate Post"}
              </button>

              <button className="secondary-btn" onClick={generateHook} disabled={isHooking || captions.length === 0} style={{ padding: '0 20px', height: '42px' }}>
                {isHooking ? "⏳ Hooking..." : "🎯 Generate Hook"}
              </button>

              <button className="secondary-btn" onClick={smartChunkCaptions} disabled={isChunking || captions.length === 0} style={{ padding: '0 20px', height: '42px', background: '#9333EA' }}>
                {isChunking ? "⏳ Chunking..." : "✂️ Smart Chunk"}
              </button>
            </div>
            
            {aiData && (
              <div className="ai-results-box" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px' }}>
                {aiData.hook && <div className="result-item" style={{ margin: 0 }}><span className="result-label" style={{ color: '#FACC15', fontWeight: 'bold' }}>🎯 Hook:</span><p className="result-text hook-text" style={{ margin: '4px 0 0 0' }}>{aiData.hook}</p></div>}
                {aiData.description && <div className="result-item" style={{ margin: 0 }}><span className="result-label" style={{ color: '#F59E0B', fontWeight: 'bold' }}>📝 Short Description:</span><p className="result-text" style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>{aiData.description}</p></div>}
                {aiData.socialCaption && <div className="result-item" style={{ margin: 0 }}><span className="result-label" style={{ color: '#38BDF8', fontWeight: 'bold' }}>📣 Caption:</span><p className="result-text" style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>{aiData.socialCaption}</p></div>}
                {aiData.hashtags && <div className="result-item" style={{ margin: 0 }}><p className="result-hashtags" style={{ margin: 0, color: '#A78BFA' }}>{Array.isArray(aiData.hashtags) ? aiData.hashtags.join(" ") : aiData.hashtags}</p></div>}
                {aiData.chunkingNotice && <div className="result-item" style={{ margin: 0 }}><span className="result-label" style={{ color: '#A5B4FC', fontWeight: 'bold' }}>✂️ Smart Chunking:</span><p className="result-text" style={{ margin: '4px 0 0 0' }}>{aiData.chunkingNotice}</p></div>}
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}

export default App;