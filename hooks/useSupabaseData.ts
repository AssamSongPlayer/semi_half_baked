import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, DatabaseSong, DatabasePlaylist } from '@/lib/supabase'
import { Song, Playlist } from '@/types'

export function useSupabaseData(user: User | null) {
  const [songs, setSongs] = useState<Song[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [likedSongs, setLikedSongs] = useState<Set<number>>(new Set())
  const [lastPlayedSong, setLastPlayedSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentSongStartTime, setCurrentSongStartTime] = useState<Date | null>(null)
  const currentSongRef = useRef<string | null>(null)

  // Convert database song to UI song format
  const convertDatabaseSong = (dbSong: DatabaseSong, isLiked: boolean = false): Song => ({
    file_id: dbSong.file_id,
    img_id: dbSong.img_id,
    name: dbSong.name,
    artist: dbSong.artist,
    language: dbSong.language,
    tags: dbSong.tags,
    views: dbSong.views,
    likes: dbSong.likes,
    id: dbSong.file_id.toString(),
    image: `https://images.pexels.com/photos/${dbSong.img_id}/pexels-photo-${dbSong.img_id}.jpeg?auto=compress&cs=tinysrgb&w=300`,
    isLiked
  })

  // Fetch all songs
  const fetchSongs = async () => {
    if (!user) {
      setSongs([])
      return
    }
    
    try {
      const { data: songsData, error } = await supabase
        .from('songs')
        .select('*')
        .order('views', { ascending: false })

      if (error) throw error

      let userLikedSongs = new Set<number>()
      
      const { data: likedData } = await supabase
        .from('liked_songs')
        .select('song_id')
        .eq('user_id', user.id)
      
      if (likedData) {
        userLikedSongs = new Set(likedData.map(item => item.song_id))
        setLikedSongs(userLikedSongs)
      }

      const convertedSongs = songsData?.map(song => 
        convertDatabaseSong(song, userLikedSongs.has(song.file_id))
      ) || []

      const sortedSongs = [...convertedSongs].sort((a, b) => {
        const aScore = a.views + a.likes;
        const bScore = b.views + b.likes;
        return bScore - aScore;
      });

      setSongs(sortedSongs);

      const { data: userData } = await supabase
        .from('users')
        .select('last_song_file_id')
        .eq('id', user.id)
        .single()

      if (userData?.last_song_file_id) {
        const lastSong = convertedSongs.find(song => song.file_id === userData.last_song_file_id)
        if (lastSong) {
          setLastPlayedSong(lastSong)
        }
      }
    } catch (error) {
      console.error('Error fetching songs:', error)
      setSongs([]) // Set empty array on error
    }
  }

  // Fetch user playlists
  const fetchPlaylists = async () => {
    if (!user) {
      setPlaylists([])
      return
    }

    try {
      const { data: playlistsData, error } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          playlist_songs (
            songs (*)
          )
        `)
        .eq('user_id', user.id)

      if (error) throw error

      const convertedPlaylists: Playlist[] = playlistsData?.map(playlist => {
        const playlistSongs = playlist.playlist_songs?.map((ps: any) => 
          convertDatabaseSong(ps.songs, likedSongs.has(ps.songs.file_id))
        ) || []

        return {
          id: playlist.id.toString(),
          name: playlist.name,
          songCount: playlistSongs.length,
          image: playlistSongs[0]?.image || 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=300',
          songs: playlistSongs
        }
      }) || []

      setPlaylists(convertedPlaylists)
    } catch (error) {
      console.error('Error fetching playlists:', error)
    }
  }

  // Toggle like song
  const toggleLike = async (songId: string) => {
  if (!user) return;

  const songFileId = parseInt(songId);
  const isCurrentlyLiked = likedSongs.has(songFileId);

  try {
    if (isCurrentlyLiked) {
      // Remove from liked_songs
      const { error } = await supabase
        .from('liked_songs')
        .delete()
        .eq('user_id', user.id)
        .eq('song_id', songFileId);

      if (error) throw error;

      // Decrement likes
      await supabase.rpc('decrement_song_likes', { song_file_id: songFileId });

      setLikedSongs(prev => {
        const newSet = new Set(prev);
        newSet.delete(songFileId);
        return newSet;
      });
    } else {
      // Add to liked_songs
      const { error } = await supabase
        .from('liked_songs')
        .insert({
          user_id: user.id,
          song_id: songFileId,
        });

      if (error) throw error;

      // Increment likes
      await supabase.rpc('increment_song_likes', { song_file_id: songFileId });

      setLikedSongs(prev => new Set(prev).add(songFileId));
    }

    // Update songs state
    // Update songs state
setSongs(prevSongs =>
  prevSongs.map(song =>
    song.id === songId
      ? {
          ...song,
          isLiked: !isCurrentlyLiked,
          likes: song.likes + (isCurrentlyLiked ? -1 : 1),
        }
      : song
  )
);


    // Update playlists state
    setPlaylists(prevPlaylists =>
      prevPlaylists.map(playlist => ({
        ...playlist,
        songs: playlist.songs.map(song =>
          song.id === songId
            ? {
                ...song,
                isLiked: !isCurrentlyLiked,
                likes: song.likes + (isCurrentlyLiked ? -1 : 1),
              }
            : song
        ),
      }))
    );
  } catch (error) {
    console.error('Error toggling like:', error);
  }
};


  // Create playlist
  const createPlaylist = async (name: string) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          name
        })
        .select()
        .single()

      if (error) throw error

      const newPlaylist: Playlist = {
        id: data.id.toString(),
        name: data.name,
        songCount: 0,
        image: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=300',
        songs: []
      }

      setPlaylists(prev => [...prev, newPlaylist])
    } catch (error) {
      console.error('Error creating playlist:', error)
    }
  }

  // Delete playlist
  const deletePlaylist = async (playlistId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', parseInt(playlistId))
        .eq('user_id', user.id)

      if (error) throw error

      setPlaylists(prev => prev.filter(playlist => playlist.id !== playlistId))
    } catch (error) {
      console.error('Error deleting playlist:', error)
    }
  }

  // Rename playlist
  const renamePlaylist = async (playlistId: string, newName: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('playlists')
        .update({ name: newName })
        .eq('id', parseInt(playlistId))
        .eq('user_id', user.id)

      if (error) throw error

      setPlaylists(prev => 
        prev.map(playlist => 
          playlist.id === playlistId 
            ? { ...playlist, name: newName }
            : playlist
        )
      )
    } catch (error) {
      console.error('Error renaming playlist:', error)
    }
  }

  // Add song to playlist
  const addSongToPlaylist = async (playlistId: string, song: Song) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('playlist_songs')
        .insert({
          playlist_id: parseInt(playlistId),
          song_id: song.file_id
        })

      if (error) throw error

      setPlaylists(prev => 
        prev.map(playlist => {
          if (playlist.id === playlistId) {
            const songExists = playlist.songs.some(s => s.id === song.id)
            if (!songExists) {
              const updatedSongs = [...playlist.songs, song]
              return {
                ...playlist,
                songs: updatedSongs,
                songCount: updatedSongs.length,
                image: updatedSongs[0]?.image || playlist.image
              }
            }
          }
          return playlist
        })
      )
    } catch (error) {
      console.error('Error adding song to playlist:', error)
    }
  }

  // Remove song from playlist
  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('playlist_songs')
        .delete()
        .eq('playlist_id', parseInt(playlistId))
        .eq('song_id', parseInt(songId))

      if (error) throw error

      setPlaylists(prev => 
        prev.map(playlist => {
          if (playlist.id === playlistId) {
            const updatedSongs = playlist.songs.filter(song => song.id !== songId)
            return {
              ...playlist,
              songs: updatedSongs,
              songCount: updatedSongs.length,
              image: updatedSongs[0]?.image || 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=300'
            }
          }
          return playlist
        })
      )
    } catch (error) {
      console.error('Error removing song from playlist:', error)
    }
  }

  // Update last song in user profile
  const updateLastSong = async (songId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ last_song_file_id: parseInt(songId) })
        .eq('id', user.id)

      if (error) throw error
    } catch (error) {
      console.error('Error updating last song:', error)
    }
  }

  // Record listening history with proper time tracking
  const recordListeningHistory = async (songId: string) => {
    if (!user) return

    // If there's a previous song playing, record its listening time
      if (currentSongRef.current && currentSongStartTime) {
    const endTime = new Date();
    const minutesListened = (endTime.getTime() - currentSongStartTime.getTime()) / (1000 * 60);

    if (minutesListened > 0.1) {
      try {
        const minutes = Math.round(minutesListened * 100) / 100;
        const { error } = await supabase.rpc('upsert_history_minutes', {
          user_uuid: user.id,
          song_file_id: parseInt(currentSongRef.current),
          minutes: minutes,
        });

        if (error) {
          console.error('❌ Error recording song history:', error);
        } else {
          console.log(`✅ History updated: +${minutes} mins for song ${currentSongRef.current}`);
        }
      } catch (error) {
        console.error('Error recording previous song history:', error);
      }
    }
  }


    // Set new song as current
    currentSongRef.current = songId
    setCurrentSongStartTime(new Date())
    
    // Update last song in user profile
    await updateLastSong(songId)
try {
  await supabase.rpc('increment_song_views', { song_file_id: parseInt(songId) });
} catch (error) {
  console.error('Error incrementing song views:', error);
}

  }

  // Stop current song tracking (when player is closed)
  const stopCurrentSongTracking = async () => {
    if (currentSongRef.current && currentSongStartTime && user) {
      const endTime = new Date()
      const minutesListened = (endTime.getTime() - currentSongStartTime.getTime()) / (1000 * 60)
      
      if (minutesListened > 0.1) {
  try {
    const minutes = Math.round(minutesListened * 100) / 100;
    const { error } = await supabase.rpc('upsert_history_minutes', {
      user_uuid: user.id,
      song_file_id: parseInt(currentSongRef.current),
      minutes: minutes,
    });

    if (error) {
      console.error('❌ Error recording song history on stop:', error);
    } else {
      console.log(`🛑 History updated on stop: +${minutes} mins for song ${currentSongRef.current}`);
    }
  } catch (error) {
    console.error('Error recording final song history:', error);
  }
}

    }

    currentSongRef.current = null
    setCurrentSongStartTime(null)
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([fetchSongs(), fetchPlaylists()])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadData()
    } else {
      // Reset data when user logs out
      setSongs([])
      setPlaylists([])
      setLikedSongs(new Set())
      setLastPlayedSong(null)
      setLoading(false)
    }
  }, [user])

  return {
    songs,
    playlists,
    likedSongs: songs.filter(song => song.isLiked),
    lastPlayedSong,
    loading,
    toggleLike,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    recordListeningHistory,
    stopCurrentSongTracking,
    refreshData: () => {
      fetchSongs()
      fetchPlaylists()
    }
  }
}