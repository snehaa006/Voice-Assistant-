let isAwake = false;
let isListening = false;
let hasAnnouncedMicReady = false;
let sessionStarted = false;
let consecutiveFailures = 0;

// 🎯 Wake Phrases
const wakePhrases = [
  "hey sense", "hey senseai", "hey sensai", "hey sense ai", 
  "hey assistant", "hey voice", "sense", "senseai", "sensai", 
  "sense ai", "assistant", "voice", "activate", "start", "wake up", 
  "listen", "hello", "hi"
];

let wakeRecognizer, commandRecognizer;

// ✅ Status Bar
function createStatusBar() {
  const bar = document.createElement("div");
  bar.id = "voice-status-bar";
  bar.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 999999;
    padding: 12px 16px;
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    color: #00ff88;
    border-radius: 12px;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 8px 32px rgba(0, 255, 136, 0.3);
    border: 1px solid rgba(0, 255, 136, 0.2);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    min-width: 200px;
  `;
  bar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div id="status-icon" style="font-size: 16px;">🤖</div>
      <div id="status-text">Initializing...</div>
    </div>
  `;
  document.body.appendChild(bar);
  return bar;
}

const statusBar = createStatusBar();

function updateStatusBar(text, icon = "🤖") {
  if (!statusBar) return;
  const iconEl = statusBar.querySelector('#status-icon');
  const textEl = statusBar.querySelector('#status-text');
  if (iconEl) iconEl.textContent = icon;
  if (textEl) textEl.textContent = text;
  console.log("📢 Status:", text);
}

// 🗣️ Speech Function
function speak(text, callback) {
  console.log("🗣️ Speaking:", text);
  updateStatusBar(text, "🔊");
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 0.8;
  
  utterance.onend = () => {
    updateStatusBar(isAwake ? "Listening for command..." : "Say 'Hey Sense' to activate", 
                   isAwake ? "🎤" : "😴");
    if (callback) callback();
  };
  
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

// 🎤 Wake Word Recognition
function createWakeRecognizer() {
  const recog = new webkitSpeechRecognition();
  recog.continuous = true;
  recog.interimResults = true;
  recog.lang = "en-US";
  recog.maxAlternatives = 5;
  
  recog.onstart = () => {
    isListening = true;
    consecutiveFailures = 0;
    updateStatusBar("Listening for wake word...", "👂");
    console.log("🎤 Wake word detection started");
  };
  
  recog.onerror = (e) => {
    console.warn("❌ Wake recognition error:", e.error);
    consecutiveFailures++;
    
    if (e.error === "aborted") return;
    
    updateStatusBar("Restarting...", "⚠️");
    setTimeout(() => {
      if (!isAwake && consecutiveFailures < 3) {
        listenForWakeWord();
      }
    }, 1000);
  };
  
  recog.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      
      // Check all alternatives
      for (let j = 0; j < result.length; j++) {
        const text = result[j].transcript.trim().toLowerCase();
        
        console.log("🎧 Wake detection:", text);
        
        if (checkWakePhrase(text)) {
          console.log("✅ Wake word detected:", text);
          recog.stop();
          isAwake = true;
          sessionStarted = true;
          
          speak("Ready! What can I help you with?", () => {
            listenForCommand();
          });
          return;
        }
      }
    }
  };
  
  recog.onend = () => {
    isListening = false;
    console.log("🎤 Wake recognition ended");
    
    if (!isAwake) {
      setTimeout(() => {
        if (!isAwake && !isListening) {
          listenForWakeWord();
        }
      }, 500);
    }
  };
  
  return recog;
}

// 🎯 Wake Phrase Check
function checkWakePhrase(text) {
  // Direct matches
  for (const phrase of wakePhrases) {
    if (text.includes(phrase)) return true;
  }
  
  // Fuzzy matching
  const fuzzyMatches = [
    /hey\s*sen[sc]/, /\bsen[sc]e?\b/, /assist/, /voice/, 
    /wake/, /start/, /listen/, /hello/, /\bhi\b/
  ];
  
  return fuzzyMatches.some(regex => regex.test(text));
}

// 🎤 Command Recognition
function createCommandRecognizer() {
  const recog = new webkitSpeechRecognition();
  recog.continuous = false;
  recog.interimResults = false;
  recog.lang = "en-US";
  recog.maxAlternatives = 3;
  
  recog.onstart = () => {
    isListening = true;
    consecutiveFailures = 0;
    updateStatusBar("Listening for command...", "🎙️");
    console.log("🎤 Command listening started");
  };
  
  recog.onerror = (e) => {
    console.warn("❌ Command error:", e.error);
    
    if (e.error === "aborted") return;
    
    updateStatusBar("Command error, trying again...", "⚠️");
    setTimeout(() => {
      if (isAwake && !isListening) {
        listenForCommand();
      } else if (!isAwake && !isListening) {
        listenForWakeWord();
      }
    }, 1000);
  };
  
  recog.onresult = (event) => {
    const text = event.results[0][0].transcript.trim().toLowerCase();
    console.log("🎧 Command heard:", text);
    
    updateStatusBar("Processing: " + text, "🧠");
    handleCommand(text);
  };
  
  recog.onend = () => {
    isListening = false;
    console.log("🎤 Command recognition ended");
    
    // Go back to sleep mode
    setTimeout(() => {
      if (isAwake) {
        isAwake = false;
        updateStatusBar("Say 'Hey Sense' to activate", "😴");
        listenForWakeWord();
      }
    }, 1000);
  };
  
  return recog;
}

// 🛎️ Start Wake Word Detection
function listenForWakeWord() {
  if (isListening || isAwake) return;
  
  if (!sessionStarted) {
    updateStatusBar("Say 'Hey Sense' to activate", "😴");
  }
  
  try {
    wakeRecognizer = createWakeRecognizer();
    wakeRecognizer.start();
  } catch (e) {
    console.warn("Wake start error:", e);
    setTimeout(() => listenForWakeWord(), 2000);
  }
}

function listenForCommand() {
  if (isListening) return;
  
  try {
    commandRecognizer = createCommandRecognizer();
    commandRecognizer.start();
  } catch (e) {
    console.warn("Command start error:", e);
    setTimeout(() => {
      if (isAwake) listenForCommand();
      else listenForWakeWord();
    }, 1000);
  }
}

// 🧠 Core Command Handler
function handleCommand(cmd) {
  cmd = cmd.toLowerCase();
  console.log("🎯 Processing command:", cmd);
  
  // YouTube Search
  if (cmd.includes("search for") || cmd.includes("search")) {
    const query = cmd.replace(/search for|search/g, "").trim();
    if (query) {
      performYouTubeSearch(query);
    } else {
      speak("What should I search for?");
    }
    
  // Play First Video
  } else if (cmd.includes("play first video") || cmd.includes("play first")) {
    playFirstVideo();
    
  // Video Views
  } else if (cmd.includes("views") && cmd.includes("first")) {
    getFirstVideoViews();
    
  // Navigation Commands
  } else if (cmd.includes("scroll down") || cmd.includes("go down")) {
    window.scrollBy(0, window.innerHeight * 0.8);
    speak("Scrolled down");
    
  } else if (cmd.includes("scroll up") || cmd.includes("go up")) {
    window.scrollBy(0, -window.innerHeight * 0.8);
    speak("Scrolled up");
    
  } else if (cmd.includes("go back") || cmd.includes("back")) {
    window.history.back();
    speak("Going back");
    
  // Video Controls
  } else if (cmd.includes("forward") || cmd.includes("skip")) {
    skipVideo(10);
    
  } else if (cmd.includes("backward") || cmd.includes("rewind")) {
    skipVideo(-10);
    
  } else if (cmd.includes("play") && !cmd.includes("pause")) {
    playVideo();
    
  } else if (cmd.includes("pause")) {
    pauseVideo();
    
  // Page Summary
  } else if (cmd.includes("summarize") || cmd.includes("summary")) {
    summarizePage();
    
  // Website Navigation
  } else if (cmd.includes("open wikipedia") || cmd.includes("wikipedia")) {
    openWebsite("wikipedia.org");
    
  } else if (cmd.includes("open google") || cmd.includes("google")) {
    openWebsite("google.com");
    
  } else if (cmd.includes("youtube") && !cmd.includes("search")) {
    openWebsite("youtube.com");
    
  // Help
  } else if (cmd.includes("help") || cmd.includes("commands")) {
    speak("I can search YouTube, play videos, scroll pages, control video playback, and open websites like Wikipedia. Try saying 'search for cats' or 'play first video'.");
    
  } else {
    speak("I didn't understand. Try 'search for something', 'play first video', or 'help' for more commands.");
  }
}

// 🔍 YouTube Search Function
function performYouTubeSearch(query) {
  console.log("🔍 Searching YouTube for:", query);
  
  // Try to find YouTube search box
  const searchInput = document.querySelector("input#search") || 
                     document.querySelector("input[placeholder*='Search']") ||
                     document.querySelector("input[name='search_query']");
  
  if (searchInput) {
    searchInput.value = query;
    searchInput.focus();
    
    // Submit search
    const form = searchInput.closest("form");
    if (form) {
      form.submit();
    } else {
      searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    }
    
    speak(`Searching YouTube for ${query}`);
  } else {
    // Direct URL navigation
    window.location.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    speak(`Searching YouTube for ${query}`);
  }
}

// 🎬 Play First Video
function playFirstVideo() {
  const firstVideo = document.querySelector("ytd-video-renderer a#video-title") ||
                    document.querySelector("ytd-rich-item-renderer a#video-title") ||
                    document.querySelector("a#video-title");
  
  if (firstVideo) {
    firstVideo.click();
    speak("Playing first video");
  } else {
    speak("No videos found");
  }
}

// 📊 Get First Video Views
function getFirstVideoViews() {
  const firstVideo = document.querySelector("ytd-video-renderer") ||
                    document.querySelector("ytd-rich-item-renderer");
  
  if (firstVideo) {
    const views = firstVideo.querySelector("#metadata-line span") ||
                 firstVideo.querySelector(".style-scope.ytd-video-meta-block");
    
    if (views) {
      const viewText = views.textContent.trim();
      speak(`The first video has ${viewText}`);
    } else {
      speak("Views information not available");
    }
  } else {
    speak("No videos found");
  }
}

// 🎮 Video Controls
function playVideo() {
  const video = document.querySelector("video");
  if (video) {
    video.play();
    speak("Playing");
  } else {
    // Try clicking play button
    const playButton = document.querySelector("button[aria-label*='Play']") ||
                      document.querySelector(".ytp-play-button");
    if (playButton) {
      playButton.click();
      speak("Playing");
    } else {
      speak("No video found");
    }
  }
}

function pauseVideo() {
  const video = document.querySelector("video");
  if (video) {
    video.pause();
    speak("Paused");
  } else {
    // Try clicking pause button
    const pauseButton = document.querySelector("button[aria-label*='Pause']") ||
                       document.querySelector(".ytp-pause-button");
    if (pauseButton) {
      pauseButton.click();
      speak("Paused");
    } else {
      speak("No video found");
    }
  }
}

function skipVideo(seconds) {
  const video = document.querySelector("video");
  if (video) {
    video.currentTime += seconds;
    speak(`${seconds > 0 ? 'Forward' : 'Backward'} ${Math.abs(seconds)} seconds`);
  } else {
    // Use keyboard shortcuts
    if (seconds > 0) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    } else {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    }
    speak(`${seconds > 0 ? 'Forward' : 'Backward'} ${Math.abs(seconds)} seconds`);
  }
}

// 📄 Page Summary
function summarizePage() {
  const url = window.location.href;
  
  if (url.includes("youtube.com")) {
    if (url.includes("watch")) {
      // Single video page
      const title = document.querySelector("h1.ytd-video-primary-info-renderer") ||
                   document.querySelector("h1.title");
      const channel = document.querySelector("#channel-name a") ||
                     document.querySelector(".ytd-channel-name a");
      
      if (title && channel) {
        speak(`Video: ${title.textContent.trim()} by ${channel.textContent.trim()}`);
      } else {
        speak("Video page loaded");
      }
    } else {
      // Search results or homepage
      const videos = document.querySelectorAll("ytd-video-renderer, ytd-rich-item-renderer");
      let summary = `Found ${videos.length} videos. `;
      
      videos.slice(0, 3).forEach((video, index) => {
        const title = video.querySelector("#video-title")?.textContent?.trim();
        if (title) {
          summary += `${index + 1}: ${title}. `;
        }
      });
      
      speak(summary);
    }
  } else {
    const title = document.title;
    speak(`Page: ${title}`);
  }
}

// 🌐 Website Navigation
function openWebsite(url) {
  if (!url.startsWith("http")) {
    url = "https://" + url;
  }
  
  window.location.href = url;
  speak(`Opening ${url}`);
}

// 🚀 Initialize System
function initialize() {
  if (window._voiceAssistantInitialized) return;
  window._voiceAssistantInitialized = true;
  
  console.log("🚀 Initializing Voice Assistant...");
  
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => {
      if (!hasAnnouncedMicReady) {
        updateStatusBar("Voice Assistant Ready", "✅");
        speak("Voice assistant ready! Say 'Hey Sense' to activate.");
        hasAnnouncedMicReady = true;
      }
      
      // Start wake word detection
      setTimeout(() => {
        listenForWakeWord();
      }, 2000);
    })
    .catch(err => {
      console.error("Microphone access denied:", err);
      updateStatusBar("Microphone access denied", "❌");
      speak("Microphone access required. Please allow microphone access and refresh the page.");
    });
}

// 🔄 Auto-restart System
function setupAutoRestart() {
  // Monitor for broken recognition
  setInterval(() => {
    if (!isListening && !isAwake && consecutiveFailures < 3) {
      console.log("🔄 Auto-restart: Restarting wake word detection");
      listenForWakeWord();
    }
  }, 15000); // Check every 15 seconds
  
  // Handle visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (wakeRecognizer) wakeRecognizer.stop();
      if (commandRecognizer) commandRecognizer.stop();
      speechSynthesis.cancel();
    } else {
      setTimeout(() => {
        if (!isListening && !isAwake) {
          listenForWakeWord();
        }
      }, 1000);
    }
  });
}

// 🎬 Start System
function startSystem() {
  console.log('🎬 Starting Voice Assistant System...');
  setupAutoRestart();
  initialize();
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startSystem);
} else {
  startSystem();
}

console.log('✅ Voice Assistant Loaded - Demo Ready!');