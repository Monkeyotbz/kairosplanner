import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const YT_DEFAULTS = [
  { id: 'yt_1', nombre: 'Lofi Hip Hop Radio',     url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  { id: 'yt_2', nombre: 'Deep Focus Study Music', url: 'https://www.youtube.com/watch?v=n61ULEU7CO0' },
  { id: 'yt_3', nombre: 'Coding in the Rain',     url: 'https://www.youtube.com/watch?v=mPZkdNFkNps' },
  { id: 'yt_4', nombre: 'Peaceful Piano',         url: 'https://www.youtube.com/watch?v=1RmX7HCmBOQ' },
  { id: 'yt_5', nombre: 'Jazz Coffee Shop',       url: 'https://www.youtube.com/watch?v=Dx5qFachd3A' },
]

export const useMusicStore = create(
  persist(
    (set) => ({
      // Panel
      showPlayer: false,
      activeTab:  'youtube',   // 'spotify' | 'youtube'

      // ── Spotify ───────────────────────────────────────────
      spotifyUser:      null,
      spotifyPlaylists: [],
      spotifyTrack:     null,   // current Spotify.Track object
      spotifyPlaying:   false,
      spotifyDeviceId:  null,
      spotifyError:     null,

      // ── YouTube ───────────────────────────────────────────
      ytPlaylists: YT_DEFAULTS,
      ytCurrent:   null,        // { id, nombre, url }
      ytPlaying:   false,

      // ── Actions ───────────────────────────────────────────
      setShowPlayer: (v)           => set({ showPlayer: v }),
      setActiveTab:  (v)           => set({ activeTab: v }),

      // Spotify
      setSpotifyUser:  (u)         => set({ spotifyUser: u }),
      setSpotifyPlaylists: (p)     => set({ spotifyPlaylists: p }),
      setSpotifyDeviceId: (id)     => set({ spotifyDeviceId: id }),
      setSpotifyError: (e)         => set({ spotifyError: e }),
      setSpotifyPlayback: (track, playing, deviceId) =>
        set(s => ({
          spotifyTrack:    track,
          spotifyPlaying:  playing,
          spotifyDeviceId: deviceId ?? s.spotifyDeviceId,
          spotifyError:    null,
        })),
      setSpotifyPlaying: (v)       => set({ spotifyPlaying: v }),
      clearSpotify: ()             =>
        set({ spotifyUser: null, spotifyPlaylists: [], spotifyTrack: null,
              spotifyPlaying: false, spotifyDeviceId: null, spotifyError: null }),

      // YouTube
      setYtCurrent: (playlist)     => set({ ytCurrent: playlist, ytPlaying: !!playlist }),
      setYtPlaying:  (v)           => set({ ytPlaying: v }),
      addYtPlaylist: (p)           => set(s => ({ ytPlaylists: [...s.ytPlaylists, p] })),
      removeYtPlaylist: (id)       =>
        set(s => ({
          ytPlaylists: s.ytPlaylists.filter(p => p.id !== id),
          ytCurrent:   s.ytCurrent?.id === id ? null : s.ytCurrent,
          ytPlaying:   s.ytCurrent?.id === id ? false : s.ytPlaying,
        })),
    }),
    {
      name: 'kairos-music-v1',
      partialize: s => ({ ytPlaylists: s.ytPlaylists, activeTab: s.activeTab }),
    }
  )
)
