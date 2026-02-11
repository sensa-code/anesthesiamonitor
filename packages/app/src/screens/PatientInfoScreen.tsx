import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Species, AnesthesiaSession, generateSessionId, formatDateTime, SPECIES_LABELS } from '@anesthesia/core';
import { RootStackParamList } from '../types';
import { loadSessions, deleteSession } from '../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'PatientInfo'>;

export default function PatientInfoScreen({ navigation }: Props) {
  const [hospitalName, setHospitalName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [weight, setWeight] = useState('');
  const [species, setSpecies] = useState<Species>('dog');
  const [isLoading, setIsLoading] = useState(true);
  const [unfinishedSession, setUnfinishedSession] = useState<AnesthesiaSession | null>(null);

  const checkUnfinishedSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const sessions = await loadSessions();
      const unfinished = sessions
        .filter(s => !s.endTime)
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setUnfinishedSession(unfinished.length > 0 ? unfinished[0] : null);
    } catch (error) {
      console.error('Failed to check unfinished sessions:', error);
      setUnfinishedSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkUnfinishedSessions();
    }, [checkUnfinishedSessions])
  );

  const handleResumeSession = () => {
    if (!unfinishedSession) return;
    setUnfinishedSession(null);
    navigation.navigate('Monitoring', { session: unfinishedSession, isResumed: true });
  };

  const handleDiscardSession = async () => {
    if (!unfinishedSession) return;
    try {
      await deleteSession(unfinishedSession.id);
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
    setUnfinishedSession(null);
  };

  const showAlert = (message: string) => {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('錯誤', message);
    }
  };

  const validateForm = (): boolean => {
    if (!hospitalName.trim()) {
      showAlert('請輸入動物醫院名');
      return false;
    }
    if (!patientName.trim()) {
      showAlert('請輸入病患名稱');
      return false;
    }
    if (!caseNumber.trim()) {
      showAlert('請輸入病例編號');
      return false;
    }
    if (!weight.trim() || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) {
      showAlert('請輸入有效的體重');
      return false;
    }
    return true;
  };

  const handleStartRecording = () => {
    if (!validateForm()) return;

    const session: AnesthesiaSession = {
      id: generateSessionId(),
      patientInfo: {
        hospitalName: hospitalName.trim(),
        patientName: patientName.trim(),
        caseNumber: caseNumber.trim(),
        weight: parseFloat(weight),
        species,
      },
      startTime: new Date().toISOString(),
      records: [],
    };

    navigation.navigate('Monitoring', { session });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formGroup}>
          <Text style={styles.label}>動物醫院名 *</Text>
          <TextInput
            style={styles.input}
            value={hospitalName}
            onChangeText={setHospitalName}
            placeholder="輸入動物醫院名稱"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>病患名稱 *</Text>
          <TextInput
            style={styles.input}
            value={patientName}
            onChangeText={setPatientName}
            placeholder="輸入病患名稱"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>病例編號 *</Text>
          <TextInput
            style={styles.input}
            value={caseNumber}
            onChangeText={setCaseNumber}
            placeholder="輸入病例編號"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>體重 (kg) *</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            placeholder="輸入體重"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>動物種別 *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={species}
              onValueChange={(value) => setSpecies(value)}
              style={styles.picker}
            >
              <Picker.Item label="犬" value="dog" />
              <Picker.Item label="貓" value="cat" />
              <Picker.Item label="其他" value="other" />
            </Picker>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleStartRecording}>
          <Text style={styles.buttonText}>開始記錄</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={unfinishedSession !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDiscardSession}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>發現未完成的記錄</Text>

            {unfinishedSession && (
              <View style={styles.modalSessionInfo}>
                <Text style={styles.modalInfoText}>
                  病患：{unfinishedSession.patientInfo.patientName}
                </Text>
                <Text style={styles.modalInfoText}>
                  醫院：{unfinishedSession.patientInfo.hospitalName}
                </Text>
                <Text style={styles.modalInfoText}>
                  病例：{unfinishedSession.patientInfo.caseNumber}
                </Text>
                <Text style={styles.modalInfoText}>
                  種別：{SPECIES_LABELS[unfinishedSession.patientInfo.species]}
                  ，{unfinishedSession.patientInfo.weight} kg
                </Text>
                <Text style={styles.modalInfoText}>
                  開始時間：{formatDateTime(unfinishedSession.startTime)}
                </Text>
                <Text style={styles.modalInfoText}>
                  已記錄：{unfinishedSession.records.length} 筆數據
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.resumeButton]}
                onPress={handleResumeSession}
              >
                <Text style={styles.modalButtonText}>繼續記錄</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.discardButton]}
                onPress={handleDiscardSession}
              >
                <Text style={styles.discardButtonText}>捨棄並開始新記錄</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
  },
  button: {
    backgroundColor: '#2196F3',
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSessionInfo: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
  },
  discardButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  discardButtonText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '600',
  },
});
