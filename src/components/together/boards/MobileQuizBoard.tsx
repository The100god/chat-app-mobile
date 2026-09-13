import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { UIModal } from '../../UIModal';
import { useTheme } from '../../../context/ThemeContext';
import {
  TogetherRoom,
  QuizState,
  GameStats,
} from '../../../states/togetherTypes';
import {
  Trophy,
  RotateCcw,
  Sparkles,
  Users,
  XCircle,
  Handshake,
  Volume2,
  Mic,
  Square,
  Plus,
  X,
  CheckCircle2,
  ArrowRightLeft,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import { showToast } from '../../Toast';

interface MobileQuizBoardProps {
  room: TogetherRoom;
  currentUserId: string;
  partnerName: string;
  onEmit: (event: string, data: any) => void;
  onLeaveGame?: () => void;
}

export const MobileQuizBoard: React.FC<MobileQuizBoardProps> = ({
  room,
  currentUserId,
  partnerName,
  onEmit,
  onLeaveGame,
}) => {
  const { theme } = useTheme();

  const participants = room.participants || [];
  const partnerId = participants.find((id) => id !== currentUserId) || '';

  const rawQuiz = room.state?.quiz as QuizState | undefined;
  const isUntouched = (rawQuiz?.currentQuestionIndex || 0) === 0 && Object.keys(rawQuiz?.answers || {}).length === 0;
  const rawStatus = rawQuiz?.status;
  const resolvedStatus =
    rawStatus === 'setup'
      ? 'setup'
      : rawStatus === 'waiting' && participants.length >= 2
      ? 'setup'
      : rawStatus || (participants.length >= 2 ? (isUntouched ? 'setup' : 'playing') : 'waiting');

  const quizState: QuizState = rawQuiz || {
    currentQuestionIndex: 0,
    questions: [],
    answers: {},
    scores: {},
    status: resolvedStatus,
    mode: 'couple',
    winner: null,
    askerId: room.hostId || currentUserId,
  };

  const {
    currentQuestionIndex = 0,
    questions = [],
    answers = {},
    scores = {},
    winner = null,
    revealData,
    askerId = room.hostId || currentUserId,
  } = quizState;
  const status = quizState.status || resolvedStatus;

  const handleSelectFirstPlayer = (firstPlayerId: string) => {
    onEmit('together:quiz:swapFirstTurn', { roomId: room.roomId, firstPlayerId });
  };

  const handleStartGame = () => {
    onEmit('together:quiz:startGame', { roomId: room.roomId });
  };

  const myScore = scores[currentUserId] || 0;
  const partnerScore = partnerId ? scores[partnerId] || 0 : 0;

  const myAnswers = answers[currentUserId] || {};
  const currentQuestion = questions[currentQuestionIndex];
  const mySelectedOption = currentQuestion ? myAnswers[currentQuestionIndex] : undefined;
  const hasAnsweredCurrent = mySelectedOption !== undefined;

  const sessionStats: GameStats =
    (currentUserId &&
      (room.sessionStats?.[`quiz_${currentUserId}`] ||
        room.sessionStats?.[currentUserId])) || {
      wins: 0,
      losses: 0,
      ties: 0,
      total: 0,
    };

  // Custom question modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customOpts, setCustomOpts] = useState(['', '', '', '']);
  const [correctIdx, setCorrectIdx] = useState(0);

  // Audio recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startVoiceRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        showToast('Microphone permission required for voice questions', 'error');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      if (!recording) return;
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordedUri(uri);
      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const playQuestionAudio = async (audioData: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: audioData });
      await sound.playAsync();
    } catch (err) {
      showToast('Could not play audio clip', 'error');
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (hasAnsweredCurrent || status === 'finished') return;
    onEmit('together:quiz:submitAnswer', {
      roomId: room.roomId,
      questionIndex: currentQuestionIndex,
      optionIndex,
    });
  };

  const handleRestart = () => {
    onEmit('together:quiz:restart', { roomId: room.roomId });
  };

  const handleCreateCustomQuestion = () => {
    if (!customText.trim()) {
      showToast('Please enter a question', 'error');
      return;
    }
    const filteredOpts = customOpts.filter((o) => o.trim());
    if (filteredOpts.length < 2) {
      showToast('Please provide at least 2 options', 'error');
      return;
    }

    onEmit('together:quiz:submitCustomQuestion', {
      roomId: room.roomId,
      questionText: customText.trim(),
      options: filteredOpts,
      correctIndex: correctIdx,
      audioData: recordedUri || null,
    });

    setShowCustomModal(false);
    setCustomText('');
    setCustomOpts(['', '', '', '']);
    setRecordedUri(null);
  };

  return (
    <View style={styles.container}>
      {/* Top Header & Stats */}
      <View style={[styles.topCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.topHeaderRow}>
          <View style={styles.titleWithIcon}>
            <Image
              source={require('../../../../assets/game-icons/quiz.png')}
              style={styles.gameIcon}
            />
            <View>
              <Text style={[styles.gameTitle, { color: theme.foreground }]}>Trivia Quiz Duel</Text>
              <Text style={[styles.gameSubtitle, { color: theme.mutedText }]}>
                Question {Math.min(currentQuestionIndex + 1, questions.length || 5)} of{' '}
                {questions.length || 5}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={[styles.smallIconBtn, { backgroundColor: theme.accent }]}
              onPress={() => setShowCustomModal(true)}
            >
              <Plus size={14} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallIconBtn, { backgroundColor: theme.muted }]}
              onPress={handleRestart}
            >
              <RotateCcw size={14} color={theme.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Session Stats */}
        <View style={[styles.statsRow, { backgroundColor: theme.muted }]}>
          <View style={styles.statItem}>
            <Trophy size={11} color="#10b981" />
            <Text style={[styles.statText, { color: '#10b981' }]}>{sessionStats.wins} W</Text>
          </View>
          <View style={styles.statItem}>
            <XCircle size={11} color="#ef4444" />
            <Text style={[styles.statText, { color: '#ef4444' }]}>{sessionStats.losses} L</Text>
          </View>
          <View style={styles.statItem}>
            <Handshake size={11} color="#f59e0b" />
            <Text style={[styles.statText, { color: '#f59e0b' }]}>{sessionStats.ties} T</Text>
          </View>
          <Text style={[styles.statTotal, { color: theme.mutedText }]}>{sessionStats.total} Total</Text>
        </View>

        {/* Player Score Counter */}
        <View style={styles.scoresRow}>
          <View style={[styles.scoreBox, { backgroundColor: 'rgba(139,92,246,0.12)', borderColor: '#8b5cf6' }]}>
            <Text style={[styles.scoreLabel, { color: '#8b5cf6' }]}>YOU</Text>
            <Text style={[styles.scoreNumber, { color: '#8b5cf6' }]}>{myScore} pts</Text>
          </View>
          <View style={[styles.scoreBox, { backgroundColor: 'rgba(236,72,153,0.12)', borderColor: '#ec4899' }]}>
            <Text style={[styles.scoreLabel, { color: '#ec4899' }]}>{partnerName.toUpperCase()}</Text>
            <Text style={[styles.scoreNumber, { color: '#ec4899' }]}>{partnerScore} pts</Text>
          </View>
        </View>
      </View>

      {/* Setup First Asker Screen */}
      {status === 'setup' && (
        <View style={[styles.setupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.setupTitleRow}>
            <Sparkles size={14} color="#8b5cf6" />
            <Text style={[styles.setupTitle, { color: theme.foreground }]}>
              Who Asks / Starts First?
            </Text>
          </View>
          <Text style={[styles.setupDesc, { color: theme.mutedText }]}>
            Choose who creates or asks the first question round. You can also chat live below!
          </Text>

          <View style={styles.firstTurnBtnsRow}>
            <TouchableOpacity
              style={[
                styles.turnOptionBtn,
                { backgroundColor: theme.input, borderColor: theme.border },
                askerId === currentUserId && { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
              ]}
              onPress={() => handleSelectFirstPlayer(currentUserId)}
            >
              <Text
                style={[
                  styles.turnOptionText,
                  { color: askerId === currentUserId ? '#fff' : theme.foreground },
                ]}
              >
                👤 You Ask 1st
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.turnOptionBtn,
                { backgroundColor: theme.input, borderColor: theme.border },
                askerId === partnerId && { backgroundColor: '#ec4899', borderColor: '#ec4899' },
              ]}
              onPress={() => handleSelectFirstPlayer(partnerId)}
            >
              <Text
                style={[
                  styles.turnOptionText,
                  { color: askerId === partnerId ? '#fff' : theme.foreground },
                ]}
              >
                👥 {partnerName} Asks 1st
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.startGameBtn} onPress={handleStartGame}>
            <Text style={styles.startGameBtnText}>🚀 Launch Trivia & Voice Quiz</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Swap Button when game is active and at question 1 with 0 answers */}
      {status === 'playing' && isUntouched && (
        <TouchableOpacity
          style={[styles.quickSwapBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
          onPress={() => handleSelectFirstPlayer(askerId === currentUserId ? partnerId : currentUserId)}
        >
          <ArrowRightLeft size={13} color={theme.accent} style={{ marginRight: 6 }} />
          <Text style={[styles.quickSwapText, { color: theme.accent }]}>
            Swap Turn: {askerId === currentUserId ? 'You ask 1st' : `${partnerName} asks 1st`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Finished State */}
      {status === 'finished' && (
        <View
          style={[
            styles.resultBanner,
            winner === currentUserId
              ? { backgroundColor: 'rgba(245,158,11,0.2)', borderColor: '#f59e0b' }
              : winner
              ? { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' }
              : { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: '#a855f7' },
          ]}
        >
          {winner === currentUserId ? (
            <View style={styles.resultContent}>
              <Trophy size={18} color="#f59e0b" style={{ marginRight: 6 }} />
              <Text style={[styles.resultTitle, { color: '#f59e0b' }]}>Victory! You Won the Quiz Duel! 🎉</Text>
            </View>
          ) : winner ? (
            <Text style={[styles.resultTitle, { color: '#ef4444' }]}>
              {partnerName} Won! Better luck next time 💔
            </Text>
          ) : (
            <Text style={[styles.resultTitle, { color: '#a855f7' }]}>Tied Scores! It's a Draw! 🤝</Text>
          )}
        </View>
      )}

      {/* Reveal Data Match Banner */}
      {status === 'reveal' && revealData && (
        <View style={[styles.revealCard, { backgroundColor: theme.card, borderColor: '#10b981' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color="#10b981" />
            <Text style={[styles.revealTitle, { color: '#10b981' }]}>
              {revealData.isMatch ? 'Match! Both picked the same answer! 🎉' : 'Answers Revealed!'}
            </Text>
          </View>
          <Text style={[styles.revealSub, { color: theme.foreground }]}>
            + {revealData.pointsAwarded || 0} points awarded!
          </Text>
        </View>
      )}

      {/* Question Card */}
      {status !== 'finished' && currentQuestion && (
        <View style={[styles.questionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.questionText, { color: theme.foreground }]}>
            {currentQuestion.question}
          </Text>

          {/* Voice Audio Clip Player if present */}
          {currentQuestion.audioData && (
            <TouchableOpacity
              style={[styles.audioPlayBtn, { backgroundColor: `${theme.accent}20`, borderColor: theme.accent }]}
              onPress={() => playQuestionAudio(currentQuestion.audioData!)}
            >
              <Volume2 size={16} color={theme.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.audioPlayText, { color: theme.accent }]}>Listen to Audio Clue</Text>
            </TouchableOpacity>
          )}

          {/* 4 Options */}
          <View style={styles.optionsWrap}>
            {currentQuestion.options.map((opt, idx) => {
              const isSelectedByMe = mySelectedOption === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.optionBtn,
                    { backgroundColor: theme.input, borderColor: theme.border },
                    isSelectedByMe && {
                      borderColor: theme.accent,
                      backgroundColor: `${theme.accent}20`,
                    },
                  ]}
                  onPress={() => handleSelectOption(idx)}
                  disabled={hasAnsweredCurrent}
                >
                  <View
                    style={[
                      styles.optNumberCircle,
                      { backgroundColor: isSelectedByMe ? theme.accent : theme.muted },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optNumberText,
                        { color: isSelectedByMe ? '#ffffff' : theme.foreground },
                      ]}
                    >
                      {String.fromCharCode(65 + idx)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      { color: theme.foreground, fontWeight: isSelectedByMe ? '700' : '500' },
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {hasAnsweredCurrent && status !== 'reveal' && (
            <Text style={[styles.waitingChoiceText, { color: theme.mutedText }]}>
              Answer submitted! Waiting for {partnerName}...
            </Text>
          )}
        </View>
      )}

      {/* Action Footer */}
      <View style={styles.actionFooter}>
        <TouchableOpacity
          style={[styles.rematchBtn, { backgroundColor: theme.accent }]}
          onPress={handleRestart}
        >
          <RotateCcw size={15} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.rematchBtnText}>Restart Quiz</Text>
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

      {/* Custom Question Builder Modal */}
      <UIModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        title="Create Custom Quiz Question"
        subtitle="Craft a unique question with choices & voice clue"
        icon={<Sparkles size={20} color={theme.accent} />}
        position="center"
      >
        <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.inputLabel, { color: theme.mutedText }]}>Question Text:</Text>
          <TextInput
            style={[styles.modalInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground }]}
            placeholder="What is our favorite vacation spot?"
            placeholderTextColor={theme.mutedText}
            value={customText}
            onChangeText={setCustomText}
          />

          {/* Voice Clue Button */}
          <View style={styles.voiceSection}>
            <TouchableOpacity
              style={[
                styles.recordBtn,
                { backgroundColor: isRecording ? '#ef4444' : theme.muted },
              ]}
              onPress={isRecording ? stopVoiceRecording : startVoiceRecording}
            >
              {isRecording ? <Square size={14} color="#fff" /> : <Mic size={14} color={theme.foreground} />}
              <Text style={[styles.recordBtnText, { color: isRecording ? '#fff' : theme.foreground }]}>
                {isRecording ? 'Stop Recording' : recordedUri ? 'Voice Clue Recorded ✓' : 'Add Voice Clue'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { color: theme.mutedText, marginTop: 10 }]}>Options (Mark Correct):</Text>
          {customOpts.map((opt, idx) => (
            <View key={idx} style={styles.customOptRow}>
              <TouchableOpacity
                style={[
                  styles.correctCheckBtn,
                  correctIdx === idx && { backgroundColor: '#10b981' },
                ]}
                onPress={() => setCorrectIdx(idx)}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.modalInput, { flex: 1, backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground }]}
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                placeholderTextColor={theme.mutedText}
                value={opt}
                onChangeText={(t) => {
                  const updated = [...customOpts];
                  updated[idx] = t;
                  setCustomOpts(updated);
                }}
              />
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={[styles.createQuestionBtn, { backgroundColor: theme.accent, marginTop: 12 }]} onPress={handleCreateCustomQuestion}>
          <Text style={styles.createQuestionText}>Add Question to Duel</Text>
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
  gameIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statTotal: {
    fontSize: 10,
    fontWeight: '600',
  },
  scoresRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreBox: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  scoreNumber: {
    fontSize: 15,
    fontWeight: '900',
  },
  resultBanner: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  revealCard: {
    width: '100%',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
  },
  revealTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  revealSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  questionCard: {
    width: '100%',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  audioPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'center',
  },
  audioPlayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  optionsWrap: {
    width: '100%',
    gap: 8,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  optNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optNumberText: {
    fontSize: 11,
    fontWeight: '800',
  },
  optionText: {
    fontSize: 12,
    flex: 1,
  },
  waitingChoiceText: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionFooter: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  rematchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
  },
  rematchBtnText: {
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
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    marginBottom: 6,
  },
  voiceSection: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  recordBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  customOptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  correctCheckBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  createQuestionBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  createQuestionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  setupCard: {
    width: '100%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  setupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  setupTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  setupDesc: {
    fontSize: 11,
    marginBottom: 10,
    textAlign: 'center',
  },
  firstTurnBtnsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 10,
  },
  turnOptionBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnOptionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  startGameBtn: {
    width: '100%',
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  startGameBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  quickSwapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  quickSwapText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
