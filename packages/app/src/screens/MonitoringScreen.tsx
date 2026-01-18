import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { VitalRecord, AnesthesiaSession, parseNumber, formatTime } from '@anesthesia/core';
import { RootStackParamList } from '../types';
import VitalInput from '../components/VitalInput';
import ResizableDivider from '../components/ResizableDivider';
import { saveSession } from '../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Monitoring'>;

export default function MonitoringScreen({ navigation, route }: Props) {
  const [session, setSession] = useState<AnesthesiaSession>(route.params.session);
  const [systolicBP, setSystolicBP] = useState('');
  const [diastolicBP, setDiastolicBP] = useState('');
  const [meanBP, setMeanBP] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [spO2, setSpO2] = useState('');
  const [etCO2, setEtCO2] = useState('');
  const [anesthesiaConc, setAnesthesiaConc] = useState('');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const isResumed = route.params.isResumed || false;

  // Web-only: resizable split ratio (0.55 = 55% for input section)
  const [splitRatio, setSplitRatio] = useState(0.55);
  const [containerHeight, setContainerHeight] = useState(0);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    // Subtract end button height (52 + 16*2 = 84) to get available content height
    setContainerHeight(height - 84);
  }, []);

  const handleResize = useCallback((ratio: number) => {
    setSplitRatio(ratio);
  }, []);

  useEffect(() => {
    const save = async () => {
      try {
        await saveSession(session);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    };
    save();
  }, [session]);

  const clearInputs = () => {
    setSystolicBP('');
    setDiastolicBP('');
    setMeanBP('');
    setHeartRate('');
    setRespiratoryRate('');
    setSpO2('');
    setEtCO2('');
    setAnesthesiaConc('');
    setTemperature('');
    setNotes('');
  };

  const handleSaveRecord = () => {
    const record: VitalRecord = {
      timestamp: editingIndex !== null
        ? session.records[editingIndex].timestamp
        : new Date().toISOString(),
      systolicBP: parseNumber(systolicBP),
      diastolicBP: parseNumber(diastolicBP),
      meanBP: parseNumber(meanBP),
      heartRate: parseNumber(heartRate),
      respiratoryRate: parseNumber(respiratoryRate),
      spO2: parseNumber(spO2),
      etCO2: parseNumber(etCO2),
      anesthesiaConc: parseNumber(anesthesiaConc),
      temperature: parseNumber(temperature),
      notes: notes.trim(),
    };

    if (editingIndex !== null) {
      // 編輯模式：更新現有記錄
      setSession((prev) => ({
        ...prev,
        records: prev.records.map((r, i) => i === editingIndex ? record : r),
      }));
      setEditingIndex(null);
      clearInputs();
      if (Platform.OS === 'web') {
        window.alert('已更新記錄');
      } else {
        Alert.alert('成功', '已更新記錄');
      }
    } else {
      // 新增模式：新增記錄
      setSession((prev) => ({
        ...prev,
        records: [...prev.records, record],
      }));
      clearInputs();
      if (Platform.OS === 'web') {
        window.alert('已儲存記錄');
      } else {
        Alert.alert('成功', '已儲存記錄');
      }
    }
  };

  const handleEditRecord = (index: number) => {
    const record = session.records[index];
    setSystolicBP(record.systolicBP !== null ? record.systolicBP.toString() : '');
    setDiastolicBP(record.diastolicBP !== null ? record.diastolicBP.toString() : '');
    setMeanBP(record.meanBP !== null ? record.meanBP.toString() : '');
    setHeartRate(record.heartRate !== null ? record.heartRate.toString() : '');
    setRespiratoryRate(record.respiratoryRate !== null ? record.respiratoryRate.toString() : '');
    setSpO2(record.spO2 !== null ? record.spO2.toString() : '');
    setEtCO2(record.etCO2 !== null ? record.etCO2.toString() : '');
    setAnesthesiaConc(record.anesthesiaConc !== null ? record.anesthesiaConc.toString() : '');
    setTemperature(record.temperature !== null ? record.temperature.toString() : '');
    setNotes(record.notes);
    setEditingIndex(index);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    clearInputs();
  };

  const handleDeleteRecord = async (index: number) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('確定要刪除此筆記錄嗎？')
      : await new Promise<boolean>((resolve) => {
          Alert.alert('刪除記錄', '確定要刪除此筆記錄嗎？', [
            { text: '取消', style: 'cancel', onPress: () => resolve(false) },
            { text: '刪除', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });

    if (confirmDelete) {
      setSession((prev) => ({
        ...prev,
        records: prev.records.filter((_, i) => i !== index),
      }));
      if (editingIndex === index) {
        setEditingIndex(null);
        clearInputs();
      }
    }
  };

  const handleEndRecording = async () => {
    const confirmEnd = Platform.OS === 'web'
      ? window.confirm('確定要結束此次麻醉記錄嗎？')
      : await new Promise<boolean>((resolve) => {
          Alert.alert('結束記錄', '確定要結束此次麻醉記錄嗎？', [
            { text: '取消', style: 'cancel', onPress: () => resolve(false) },
            { text: '確定', onPress: () => resolve(true) },
          ]);
        });

    if (confirmEnd) {
      const finalSession: AnesthesiaSession = {
        ...session,
        endTime: new Date().toISOString(),
      };
      await saveSession(finalSession);
      navigation.replace('Results', { session: finalSession });
    }
  };

  const renderRecordItem = ({ item, index }: { item: VitalRecord; index: number }) => {
    const actualIndex = session.records.length - 1 - index; // 因為列表是反向顯示的
    const isEditing = editingIndex === actualIndex;

    return (
      <View style={[styles.recordItem, isEditing && styles.recordItemEditing]}>
        <View style={styles.recordHeader}>
          <View>
            <Text style={styles.recordIndex}>#{actualIndex + 1}</Text>
            <Text style={styles.recordTime}>{formatTime(item.timestamp)}</Text>
          </View>
          <View style={styles.recordActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditRecord(actualIndex)}
            >
              <Text style={styles.editButtonText}>編輯</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteRecord(actualIndex)}
            >
              <Text style={styles.deleteButtonText}>刪除</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.recordValues}>
          <Text style={styles.recordValue}>收縮壓: {item.systolicBP ?? '-'}</Text>
          <Text style={styles.recordValue}>舒張壓: {item.diastolicBP ?? '-'}</Text>
          <Text style={styles.recordValue}>平均壓: {item.meanBP ?? '-'}</Text>
          <Text style={styles.recordValue}>心跳: {item.heartRate ?? '-'}</Text>
          <Text style={styles.recordValue}>呼吸: {item.respiratoryRate ?? '-'}</Text>
          <Text style={styles.recordValue}>血氧: {item.spO2 !== null ? `${item.spO2}%` : '-'}</Text>
          <Text style={styles.recordValue}>呼末二氧化碳: {item.etCO2 ?? '-'}</Text>
          <Text style={styles.recordValue}>麻醉濃度: {item.anesthesiaConc !== null ? `${item.anesthesiaConc}%` : '-'}</Text>
          <Text style={styles.recordValue}>體溫: {item.temperature !== null ? `${item.temperature}°C` : '-'}</Text>
        </View>
        {item.notes ? <Text style={styles.recordNotes}>備註: {item.notes}</Text> : null}
      </View>
    );
  };

  // Calculate dynamic heights for web
  const dividerHeight = 32; // 24px height + 8px margin
  const inputSectionHeight = Platform.OS === 'web' && containerHeight > 0
    ? containerHeight * splitRatio
    : undefined;
  const recordsSectionHeight = Platform.OS === 'web' && containerHeight > 0
    ? containerHeight * (1 - splitRatio) - dividerHeight
    : undefined;

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      <ScrollView
        style={[
          styles.inputSection,
          Platform.OS === 'web' && inputSectionHeight
            ? { maxHeight: inputSectionHeight, minHeight: inputSectionHeight, height: inputSectionHeight, flex: 0 }
            : null,
        ]}
        contentContainerStyle={styles.inputContent}
      >
        <View style={styles.patientInfo}>
          <View>
            <Text style={styles.hospitalName}>{session.patientInfo.hospitalName}</Text>
            <Text style={styles.patientName}>{session.patientInfo.patientName}</Text>
          </View>
          <Text style={styles.caseNumber}>病例: {session.patientInfo.caseNumber}</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.thirdInput}>
            <VitalInput
              label="收縮壓(Sys)"
              value={systolicBP}
              onChangeText={setSystolicBP}
              unit="mmHg"
            />
          </View>
          <View style={styles.thirdInput}>
            <VitalInput
              label="舒張壓(Dia)"
              value={diastolicBP}
              onChangeText={setDiastolicBP}
              unit="mmHg"
            />
          </View>
          <View style={styles.thirdInput}>
            <VitalInput
              label="平均壓(MAP)"
              value={meanBP}
              onChangeText={setMeanBP}
              unit="mmHg"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <VitalInput
              label="心跳(HR)"
              value={heartRate}
              onChangeText={setHeartRate}
              unit="bpm"
            />
          </View>
          <View style={styles.halfInput}>
            <VitalInput
              label="呼吸(RR)"
              value={respiratoryRate}
              onChangeText={setRespiratoryRate}
              unit="次/分"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <VitalInput
              label="血氧(SpO2)"
              value={spO2}
              onChangeText={setSpO2}
              unit="%"
            />
          </View>
          <View style={styles.halfInput}>
            <VitalInput
              label="呼末二氧化碳(EtCO2)"
              value={etCO2}
              onChangeText={setEtCO2}
              unit="mmHg"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <VitalInput
              label="麻醉濃度(MAC)"
              value={anesthesiaConc}
              onChangeText={setAnesthesiaConc}
              unit="%"
            />
          </View>
          <View style={styles.halfInput}>
            <VitalInput
              label="體溫(BT)"
              value={temperature}
              onChangeText={setTemperature}
              unit="°C"
            />
          </View>
        </View>

        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>備註(Others)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="輸入備註 (選填)"
            placeholderTextColor="#999"
            multiline
          />
        </View>

        {editingIndex !== null && (
          <View style={styles.editingBanner}>
            <Text style={styles.editingBannerText}>
              正在編輯第 {editingIndex + 1} 筆記錄
            </Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.saveButton, editingIndex !== null && styles.updateButton]}
            onPress={handleSaveRecord}
          >
            <Text style={styles.saveButtonText}>
              {editingIndex !== null ? '更新記錄' : '儲存記錄'}
            </Text>
          </TouchableOpacity>

          {editingIndex !== null && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
              <Text style={styles.cancelButtonText}>取消編輯</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {Platform.OS === 'web' && (
        <ResizableDivider
          currentRatio={splitRatio}
          onResize={handleResize}
          containerHeight={containerHeight}
          minTopRatio={0.1}
          maxTopRatio={0.9}
        />
      )}

      <View
        style={[
          styles.recordsSection,
          Platform.OS === 'web' && recordsSectionHeight
            ? { maxHeight: recordsSectionHeight, minHeight: recordsSectionHeight, height: recordsSectionHeight, flex: 0 }
            : null,
        ]}
      >
        <Text style={styles.recordsTitle}>
          已記錄: {session.records.length} 筆
        </Text>
        <FlatList
          data={[...session.records].reverse()}
          renderItem={renderRecordItem}
          keyExtractor={(item, index) => `${item.timestamp}-${index}`}
          style={styles.recordsList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <TouchableOpacity style={styles.endButton} onPress={handleEndRecording}>
        <Text style={styles.endButtonText}>結束記錄</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  inputSection: {
    flex: 1,
    maxHeight: '55%',
  },
  inputContent: {
    padding: 16,
  },
  patientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  hospitalName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  caseNumber: {
    fontSize: 14,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  thirdInput: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateButton: {
    backgroundColor: '#FF9800',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editingBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  editingBannerText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '600',
  },
  recordsSection: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
  },
  recordsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recordsList: {
    flex: 1,
  },
  recordItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  recordItemEditing: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  recordIndex: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 2,
  },
  recordTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  recordValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recordValue: {
    fontSize: 12,
    color: '#333',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recordNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  notesContainer: {
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notesInput: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  endButton: {
    backgroundColor: '#f44336',
    height: 52,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
