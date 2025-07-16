import React, { useState,useEffect } from 'react';
import { TrendingUp, Music, Plus, Clock, Headphones } from 'lucide-react';
import { Song } from '@/types';
import { useTheme } from '@/components/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import SongCard from './SongCard';
import TrendingSong from './TrendingSong';
import { getFileLink } from '@/utils/imageCache';


interface HomePageProps {
  trendingSongs: Song[];
  listenedSongs: Song[];
  notListenedSongs: Song[];
  onSongPlay: (song: Song) => void;
  formatNumber: (num: number) => string;
  onAddToPlaylist: (song: Song) => void;
  imageUrls: Record<string, string>;  // NEW
  onAddToQueue: (song: Song) => void;
}


const HomePage: React.FC<HomePageProps> = ({ 
  trendingSongs, 
  listenedSongs, 
  notListenedSongs, 
  onSongPlay, 
  formatNumber, 
  onAddToPlaylist,
  imageUrls,
  onAddToQueue
}) => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [displayedListened, setDisplayedListened] = useState(10);
  const [displayedNotListened, setDisplayedNotListened] = useState(10);
  
  // Show loading state if no songs are loaded yet
  if (trendingSongs.length === 0 && listenedSongs.length === 0 && notListenedSongs.length === 0) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading your music...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 ${isDarkMode ? 'bg-gray-900/95' : 'bg-gray-50/95'} backdrop-blur-md z-10 px-4 py-4`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Good evening</h1>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>What do you want to listen to?</p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
            {user?.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Music size={20} className="text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Trending Section */}
        {trendingSongs.length > 0 && (
          <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <TrendingUp className="mr-2 text-purple-400" size={20} />
              Trending Now
            </h2>
            <button className="text-purple-400 text-sm font-medium">See all</button>
          </div>
          <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
            {trendingSongs.map((song) => (
              <TrendingSong 
                key={song.id}
                song={{ ...song, image: imageUrls[song.id] || '' }}
                onPlay={onSongPlay}
                formatNumber={formatNumber}
                cachedImageUrl={imageUrls[song.id]}
              />
            ))}
          </div>
        </div>
        )}

        {/* Listened Songs Section */}
        {listenedSongs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Headphones className="mr-2 text-green-400" size={20} />
                Recently Listened
              </h2>
              {listenedSongs.length > displayedListened && (
                <button 
                  onClick={() => setDisplayedListened(prev => prev + 10)}
                  className="text-purple-400 text-sm font-medium"
                >
                  See more
                </button>
              )}
            </div>
            <div className="space-y-3">
              {listenedSongs.slice(0, displayedListened).map((song) => (
                <SongCard
                  key={song.id}
                  song={{ ...song, image: imageUrls[song.id] || '' }}
                  onPlay={onSongPlay}
                  formatNumber={formatNumber}
                  onAddToPlaylist={onAddToPlaylist}
                  onAddToQueue={onAddToQueue}
                  cachedImageUrl={imageUrls[song.id]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Not Listened Songs Section */}
        {notListenedSongs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Clock className="mr-2 text-blue-400" size={20} />
                Discover New Music
              </h2>
              {notListenedSongs.length > displayedNotListened && (
                <button 
                  onClick={() => setDisplayedNotListened(prev => prev + 10)}
                  className="text-purple-400 text-sm font-medium"
                >
                  See more
                </button>
              )}
            </div>
            <div className="space-y-3">
              {notListenedSongs.slice(0, displayedNotListened).map((song) => (
                <SongCard
                  key={song.id}
                  song={{ ...song, image: imageUrls[song.id] || '' }}
                  onPlay={onSongPlay}
                  formatNumber={formatNumber}
                  onAddToPlaylist={onAddToPlaylist}
                  onAddToQueue={onAddToQueue}
                  cachedImageUrl={imageUrls[song.id]}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;