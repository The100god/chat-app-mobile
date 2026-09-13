import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import {
  TogetherRoom,
  WatchRoomState,
} from '../../../states/togetherTypes';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import {
  Play,
  Pause,
  Tv,
  Film,
  Link,
  Crown,
  RotateCcw,
} from 'lucide-react-native';
import { TogetherChatBox, TogetherComment } from '../TogetherChatBox';

interface MobileWatchBoardProps {
  room: TogetherRoom;
  currentUserId: string;
  onEmit: (event: string, data: any) => void;
  onLeaveRoom?: () => void;
}

const PRESET_VIDEOS = [
  {
    title: 'Big Buck Bunny (Animation)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    desc: 'Classic open-source animated short movie.',
  },
  {
    title: 'Sintel (Fantasy Short)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    desc: 'Fantasy short film with dragons and warriors.',
  },
  {
    title: 'Tears of Steel (Sci-Fi)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    desc: 'Sci-fi short film set in dystopian future.',
  },
  {
    title: "Elephant's Dream (3D Short)",
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    desc: 'The world first open-source 3D film.',
  },
];

export const MobileWatchBoard: React.FC<MobileWatchBoardProps> = ({
  room,
  currentUserId,
  onEmit,
}) => {
  const { theme } = useTheme();
  const videoRef = useRef<Video | null>(null);

  const watchState = (room.state?.watch as WatchRoomState) || {
    mediaUrl: PRESET_VIDEOS[0].url,
    mediaTitle: PRESET_VIDEOS[0].title,
    playing: false,
    position: 0,
    updatedAt: Date.now(),
    hostId: room.hostId,
    comments: [],
  };

  const isHost = room.hostId === currentUserId;
  const [isPlaying, setIsPlaying] = useState(watchState.playing || false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customTitleInput, setCustomTitleInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Sync player when incoming state changes
  useEffect(() => {
    if (videoRef.current) {
      if (watchState.playing) {
        videoRef.current.playAsync().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pauseAsync().catch(() => {});
        setIsPlaying(false);
      }
    }
  }, [watchState.playing, watchState.mediaUrl]);

  const handleTogglePlay = async () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (nextState) {
      await videoRef.current?.playAsync().catch(() => {});
    } else {
      await videoRef.current?.pauseAsync().catch(() => {});
    }

    onEmit('together:watch:updateState', {
      roomId: room.roomId,
      action: nextState ? 'play' : 'pause',
      position: watchState.position || 0,
      mediaUrl: watchState.mediaUrl,
      mediaTitle: watchState.mediaTitle,
    });
  };

  const handleSelectPreset = (preset: { title: string; url: string }) => {
    onEmit('together:watch:updateState', {
      roomId: room.roomId,
      action: 'change_media',
      mediaUrl: preset.url,
      mediaTitle: preset.title,
      position: 0,
    });
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    onEmit('together:watch:updateState', {
      roomId: room.roomId,
      action: 'change_media',
      mediaUrl: customUrlInput.trim(),
      mediaTitle: customTitleInput.trim() || 'Custom Video',
      position: 0,
    });
    setCustomUrlInput('');
    setCustomTitleInput('');
    setShowCustomInput(false);
  };

  const handleSendChatComment = (text: string) => {
    onEmit('together:room:comment', {
      roomId: room.roomId,
      text,
      username: isHost ? 'Host' : 'Partner',
    });
  };

  const comments = (watchState.comments || (room.state?.comments as TogetherComment[]) || []) as TogetherComment[];

  return (
    <View style={styles.container}>
      {/* Video Viewport Frame */}
      <View style={[styles.videoContainer, { backgroundColor: '#000000', borderColor: theme.border }]}>
        <Video
          ref={videoRef}
          style={styles.videoPlayer}
          source={{
            uri: watchState.mediaUrl || PRESET_VIDEOS[0].url,
          }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
            if (status.isLoaded) {
              setIsPlaying(status.isPlaying);
            }
          }}
        />
      </View>

      {/* Video Metadata Bar */}
      <View style={[styles.metaCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.titleRow}>
          <Film size={18} color="#ef4444" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.videoTitle, { color: theme.foreground }]} numberOfLines={1}>
              {watchState.mediaTitle || 'Watch Stream'}
            </Text>
            <Text style={[styles.hostMeta, { color: theme.mutedText }]}>
              {isHost ? 'You are host • Playback synced' : 'Partner synchronized stream'}
            </Text>
          </View>

          <TouchableOpacity style={[styles.playBtn, { backgroundColor: '#ef4444' }]} onPress={handleTogglePlay}>
            {isPlaying ? <Pause size={18} color="#ffffff" /> : <Play size={18} color="#ffffff" style={{ marginLeft: 2 }} />}
          </TouchableOpacity>
        </View>

        {/* Custom URL Option */}
        <TouchableOpacity
          style={[styles.customToggleBtn, { backgroundColor: theme.input }]}
          onPress={() => setShowCustomInput(!showCustomInput)}
        >
          <Link size={13} color={theme.foreground} />
          <Text style={[styles.customToggleText, { color: theme.foreground }]}>
            {showCustomInput ? 'Hide Custom URL' : 'Stream Custom Video URL'}
          </Text>
        </TouchableOpacity>

        {showCustomInput && (
          <View style={styles.customUrlBox}>
            <TextInput
              style={[styles.urlInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground }]}
              placeholder="Paste direct MP4 or video URL..."
              placeholderTextColor={theme.mutedText}
              value={customUrlInput}
              onChangeText={setCustomUrlInput}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.urlInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground, marginTop: 4 }]}
              placeholder="Title (Optional)"
              placeholderTextColor={theme.mutedText}
              value={customTitleInput}
              onChangeText={setCustomTitleInput}
            />
            <TouchableOpacity style={[styles.applyUrlBtn, { backgroundColor: '#ef4444' }]} onPress={handleApplyCustomUrl}>
              <Text style={styles.applyUrlText}>Load & Sync Video</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Presets List */}
      <View style={[styles.presetsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.presetsTitle, { color: theme.foreground }]}>Featured Co-Watch Clips</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
          {PRESET_VIDEOS.map((vid, idx) => {
            const isCurrent = watchState.mediaUrl === vid.url;
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.presetChip,
                  { backgroundColor: theme.input, borderColor: theme.border },
                  isCurrent && { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)' },
                ]}
                onPress={() => handleSelectPreset(vid)}
              >
                <Tv size={16} color={isCurrent ? '#ef4444' : theme.mutedText} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.presetName, { color: isCurrent ? '#ef4444' : theme.foreground }]} numberOfLines={1}>
                    {vid.title}
                  </Text>
                  <Text style={[styles.presetDesc, { color: theme.mutedText }]} numberOfLines={1}>
                    {vid.desc}
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
        title="Watch Together Live Chat"
        accentColor="#ef4444"
        collapsible={true}
        defaultExpanded={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  metaCard: {
    width: '100%',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  hostMeta: {
    fontSize: 10,
    fontWeight: '600',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  customToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  customUrlBox: {
    width: '100%',
    gap: 6,
  },
  urlInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 11,
  },
  applyUrlBtn: {
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 2,
  },
  applyUrlText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  presetsCard: {
    width: '100%',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  presetsTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  presetsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    width: 180,
  },
  presetName: {
    fontSize: 11,
    fontWeight: '700',
  },
  presetDesc: {
    fontSize: 9,
  },
});
