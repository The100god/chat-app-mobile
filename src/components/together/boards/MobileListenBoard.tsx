import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { UIModal } from '../../UIModal';
import { useTheme } from '../../../context/ThemeContext';
import {
  TogetherRoom,
  MusicRoomState,
  MusicTrack,
} from '../../../states/togetherTypes';
import { Audio } from 'expo-av';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  Plus,
  X,
  Volume2,
} from 'lucide-react-native';
import { TogetherChatBox, TogetherComment } from '../TogetherChatBox';

interface MobileListenBoardProps {
  room: TogetherRoom;
  currentUserId: string;
  onEmit: (event: string, data: any) => void;
  onLeaveRoom?: () => void;
}

const PRESET_AUDIO_TRACKS: MusicTrack[] = [
  {
    id: 'track-1',
    title: 'Lofi Chill Beats',
    artist: 'Open Audio Archive',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    addedBy: 'System',
  },
  {
    id: 'track-2',
    title: 'Acoustic Sunset',
    artist: 'SoundHelix',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    addedBy: 'System',
  },
  {
    id: 'track-3',
    title: 'Synthwave Breeze',
    artist: 'SoundHelix',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    addedBy: 'System',
  },
  {
    id: 'track-4',
    title: 'Ambient Evening',
    artist: 'SoundHelix',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    addedBy: 'System',
  },
];

export const MobileListenBoard: React.FC<MobileListenBoardProps> = ({
  room,
  currentUserId,
  onEmit,
}) => {
  const { theme } = useTheme();
  const soundRef = useRef<Audio.Sound | null>(null);

  const musicState = (room.state?.music as MusicRoomState) || {
    queue: PRESET_AUDIO_TRACKS,
    currentTrackIndex: 0,
    playing: false,
    position: 0,
    updatedAt: Date.now(),
    comments: [],
  };

  const queue = musicState.queue?.length ? musicState.queue : PRESET_AUDIO_TRACKS;
  const currentTrackIndex = musicState.currentTrackIndex || 0;
  const currentTrack = queue[currentTrackIndex] || queue[0];

  const [isPlaying, setIsPlaying] = useState(musicState.playing || false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  // Manage Audio instance
  useEffect(() => {
    let isCancelled = false;

    const setupAudio = async () => {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      if (currentTrack?.url) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: currentTrack.url },
            { shouldPlay: musicState.playing }
          );
          if (!isCancelled) {
            soundRef.current = sound;
            setIsPlaying(musicState.playing);
          }
        } catch (err) {
          console.error('Audio load error:', err);
        }
      }
    };

    setupAudio();

    return () => {
      isCancelled = true;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, [currentTrack?.url]);

  // Sync play/pause state from room updates
  useEffect(() => {
    if (soundRef.current) {
      if (musicState.playing) {
        soundRef.current.playAsync().catch(() => {});
        setIsPlaying(true);
      } else {
        soundRef.current.pauseAsync().catch(() => {});
        setIsPlaying(false);
      }
    }
  }, [musicState.playing]);

  const handleTogglePlay = async () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (nextState) {
      await soundRef.current?.playAsync().catch(() => {});
    } else {
      await soundRef.current?.pauseAsync().catch(() => {});
    }

    onEmit('together:music:updateState', {
      roomId: room.roomId,
      action: nextState ? 'play' : 'pause',
      position: 0,
      trackIndex: currentTrackIndex,
    });
  };

  const handleSkipNext = () => {
    const nextIdx = (currentTrackIndex + 1) % queue.length;
    onEmit('together:music:updateState', {
      roomId: room.roomId,
      action: 'change_track',
      trackIndex: nextIdx,
      position: 0,
    });
  };

  const handleSkipPrev = () => {
    const prevIdx = (currentTrackIndex - 1 + queue.length) % queue.length;
    onEmit('together:music:updateState', {
      roomId: room.roomId,
      action: 'change_track',
      trackIndex: prevIdx,
      position: 0,
    });
  };

  const handleAddTrack = () => {
    if (!customTitle.trim() || !customUrl.trim()) return;
    const newTrack: MusicTrack = {
      id: `track-${Date.now()}`,
      title: customTitle.trim(),
      artist: customArtist.trim() || 'Custom Artist',
      url: customUrl.trim(),
      addedBy: currentUserId,
    };

    onEmit('together:music:updateState', {
      roomId: room.roomId,
      action: 'add_track',
      track: newTrack,
    });

    setCustomTitle('');
    setCustomArtist('');
    setCustomUrl('');
    setShowAddModal(false);
  };

  const handleSendChatComment = (text: string) => {
    onEmit('together:room:comment', {
      roomId: room.roomId,
      text,
      username: room.hostId === currentUserId ? 'Host' : 'Partner',
    });
  };

  const comments = (musicState.comments || (room.state?.comments as TogetherComment[]) || []) as TogetherComment[];

  return (
    <View style={styles.container}>
      {/* Turntable / Vinyl Disk Disc Graphic */}
      <View style={[styles.playerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.discContainer}>
          <View style={[styles.outerDisc, { backgroundColor: '#06b6d4' }]}>
            <View style={styles.innerGroove}>
              <Music size={32} color="#06b6d4" />
            </View>
          </View>
        </View>

        {/* Track Title & Artist */}
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, { color: theme.foreground }]} numberOfLines={1}>
            {currentTrack?.title || 'No Track Selected'}
          </Text>
          <Text style={[styles.trackArtist, { color: theme.mutedText }]} numberOfLines={1}>
            {currentTrack?.artist || 'Unknown Artist'}
          </Text>
        </View>

        {/* Playback Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkipPrev}>
            <SkipBack size={20} color={theme.foreground} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.playToggleBtn, { backgroundColor: '#06b6d4' }]} onPress={handleTogglePlay}>
            {isPlaying ? <Pause size={24} color="#ffffff" /> : <Play size={24} color="#ffffff" style={{ marginLeft: 2 }} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkipNext}>
            <SkipForward size={20} color={theme.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Playlist Queue Section */}
      <View style={[styles.queueCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.queueHeader}>
          <Text style={[styles.queueTitle, { color: theme.foreground }]}>
            Playlist Queue ({queue.length})
          </Text>
          <TouchableOpacity
            style={[styles.addTrackBtn, { backgroundColor: theme.accent }]}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={13} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.addTrackText}>Add Track</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.queueList}>
          {queue.map((track, idx) => {
            const isCurrent = idx === currentTrackIndex;
            return (
              <TouchableOpacity
                key={track.id || idx}
                style={[
                  styles.queueItem,
                  { backgroundColor: theme.input, borderColor: theme.border },
                  isCurrent && { borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.15)' },
                ]}
                onPress={() => {
                  onEmit('together:music:updateState', {
                    roomId: room.roomId,
                    action: 'change_track',
                    trackIndex: idx,
                    position: 0,
                  });
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 8 }}>{isCurrent && isPlaying ? '🎵' : '💿'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: isCurrent ? '#06b6d4' : theme.foreground }]} numberOfLines={1}>
                    {track.title}
                  </Text>
                  <Text style={[styles.itemArtist, { color: theme.mutedText }]} numberOfLines={1}>
                    {track.artist}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Synced Room Live WhatsApp Chat */}
      <TogetherChatBox
        comments={comments}
        currentUserId={currentUserId}
        hostId={room.hostId}
        onSendMessage={handleSendChatComment}
        title="Listen Together Live Chat"
        accentColor="#06b6d4"
        collapsible={true}
        defaultExpanded={true}
      />

      {/* Add Custom Track Modal */}
      <UIModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Track to Queue"
        subtitle="Add a direct MP3 stream URL to listen together"
        icon={<Music size={20} color="#06b6d4" />}
        position="center"
      >
        <TextInput
          style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground }]}
          placeholder="Song / Track Title"
          placeholderTextColor={theme.mutedText}
          value={customTitle}
          onChangeText={setCustomTitle}
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground, marginTop: 8 }]}
          placeholder="Artist / Composer"
          placeholderTextColor={theme.mutedText}
          value={customArtist}
          onChangeText={setCustomArtist}
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground, marginTop: 8 }]}
          placeholder="Direct Audio MP3 Stream URL"
          placeholderTextColor={theme.mutedText}
          value={customUrl}
          onChangeText={setCustomUrl}
          autoCapitalize="none"
        />

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#06b6d4', marginTop: 12 }]} onPress={handleAddTrack}>
          <Text style={styles.submitBtnText}>Add Track to Sync Queue</Text>
        </TouchableOpacity>
      </UIModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  playerCard: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 14,
  },
  discContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerDisc: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  innerGroove: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    alignItems: 'center',
    gap: 2,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  trackArtist: {
    fontSize: 12,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  skipBtn: {
    padding: 10,
  },
  playToggleBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  queueCard: {
    width: '100%',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  addTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  addTrackText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  queueList: {
    maxHeight: 160,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemArtist: {
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
  },
  submitBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
