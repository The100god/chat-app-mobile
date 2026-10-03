import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Play, Pause, Volume2 } from 'lucide-react-native';

interface AudioPlayerProps {
  uri: string;
  isMe: boolean;
  accentColor?: string;
  textColor?: string;
}

function formatMillis(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  uri,
  isMe,
  accentColor = '#3b82f6',
  textColor,
}) => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const tempFileRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (tempFileRef.current) {
        FileSystem.deleteAsync(tempFileRef.current, { idempotent: true }).catch(() => {});
      }
    };
  }, []);

  const loadAndTogglePlay = async () => {
    try {
      if (!soundRef.current) {
        setLoading(true);
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        let playableUri = uri;
        if (uri.startsWith('data:audio')) {
          try {
            const base64Data = uri.split(',')[1];
            if (base64Data) {
              let extension = 'm4a';
              const mimeMatch = uri.match(/^data:audio\/([a-zA-Z0-9\-_]+);/);
              if (mimeMatch && mimeMatch[1]) {
                const mime = mimeMatch[1].toLowerCase();
                if (mime === 'webm') extension = 'webm';
                else if (mime === 'mp3' || mime === 'mpeg') extension = 'mp3';
                else if (mime === 'wav' || mime === 'wave') extension = 'wav';
                else if (mime === 'ogg') extension = 'ogg';
                else if (mime === 'aac') extension = 'aac';
                else if (mime === 'mp4') extension = 'mp4';
                else if (mime === 'm4a') extension = 'm4a';
              }
              const tempFilePath = `${FileSystem.cacheDirectory}audio_cache_${Date.now()}.${extension}`;
              await FileSystem.writeAsStringAsync(tempFilePath, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
              });
              tempFileRef.current = tempFilePath;
              playableUri = tempFilePath;
            }
          } catch (cacheErr) {
            console.warn('Could not cache data URI to temp file:', cacheErr);
          }
        }

        const { sound, status } = await Audio.Sound.createAsync(
          { uri: playableUri },
          { shouldPlay: true },
          (playbackStatus) => {
            if (playbackStatus.isLoaded) {
              setPositionMillis(playbackStatus.positionMillis || 0);
              setDurationMillis(playbackStatus.durationMillis || 0);
              setIsPlaying(playbackStatus.isPlaying);

              if (playbackStatus.didJustFinish) {
                setIsPlaying(false);
                setPositionMillis(0);
              }
            }
          }
        );

        soundRef.current = sound;
        setLoading(false);
        setIsPlaying(true);
      } else {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          if (positionMillis >= durationMillis && durationMillis > 0) {
            await soundRef.current.replayAsync();
          } else {
            await soundRef.current.playAsync();
          }
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Audio play error:', error);
      setLoading(false);
      setIsPlaying(false);
    }
  };

  const progress = durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;
  const contentColor = textColor || (isMe ? '#ffffff' : '#111b21');

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.playBtn,
          { backgroundColor: isMe ? 'rgba(255,255,255,0.25)' : `${accentColor}20` },
        ]}
        onPress={loadAndTogglePlay}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={contentColor} />
        ) : isPlaying ? (
          <Pause size={18} color={contentColor} />
        ) : (
          <Play size={18} color={contentColor} style={{ marginLeft: 2 }} />
        )}
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        {/* Track Progress Bar */}
        <View style={[styles.progressTrack, { backgroundColor: isMe ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)' }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: isMe ? '#ffffff' : accentColor,
              },
            ]}
          />
        </View>

        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: contentColor, opacity: 0.8 }]}>
            {formatMillis(positionMillis)}
          </Text>
          <View style={styles.micBadge}>
            <Volume2 size={12} color={contentColor} style={{ opacity: 0.6 }} />
            <Text style={[styles.timeText, { color: contentColor, opacity: 0.8 }]}>
              {durationMillis > 0 ? formatMillis(durationMillis) : 'Voice note'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    minWidth: 190,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  waveformContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  micBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
