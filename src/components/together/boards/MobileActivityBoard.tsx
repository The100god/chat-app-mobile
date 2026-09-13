import React, { useState } from 'react';
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
  TogetherActivityId,
  ActivityState,
} from '../../../states/togetherTypes';
import {
  ACTIVITIES_REGISTRY,
  WOULD_YOU_RATHER_PROMPTS,
  TRUTH_PROMPTS,
  DARE_PROMPTS,
  THIS_OR_THAT_PROMPTS,
  DAILY_QUESTIONS,
  COUPLE_QUESTIONS_BY_CATEGORY,
} from '../../activities/activityRegistry';
import {
  Heart,
  Flame,
  Scale,
  Calendar,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Mic,
  Square,
  Volume2,
  RotateCcw,
  Users,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import { showToast } from '../../Toast';

interface MobileActivityBoardProps {
  room: TogetherRoom;
  currentUserId: string;
  partnerName: string;
  onEmit: (event: string, data: any) => void;
  onLeaveRoom?: () => void;
}

export const MobileActivityBoard: React.FC<MobileActivityBoardProps> = ({
  room,
  currentUserId,
  partnerName,
  onEmit,
  onLeaveRoom,
}) => {
  const { theme } = useTheme();

  const activityState: ActivityState = (room.state?.activity as ActivityState) || {
    activityId: (room.activityId as TogetherActivityId) || 'would_you_rather',
    currentPromptIndex: 0,
    answers: {},
    status: 'answering',
  };

  const currentActivityId = activityState.activityId || (room.activityId as TogetherActivityId) || 'would_you_rather';
  const currentPromptIndex = activityState.currentPromptIndex || 0;
  const answers = activityState.answers || {};
  const isRevealed = activityState.status === 'revealed';

  const participants = room.participants || [];
  const partnerId = participants.find((id) => id !== currentUserId) || '';

  const myAnswer = answers[currentUserId];
  const partnerAnswer = partnerId ? answers[partnerId] : null;
  const hasMyAnswer = myAnswer !== undefined && myAnswer !== null;
  const hasPartnerAnswer = partnerAnswer !== undefined && partnerAnswer !== null;

  // Text answer inputs
  const [textAnswerInput, setTextAnswerInput] = useState('');
  const [customPromptInput, setCustomPromptInput] = useState('');

  // Audio recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);

  const startVoiceRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        showToast('Microphone permission required for voice audio', 'error');
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

  const playVoiceClip = async (uri: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
    } catch {
      showToast('Could not play voice clip', 'error');
    }
  };

  const handleNextPrompt = () => {
    onEmit('together:activity:nextPrompt', { roomId: room.roomId });
    setTextAnswerInput('');
    setCustomPromptInput('');
    setRecordedUri(null);
  };

  const handleSelectOption = (choice: string) => {
    onEmit('together:activity:submitAnswer', {
      roomId: room.roomId,
      answer: choice,
    });
  };

  const handleSubmitTextAnswer = () => {
    if (!textAnswerInput.trim()) return;
    onEmit('together:activity:submitAnswer', {
      roomId: room.roomId,
      answer: textAnswerInput.trim(),
    });
    setTextAnswerInput('');
  };

  // Truth or Dare handlers
  const isMyTodTurn = activityState.turnUserId === currentUserId;
  const isPartnerTodTurn = activityState.turnUserId === partnerId;

  const handleSelectTruthOrDare = (choice: 'truth' | 'dare') => {
    onEmit('together:activity:selectTruthOrDare', { roomId: room.roomId, choice });
  };

  const handleSubmitTodQuestion = (customText?: string) => {
    onEmit('together:activity:submitTruthOrDareQuestion', {
      roomId: room.roomId,
      customText: customText || customPromptInput || null,
      audioData: recordedUri || null,
    });
    setCustomPromptInput('');
    setRecordedUri(null);
  };

  const handleSubmitTodAnswer = () => {
    onEmit('together:activity:submitTruthOrDareAnswer', {
      roomId: room.roomId,
      answerText: textAnswerInput.trim() || 'Done! Completed the challenge!',
      audioData: recordedUri || null,
    });
    setTextAnswerInput('');
    setRecordedUri(null);
  };

  // Couple Questions Category Switcher
  const handleSwitchCategory = (cat: string) => {
    onEmit('together:activity:switchCategory', { roomId: room.roomId, category: cat });
  };

  // Activity definition icon
  const getHeaderEmoji = () => {
    switch (currentActivityId) {
      case 'truth_or_dare':
        return '🔥';
      case 'this_or_that':
        return '⚖️';
      case 'daily_question':
        return '📅';
      case 'couple_questions':
        return '💬';
      default:
        return '🤔';
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.topCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.topHeaderRow}>
          <View style={styles.titleWithIcon}>
            <Text style={{ fontSize: 24 }}>{getHeaderEmoji()}</Text>
            <View>
              <Text style={[styles.activityTitle, { color: theme.foreground }]}>
                {currentActivityId === 'truth_or_dare'
                  ? 'Truth or Dare'
                  : currentActivityId === 'this_or_that'
                  ? 'This or That'
                  : currentActivityId === 'daily_question'
                  ? 'Daily Question'
                  : currentActivityId === 'couple_questions'
                  ? 'Couple Questions'
                  : 'Would You Rather'}
              </Text>
              <Text style={[styles.activitySubtitle, { color: theme.mutedText }]}>
                Prompt #{currentPromptIndex + 1}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.smallIconBtn, { backgroundColor: theme.accent }]} onPress={handleNextPrompt}>
            <RotateCcw size={14} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Category Switcher for Couple Questions */}
        {currentActivityId === 'couple_questions' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
            {['fun', 'memories', 'preferences', 'future', 'random'].map((cat) => {
              const isSelected = (activityState.category || 'fun') === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catPill,
                    { backgroundColor: theme.input, borderColor: theme.border },
                    isSelected && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                  onPress={() => handleSwitchCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      { color: isSelected ? '#fff' : theme.foreground },
                    ]}
                  >
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ─── 1. WOULD YOU RATHER & THIS OR THAT ─── */}
      {(currentActivityId === 'would_you_rather' || currentActivityId === 'this_or_that') && (
        <View style={[styles.activityCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.promptHeading, { color: theme.foreground }]}>
            {activityState.prompt ||
              (currentActivityId === 'would_you_rather'
                ? WOULD_YOU_RATHER_PROMPTS[currentPromptIndex % WOULD_YOU_RATHER_PROMPTS.length]?.prompt
                : THIS_OR_THAT_PROMPTS[currentPromptIndex % THIS_OR_THAT_PROMPTS.length]?.prompt) ||
              'Choose your preference:'}
          </Text>

          {/* Options */}
          <View style={styles.optionsWrap}>
            {(
              activityState.options ||
              (currentActivityId === 'would_you_rather'
                ? WOULD_YOU_RATHER_PROMPTS[currentPromptIndex % WOULD_YOU_RATHER_PROMPTS.length]?.options
                : THIS_OR_THAT_PROMPTS[currentPromptIndex % THIS_OR_THAT_PROMPTS.length]?.options) || [
                'Option 1',
                'Option 2',
              ]
            ).map((opt, idx) => {
              const isSelectedByMe = myAnswer === opt || myAnswer === idx;
              const isSelectedByPartner = partnerAnswer === opt || partnerAnswer === idx;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.scenarioBtn,
                    { backgroundColor: theme.input, borderColor: theme.border },
                    isSelectedByMe && {
                      borderColor: theme.accent,
                      backgroundColor: `${theme.accent}18`,
                    },
                  ]}
                  onPress={() => handleSelectOption(opt)}
                >
                  <Text style={[styles.scenarioText, { color: theme.foreground }]}>{opt}</Text>
                  {isRevealed && isSelectedByPartner && (
                    <View style={styles.partnerMatchBadge}>
                      <Heart size={11} color="#ec4899" />
                      <Text style={styles.partnerMatchText}>{partnerName}'s Pick</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Alignment Banner if revealed */}
          {isRevealed && (
            <View
              style={[
                styles.alignmentBanner,
                myAnswer === partnerAnswer
                  ? { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981' }
                  : { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: '#f59e0b' },
              ]}
            >
              <CheckCircle2 size={16} color={myAnswer === partnerAnswer ? '#10b981' : '#f59e0b'} />
              <Text
                style={[
                  styles.alignmentText,
                  { color: myAnswer === partnerAnswer ? '#10b981' : '#f59e0b' },
                ]}
              >
                {myAnswer === partnerAnswer
                  ? '100% Compatibility Match! You both chose the same! ❤️'
                  : 'Different perspectives! Opposites attract! ✨'}
              </Text>
            </View>
          )}

          <TouchableOpacity style={[styles.nextPromptBtn, { backgroundColor: theme.accent }]} onPress={handleNextPrompt}>
            <Text style={styles.nextPromptText}>Next Scenario ➡️</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── 2. TRUTH OR DARE ─── */}
      {currentActivityId === 'truth_or_dare' && (
        <View style={[styles.activityCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Turn status */}
          <View style={[styles.todTurnBanner, { backgroundColor: theme.muted }]}>
            <Sparkles size={14} color={theme.accent} />
            <Text style={[styles.todTurnText, { color: theme.foreground }]}>
              {isMyTodTurn
                ? "It's your turn to choose Truth or Dare!"
                : `It's ${partnerName}'s turn to choose Truth or Dare!`}
            </Text>
          </View>

          {/* Truth or Dare Selection */}
          {!activityState.truthOrDareChoice ? (
            <View style={styles.todChoiceRow}>
              <TouchableOpacity
                style={[styles.todBtn, { backgroundColor: 'rgba(6,182,212,0.15)', borderColor: '#06b6d4' }]}
                onPress={() => handleSelectTruthOrDare('truth')}
                disabled={!isMyTodTurn}
              >
                <Text style={{ fontSize: 26 }}>🤔</Text>
                <Text style={[styles.todBtnText, { color: '#06b6d4' }]}>TRUTH</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.todBtn, { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' }]}
                onPress={() => handleSelectTruthOrDare('dare')}
                disabled={!isMyTodTurn}
              >
                <Text style={{ fontSize: 26 }}>🔥</Text>
                <Text style={[styles.todBtnText, { color: '#ef4444' }]}>DARE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: '100%', gap: 10 }}>
              <View style={styles.todChoiceSelectedBanner}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.accent }}>
                  Selected: {activityState.truthOrDareChoice.toUpperCase()}
                </Text>
              </View>

              {/* Prompt Text or Audio */}
              <View style={[styles.todPromptBox, { backgroundColor: theme.input, borderColor: theme.border }]}>
                <Text style={[styles.todPromptText, { color: theme.foreground }]}>
                  {activityState.customPromptText ||
                    (activityState.truthOrDareChoice === 'truth'
                      ? TRUTH_PROMPTS[currentPromptIndex % TRUTH_PROMPTS.length]
                      : DARE_PROMPTS[currentPromptIndex % DARE_PROMPTS.length])}
                </Text>
                {activityState.customAudioUrl && (
                  <TouchableOpacity
                    style={[styles.audioPill, { backgroundColor: theme.accent }]}
                    onPress={() => playVoiceClip(activityState.customAudioUrl!)}
                  >
                    <Volume2 size={14} color="#ffffff" />
                    <Text style={styles.audioPillText}>Play Voice Prompt</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Answer submission for turn player */}
              {isMyTodTurn && !activityState.todAnswerText && (
                <View style={styles.todAnswerInputSection}>
                  <TextInput
                    style={[styles.todAnswerInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground }]}
                    placeholder="Type your truth answer or dare response..."
                    placeholderTextColor={theme.mutedText}
                    value={textAnswerInput}
                    onChangeText={setTextAnswerInput}
                  />

                  {/* Voice recording toggle */}
                  <TouchableOpacity
                    style={[styles.micBtn, isRecording && { backgroundColor: '#ef4444' }]}
                    onPress={isRecording ? stopVoiceRecording : startVoiceRecording}
                  >
                    {isRecording ? <Square size={14} color="#fff" /> : <Mic size={14} color={theme.foreground} />}
                    <Text style={[styles.micBtnText, { color: isRecording ? '#fff' : theme.foreground }]}>
                      {isRecording ? 'Stop Voice' : recordedUri ? 'Voice Done ✓' : 'Add Voice'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.todSubmitBtn, { backgroundColor: '#10b981' }]} onPress={handleSubmitTodAnswer}>
                    <Text style={styles.todSubmitBtnText}>Submit Response / Completed</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Show Answer if submitted */}
              {activityState.todAnswerText && (
                <View style={[styles.answerRevealedBox, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>Response from Partner:</Text>
                  <Text style={[styles.answerRevealedText, { color: theme.foreground }]}>
                    {activityState.todAnswerText}
                  </Text>
                  {activityState.todAnswerAudioUrl && (
                    <TouchableOpacity
                      style={[styles.audioPill, { backgroundColor: '#10b981', marginTop: 4 }]}
                      onPress={() => playVoiceClip(activityState.todAnswerAudioUrl!)}
                    >
                      <Volume2 size={14} color="#ffffff" />
                      <Text style={styles.audioPillText}>Play Voice Response</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={[styles.nextPromptBtn, { backgroundColor: theme.accent }]} onPress={handleNextPrompt}>
            <Text style={styles.nextPromptText}>Next Turn / Prompt ➡️</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── 3. DAILY QUESTION & COUPLE QUESTIONS ─── */}
      {(currentActivityId === 'daily_question' || currentActivityId === 'couple_questions') && (
        <View style={[styles.activityCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.promptHeading, { color: theme.foreground }]}>
            {activityState.prompt ||
              (currentActivityId === 'daily_question'
                ? DAILY_QUESTIONS[currentPromptIndex % DAILY_QUESTIONS.length]
                : (COUPLE_QUESTIONS_BY_CATEGORY[activityState.category || 'fun'] ||
                    COUPLE_QUESTIONS_BY_CATEGORY.fun)[
                    currentPromptIndex %
                      (COUPLE_QUESTIONS_BY_CATEGORY[activityState.category || 'fun'] ||
                        COUPLE_QUESTIONS_BY_CATEGORY.fun
                      ).length
                  ])}
          </Text>

          {/* Reflection text answer input */}
          {!hasMyAnswer ? (
            <View style={styles.reflectionInputWrap}>
              <TextInput
                style={[
                  styles.reflectionInput,
                  { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground },
                ]}
                placeholder="Write your honest reflection..."
                placeholderTextColor={theme.mutedText}
                multiline
                numberOfLines={3}
                value={textAnswerInput}
                onChangeText={setTextAnswerInput}
              />
              <TouchableOpacity
                style={[styles.submitAnswerBtn, { backgroundColor: theme.accent }]}
                onPress={handleSubmitTextAnswer}
              >
                <Text style={styles.submitAnswerText}>Submit Reflection</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.answeredStatusBox}>
              <Text style={[styles.answeredStatusText, { color: theme.mutedText }]}>
                {isRevealed ? 'Both reflections revealed!' : 'Your answer submitted! Waiting for partner...'}
              </Text>
            </View>
          )}

          {/* Revealed Answers Cards */}
          {isRevealed && (
            <View style={styles.revealedSection}>
              <View style={[styles.revealedCard, { backgroundColor: theme.input, borderColor: theme.border }]}>
                <Text style={[styles.revealedAuthor, { color: theme.accent }]}>YOUR REFLECTION:</Text>
                <Text style={[styles.revealedBody, { color: theme.foreground }]}>{String(myAnswer || '')}</Text>
              </View>

              <View style={[styles.revealedCard, { backgroundColor: theme.input, borderColor: theme.border }]}>
                <Text style={[styles.revealedAuthor, { color: '#ec4899' }]}>{partnerName.toUpperCase()}'S REFLECTION:</Text>
                <Text style={[styles.revealedBody, { color: theme.foreground }]}>{String(partnerAnswer || '')}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={[styles.nextPromptBtn, { backgroundColor: theme.accent }]} onPress={handleNextPrompt}>
            <Text style={styles.nextPromptText}>Next Question ➡️</Text>
          </TouchableOpacity>
        </View>
      )}
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
  activityTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  activitySubtitle: {
    fontSize: 10,
    fontWeight: '600',
  },
  smallIconBtn: {
    padding: 6,
    borderRadius: 10,
  },
  catScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 4,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  activityCard: {
    width: '100%',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  promptHeading: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    textAlign: 'center',
  },
  optionsWrap: {
    width: '100%',
    gap: 8,
  },
  scenarioBtn: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
  },
  scenarioText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  partnerMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  partnerMatchText: {
    fontSize: 10,
    color: '#ec4899',
    fontWeight: '700',
  },
  alignmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  alignmentText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  nextPromptBtn: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  nextPromptText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  todTurnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    gap: 6,
  },
  todTurnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  todChoiceRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  todBtn: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  todBtnText: {
    fontSize: 13,
    fontWeight: '900',
  },
  todChoiceSelectedBanner: {
    alignItems: 'center',
  },
  todPromptBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  todPromptText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  audioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  audioPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  todAnswerInputSection: {
    gap: 8,
    width: '100%',
  },
  todAnswerInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 12,
  },
  micBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  micBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  todSubmitBtn: {
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
  },
  todSubmitBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  answerRevealedBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  answerRevealedText: {
    fontSize: 12,
  },
  reflectionInputWrap: {
    gap: 8,
    width: '100%',
  },
  reflectionInput: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  submitAnswerBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitAnswerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  answeredStatusBox: {
    padding: 8,
    alignItems: 'center',
  },
  answeredStatusText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  revealedSection: {
    gap: 8,
    width: '100%',
  },
  revealedCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  revealedAuthor: {
    fontSize: 9,
    fontWeight: '800',
  },
  revealedBody: {
    fontSize: 12,
    lineHeight: 16,
  },
});
