import { create } from 'zustand'

const YT_DEFAULTS = [
  { id: 'yt_1', nombre: 'Lofi Hip Hop Radio',     url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  { id: 'yt_2', nombre: 'Deep Focus Study Music', url: 'https://www.youtube.com/watch?v=n61ULEU7CO0' },
  { id: 'yt_3', nombre: 'Coding in the Rain',     url: 'https://www.youtube.com/watch?v=mPZkdNFkNps' },
  { id: 'yt_4', nombre: 'Peaceful Piano',         url: 'https://www.youtube.com/watch?v=1RmX7HCmBOQ' },
  { id: 'yt_5', nombre: 'Jazz Coffee Shop',       url: 'https://www.youtube.com/watch?v=Dx5qFachd3A' },
]

// Simple localStorage helpers — no middleware needed
function loadYtPlaylists() {
  try {
    const raw = localStorage.getItem('kairos-yt-playlists')
    return raw ? JSON.parse(raw) : YT_DEFAULTS
  } catch { return YT_DEFAULTS }
}

function saveYtPlaylists(list) {
  try { localStorage.setItem('kairos-yt-playlists', JSON.stringify(list)) } catch (_) {}
}

function loadActiveTab() {
  return localStorage.getItem('kairos-music-tab') || 'youtube'
}

export const useMusicStore = create((set) => ({
  // Panel
  showPlayer: false,
  activeTab:  loadActiveTab(),

  // ── Spotify ───────────────────────────────────────────────
  spotifyUser:      null,
  spotifyPlaylists: [],
  spotifyTrack:     null,
  spotifyPlaying:   false,
  spotifyDeviceId:  null,
  spotifyError:     null,

  // ── YouTube ───────────────────────────────────────────────
  ytPlaylists: loadYtPlaylists(),
  ytCurrent:   null,
  ytPlaying:   false,

  // ── Actions ───────────────────────────────────────────────
  setShowPlayer: (v)           => set({ showPlayer: v }),
  setActiveTab:  (v)           => { localStorage.setItem('kairos-music-tab', v); set({ activeTab: v }) },

  // Spotify
  setSpotifyUser:      (u) => set({ spotifyUser: u }),
  setSpotifyPlaylists: (p) => set({ spotifyPlaylists: p }),
  setSpotifyDeviceId:  (id) => set({ spotifyDeviceId: id }),
  setSpotifyError:     (e) => set({ spotifyError: e }),
  setSpotifyPlayback:  (track, playing, deviceId) =>
    set(s => ({
      spotifyTrack:    track,
      spotifyPlaying:  playing,
      spotifyDeviceId: deviceId ?? s.spotifyDeviceId,
      spotifyError:    null,
    })),
  setSpotifyPlaying: (v) => set({ spotifyPlaying: v }),
  clearSpotify: () =>
    set({ spotifyUser: null, spotifyPlaylists: [], spotifyTrack: null,
          spotifyPlaying: false, spotifyDeviceId: null, spotifyError: null }),

  // YouTube
  setYtCurrent: (playlist) => set({ ytCurrent: playlist, ytPlaying: !!playlist }),
  setYtPlaying: (v)        => set({ ytPlaying: v }),
  addYtPlaylist: (p) =>
    set(s => {
      const next = [...s.ytPlaylists, p]
      saveYtPlaylists(next)
      return { ytPlaylists: next }
    }),
  removeYtPlaylist: (id) =>
    set(s => {
      const next = s.ytPlaylists.filter(p => p.id !== id)
      saveYtPlaylists(next)
      return {
        ytPlaylists: next,
        ytCurrent:   s.ytCurrent?.id === id ? null : s.ytCurrent,
        ytPlaying:   s.ytCurrent?.id === id ? false : s.ytPlaying,
      }
    }),
}))
