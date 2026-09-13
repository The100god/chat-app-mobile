import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface MediaViewerModalProps {
  visible: boolean;
  mediaUrls: string[];
  initialIndex?: number;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  visible,
  mediaUrls,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, visible]);

  if (!visible || mediaUrls.length === 0) return null;

  const currentUrl = mediaUrls[currentIndex] || mediaUrls[0];

  const handleNext = () => {
    if (currentIndex < mediaUrls.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {mediaUrls.length}
          </Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Media Content */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: currentUrl }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>

        {/* Previous / Next Navigation */}
        {mediaUrls.length > 1 ? (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity style={styles.prevBtn} onPress={handlePrev}>
                <ChevronLeft size={32} color="#ffffff" />
              </TouchableOpacity>
            )}

            {currentIndex < mediaUrls.length - 1 && (
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <ChevronRight size={32} color="#ffffff" />
              </TouchableOpacity>
            )}
          </>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  counterText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  imageContainer: {
    width,
    height: height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  prevBtn: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    padding: 8,
    zIndex: 10,
  },
  nextBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    padding: 8,
    zIndex: 10,
  },
});
