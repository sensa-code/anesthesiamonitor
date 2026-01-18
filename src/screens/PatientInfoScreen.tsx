import React, { useState } from 'react';
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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Species, AnesthesiaSession } from '../types';
import { generateSessionId } from '../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'PatientInfo'>;

export default function PatientInfoScreen({ navigation }: Props) {
  const [patientName, setPatientName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [weight, setWeight] = useState('');
  const [species, setSpecies] = useState<Species>('dog');

  const showAlert = (message: string) => {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('錯誤', message);
    }
  };

  const validateForm = (): boolean => {
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
});
