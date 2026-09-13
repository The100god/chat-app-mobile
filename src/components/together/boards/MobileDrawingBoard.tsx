import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import {
  TogetherRoom,
  DrawingState,
  DrawingElement,
} from '../../../states/togetherTypes';
import {
  Sparkles,
  RotateCcw,
  Users,
  Eraser,
  Brain,
  Lock,
  Unlock,
  Heart,
  Eye,
  Sun,
  Trophy,
} from 'lucide-react-native';

interface MobileDrawingBoardProps {
  room: TogetherRoom;
  currentUserId: string;
  partnerName: string;
  onEmit: (event: string, data: any) => void;
  onLeaveGame?: () => void;
}

const COLORS = [
  '#06b6d4',
  '#f43f5e',
  '#10b981',
  '#f59e0b',
  '#a855f7',
  '#ec4899',
  '#ffffff',
];

const FACIAL_OBJECTS = ['👀', '👁️', '👃', '👂', '👄', '👑'];
const NATURE_OBJECTS = ['☀️', '🌙', '⭐️', '🌈', '🌸', '🔥'];
const ROMANTIC_OBJECTS = ['❤️', '💖', '🌹', '💋', '💍', '💌', '🧸', '🕊️'];

export const MobileDrawingBoard: React.FC<MobileDrawingBoardProps> = ({
  room,
  currentUserId,
  partnerName,
  onEmit,
  onLeaveGame,
}) => {
  const { theme } = useTheme();

  const drawingState: DrawingState = (room.state?.drawing as DrawingState) || {
    mode: 'live',
    elements: [],
    secretElements: {},
    secretSubmitted: {},
    secretRevealed: false,
    status: 'active',
  };

  const {
    mode = 'live',
    elements = [],
    secretElements = {},
    secretSubmitted = {},
    secretRevealed = false,
  } = drawingState;

  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const [categoryTab, setCategoryTab] = useState<'romantic' | 'facial' | 'nature'>('romantic');
  const [canvasLayout, setCanvasLayout] = useState<{ width: number; height: number }>({
    width: 320,
    height: 300,
  });

  const participants = room.participants || [];
  const partnerId = participants.find((id) => id !== currentUserId) || '';

  const isMindMatchMode = mode === 'mind_match';
  const mySecretSubmitted = !!secretSubmitted[currentUserId];
  const partnerSecretSubmitted = partnerId ? !!secretSubmitted[partnerId] : false;

  const displayElements: DrawingElement[] = isMindMatchMode
    ? secretRevealed
      ? [
          ...(secretElements[currentUserId] || []),
          ...(partnerId ? secretElements[partnerId] || [] : []),
        ]
      : secretElements[currentUserId] || []
    : elements;

  const lastEmitTime = useRef(0);

  const handleCanvasTouch = (locationX: number, locationY: number) => {
    if (isMindMatchMode && mySecretSubmitted) return;

    const xPct = Math.max(0, Math.min(100, (locationX / canvasLayout.width) * 100));
    const yPct = Math.max(0, Math.min(100, (locationY / canvasLayout.height) * 100));

    const now = Date.now();
    if (now - lastEmitTime.current < 40) return;
    lastEmitTime.current = now;

    if (selectedStamp) {
      onEmit('together:drawing:addElement', {
        roomId: room.roomId,
        element: {
          type: 'block',
          icon: selectedStamp,
          xPct,
          yPct,
          color: activeColor,
          userId: currentUserId,
        },
      });
    } else {
      onEmit('together:drawing:addElement', {
        roomId: room.roomId,
        element: {
          type: 'stroke',
          xPct,
          yPct,
          size: 6,
          color: activeColor,
          userId: currentUserId,
        },
      });
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleCanvasTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
      onPanResponderMove: (evt) => {
        handleCanvasTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
    })
  ).current;

  const handleClear = () => {
    onEmit('together:drawing:clear', { roomId: room.roomId });
  };

  const handleSwitchMode = (newMode: 'live' | 'mind_match') => {
    onEmit('together:drawing:switchMode', { roomId: room.roomId, mode: newMode });
  };

  const handleSubmitSecret = () => {
    onEmit('together:drawing:submitSecret', { roomId: room.roomId });
  };

  const handleResetSecret = () => {
    onEmit('together:drawing:resetSecret', { roomId: room.roomId });
  };

  const currentStamps =
    categoryTab === 'romantic'
      ? ROMANTIC_OBJECTS
      : categoryTab === 'facial'
      ? FACIAL_OBJECTS
      : NATURE_OBJECTS;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.topCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.topHeaderRow}>
          <View style={styles.titleWithIcon}>
            <Text style={{ fontSize: 24 }}>🎨</Text>
            <View>
              <Text style={[styles.gameTitle, { color: theme.foreground }]}>
                {isMindMatchMode ? 'Mind Match Drawing' : 'Couples Live Doodle'}
              </Text>
              <Text style={[styles.gameSubtitle, { color: theme.mutedText }]}>
                {isMindMatchMode ? 'Draw secretly & see if you match!' : 'Real-time synchronized canvas'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.smallIconBtn, { backgroundColor: theme.muted }]} onPress={handleClear}>
            <Eraser size={14} color={theme.foreground} />
          </TouchableOpacity>
        </View>

        {/* Mode Switcher Tabs */}
        <View style={[styles.modeTabsRow, { backgroundColor: theme.muted }]}>
          <TouchableOpacity
            style={[
              styles.modeTab,
              !isMindMatchMode && { backgroundColor: theme.card, shadowOpacity: 0.1 },
            ]}
            onPress={() => handleSwitchMode('live')}
          >
            <Sparkles size={12} color={!isMindMatchMode ? '#10b981' : theme.mutedText} />
            <Text
              style={[
                styles.modeTabText,
                { color: !isMindMatchMode ? theme.foreground : theme.mutedText },
              ]}
            >
              Live Doodle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              isMindMatchMode && { backgroundColor: theme.card, shadowOpacity: 0.1 },
            ]}
            onPress={() => handleSwitchMode('mind_match')}
          >
            <Brain size={12} color={isMindMatchMode ? '#ec4899' : theme.mutedText} />
            <Text
              style={[
                styles.modeTabText,
                { color: isMindMatchMode ? theme.foreground : theme.mutedText },
              ]}
            >
              Mind Match
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mind Match Status Bar */}
      {isMindMatchMode && (
        <View
          style={[
            styles.mindMatchBar,
            {
              backgroundColor: secretRevealed
                ? 'rgba(16,185,129,0.15)'
                : 'rgba(236,72,153,0.15)',
              borderColor: secretRevealed ? '#10b981' : '#ec4899',
            },
          ]}
        >
          {secretRevealed ? (
            <View style={styles.revealedRow}>
              <Trophy size={14} color="#10b981" />
              <Text style={[styles.mindMatchText, { color: '#10b981' }]}>
                Mind Match Revealed! Comparing your creations!
              </Text>
              <TouchableOpacity style={styles.resetSecretBtn} onPress={handleResetSecret}>
                <RotateCcw size={12} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.submitRow}>
              <Text style={[styles.mindMatchText, { color: '#ec4899' }]}>
                {mySecretSubmitted
                  ? `Locked in! Waiting for ${partnerName}...`
                  : 'Draw secretly, then lock in!'}
              </Text>
              {!mySecretSubmitted && (
                <TouchableOpacity style={styles.submitSecretBtn} onPress={handleSubmitSecret}>
                  <Lock size={12} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.submitSecretText}>Lock Secret</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Color Palette */}
      <View style={styles.paletteRow}>
        {COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              activeColor === c && !selectedStamp && styles.colorDotActive,
            ]}
            onPress={() => {
              setActiveColor(c);
              setSelectedStamp(null);
            }}
          />
        ))}
      </View>

      {/* Stamps Shelf */}
      <View style={[styles.stampsShelf, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.categoryRow}>
          <TouchableOpacity
            style={[styles.catBtn, categoryTab === 'romantic' && styles.catBtnActive]}
            onPress={() => setCategoryTab('romantic')}
          >
            <Heart size={11} color={categoryTab === 'romantic' ? '#ec4899' : theme.mutedText} />
            <Text style={[styles.catText, categoryTab === 'romantic' && { color: '#ec4899' }]}>Love</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.catBtn, categoryTab === 'facial' && styles.catBtnActive]}
            onPress={() => setCategoryTab('facial')}
          >
            <Eye size={11} color={categoryTab === 'facial' ? '#3b82f6' : theme.mutedText} />
            <Text style={[styles.catText, categoryTab === 'facial' && { color: '#3b82f6' }]}>Faces</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.catBtn, categoryTab === 'nature' && styles.catBtnActive]}
            onPress={() => setCategoryTab('nature')}
          >
            <Sun size={11} color={categoryTab === 'nature' ? '#f59e0b' : theme.mutedText} />
            <Text style={[styles.catText, categoryTab === 'nature' && { color: '#f59e0b' }]}>Nature</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stampIconsRow}>
          {currentStamps.map((stamp) => (
            <TouchableOpacity
              key={stamp}
              style={[
                styles.stampBtn,
                { backgroundColor: theme.input, borderColor: theme.border },
                selectedStamp === stamp && styles.stampBtnActive,
              ]}
              onPress={() => setSelectedStamp(selectedStamp === stamp ? null : stamp)}
            >
              <Text style={styles.stampEmoji}>{stamp}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Canvas Area */}
      <View
        style={[styles.canvasFrame, { borderColor: theme.border }]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setCanvasLayout({ width, height });
          }
        }}
        {...panResponder.panHandlers}
      >
        {displayElements.map((el, idx) => (
          <View
            key={idx}
            pointerEvents="none"
            style={[
              styles.element,
              {
                left: `${el.xPct || 0}%`,
                top: `${el.yPct || 0}%`,
              },
            ]}
          >
            {el.type === 'block' && el.icon ? (
              <Text style={{ fontSize: 24 }}>{el.icon}</Text>
            ) : (
              <View
                style={{
                  width: el.size ? el.size * 2 : 12,
                  height: el.size ? el.size * 2 : 12,
                  borderRadius: el.size || 6,
                  backgroundColor: el.color || '#06b6d4',
                }}
              />
            )}
          </View>
        ))}

        {displayElements.length === 0 && (
          <Text style={styles.canvasEmptyHint}>
            {selectedStamp ? 'Tap to stamp icon' : 'Drag or tap to draw on canvas'}
          </Text>
        )}
      </View>

      {/* Action Footer */}
      <View style={styles.actionFooter}>
        <TouchableOpacity style={[styles.clearBtn, { backgroundColor: '#ef4444' }]} onPress={handleClear}>
          <Eraser size={14} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.clearBtnText}>Clear Board</Text>
        </TouchableOpacity>

        {onLeaveGame && (
          <TouchableOpacity
            style={[styles.switchGameBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
            onPress={onLeaveGame}
          >
            <Users size={14} color={theme.foreground} style={{ marginRight: 6 }} />
            <Text style={[styles.switchGameBtnText, { color: theme.foreground }]}>Switch Game</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  topCard: {
    width: '100%',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  gameSubtitle: {
    fontSize: 10,
    fontWeight: '600',
  },
  smallIconBtn: {
    padding: 6,
    borderRadius: 10,
  },
  modeTabsRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mindMatchBar: {
    width: '100%',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  revealedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mindMatchText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  submitSecretBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ec4899',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  submitSecretText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  resetSecretBtn: {
    backgroundColor: '#10b981',
    padding: 5,
    borderRadius: 8,
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 2,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: '#ffffff',
    transform: [{ scale: 1.2 }],
  },
  stampsShelf: {
    width: '100%',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  catText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stampIconsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  stampBtn: {
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  stampBtnActive: {
    borderColor: '#ec4899',
    backgroundColor: 'rgba(236,72,153,0.2)',
  },
  stampEmoji: {
    fontSize: 18,
  },
  canvasFrame: {
    width: '100%',
    height: 280,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  element: {
    position: 'absolute',
    transform: [{ translateX: -8 }, { translateY: -8 }],
  },
  canvasEmptyHint: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  actionFooter: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  clearBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
  },
  clearBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  switchGameBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  switchGameBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
