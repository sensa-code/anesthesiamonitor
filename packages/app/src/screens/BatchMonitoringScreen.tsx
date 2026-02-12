import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AnesthesiaSession, VitalRecord, parseNumber, formatTime } from '@anesthesia/core';
import { RootStackParamList } from '../types';
import { saveSession } from '../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'BatchMonitoring'>;

interface BatchRow {
  time: string;
  systolicBP: string;
  diastolicBP: string;
  meanBP: string;
  heartRate: string;
  respiratoryRate: string;
  spO2: string;
  etCO2: string;
  anesthesiaConc: string;
  temperature: string;
  notes: string;
}

const VITAL_COLUMNS: { key: keyof BatchRow; label: string; unit: string; width: number }[] = [
  { key: 'time', label: '時間', unit: '', width: 72 },
  { key: 'systolicBP', label: 'Sys', unit: 'mmHg', width: 60 },
  { key: 'diastolicBP', label: 'Dia', unit: 'mmHg', width: 60 },
  { key: 'meanBP', label: 'MAP', unit: 'mmHg', width: 60 },
  { key: 'heartRate', label: 'HR', unit: 'bpm', width: 56 },
  { key: 'respiratoryRate', label: 'RR', unit: '次/分', width: 56 },
  { key: 'spO2', label: 'SpO2', unit: '%', width: 56 },
  { key: 'etCO2', label: 'EtCO2', unit: 'mmHg', width: 60 },
  { key: 'anesthesiaConc', label: 'MAC', unit: '%', width: 56 },
  { key: 'temperature', label: 'BT', unit: '°C', width: 56 },
  { key: 'notes', label: '備註', unit: '', width: 100 },
];

const DELETE_COL_WIDTH = 36;

function createEmptyRow(defaultTime: string): BatchRow {
  return {
    time: defaultTime,
    systolicBP: '',
    diastolicBP: '',
    meanBP: '',
    heartRate: '',
    respiratoryRate: '',
    spO2: '',
    etCO2: '',
    anesthesiaConc: '',
    temperature: '',
    notes: '',
  };
}

function formatHHMM(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function addMinutes(timeStr: string, minutes: number): string {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return timeStr;
  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10) + minutes;
  h += Math.floor(m / 60);
  m = m % 60;
  if (h >= 24) h = h % 24;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function parseTimeToISO(timeStr: string, sessionStartTime: string): string {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return new Date().toISOString();
  const baseDate = new Date(sessionStartTime);
  baseDate.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  return baseDate.toISOString();
}

function recordToRow(record: VitalRecord): BatchRow {
  return {
    time: formatHHMM(record.timestamp),
    systolicBP: record.systolicBP !== null ? String(record.systolicBP) : '',
    diastolicBP: record.diastolicBP !== null ? String(record.diastolicBP) : '',
    meanBP: record.meanBP !== null ? String(record.meanBP) : '',
    heartRate: record.heartRate !== null ? String(record.heartRate) : '',
    respiratoryRate: record.respiratoryRate !== null ? String(record.respiratoryRate) : '',
    spO2: record.spO2 !== null ? String(record.spO2) : '',
    etCO2: record.etCO2 !== null ? String(record.etCO2) : '',
    anesthesiaConc: record.anesthesiaConc !== null ? String(record.anesthesiaConc) : '',
    temperature: record.temperature !== null ? String(record.temperature) : '',
    notes: record.notes || '',
  };
}

function rowToRecord(row: BatchRow, sessionStartTime: string): VitalRecord | null {
  // Skip completely empty rows
  const hasAnyValue = row.systolicBP || row.diastolicBP || row.meanBP ||
    row.heartRate || row.respiratoryRate || row.spO2 ||
    row.etCO2 || row.anesthesiaConc || row.temperature || row.notes;
  if (!hasAnyValue && !row.time) return null;
  if (!hasAnyValue) return null;

  return {
    timestamp: parseTimeToISO(row.time, sessionStartTime),
    systolicBP: parseNumber(row.systolicBP),
    diastolicBP: parseNumber(row.diastolicBP),
    meanBP: parseNumber(row.meanBP),
    heartRate: parseNumber(row.heartRate),
    respiratoryRate: parseNumber(row.respiratoryRate),
    spO2: parseNumber(row.spO2),
    etCO2: parseNumber(row.etCO2),
    anesthesiaConc: parseNumber(row.anesthesiaConc),
    temperature: parseNumber(row.temperature),
    notes: row.notes.trim(),
  };
}

export default function BatchMonitoringScreen({ navigation, route }: Props) {
  const [session, setSession] = useState<AnesthesiaSession>(route.params.session);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const isInitialized = useRef(false);

  // Initialize rows from session.records
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const existingRows = session.records.map(recordToRow);
    const lastTime = existingRows.length > 0
      ? existingRows[existingRows.length - 1].time
      : formatHHMM(session.startTime);
    const nextTime = addMinutes(lastTime, 5);
    setRows([...existingRows, createEmptyRow(nextTime)]);
  }, [session]);

  // Auto-save when session changes
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

  const syncRowsToSession = useCallback((currentRows: BatchRow[]) => {
    const records: VitalRecord[] = [];
    for (const row of currentRows) {
      const record = rowToRecord(row, session.startTime);
      if (record) records.push(record);
    }
    setSession(prev => ({ ...prev, records }));
  }, [session.startTime]);

  const handleCellChange = (rowIndex: number, key: keyof BatchRow, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [key]: value };
      return updated;
    });
  };

  const handleCellBlur = () => {
    syncRowsToSession(rows);
  };

  const handleAddRow = () => {
    const lastTime = rows.length > 0 ? rows[rows.length - 1].time : formatHHMM(session.startTime);
    const nextTime = addMinutes(lastTime, 5);
    setRows(prev => [...prev, createEmptyRow(nextTime)]);
  };

  const handleDeleteRow = async (index: number) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('確定要刪除此行嗎？')
      : await new Promise<boolean>((resolve) => {
          Alert.alert('刪除', '確定要刪除此行嗎？', [
            { text: '取消', style: 'cancel', onPress: () => resolve(false) },
            { text: '刪除', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });

    if (confirmDelete) {
      const updated = rows.filter((_, i) => i !== index);
      setRows(updated);
      syncRowsToSession(updated);
    }
  };

  const handleSwitchToRealtime = () => {
    // Compute records directly from rows to avoid stale state
    const records: VitalRecord[] = [];
    for (const row of rows) {
      const record = rowToRecord(row, session.startTime);
      if (record) records.push(record);
    }
    // 更新 startTime 以反映批次輸入的最早記錄時間
    let startTime = session.startTime;
    if (records.length > 0) {
      const timestamps = records.map(r => new Date(r.timestamp).getTime()).filter(t => !isNaN(t));
      if (timestamps.length > 0) {
        const earliest = Math.min(...timestamps);
        if (earliest < new Date(startTime).getTime()) {
          startTime = new Date(earliest).toISOString();
        }
      }
    }
    const updatedSession = { ...session, records, startTime };
    saveSession(updatedSession);
    navigation.replace('Monitoring', { session: updatedSession, isResumed: true });
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
      // Sync rows first
      const records: VitalRecord[] = [];
      for (const row of rows) {
        const record = rowToRecord(row, session.startTime);
        if (record) records.push(record);
      }

      // 批次記錄模式：startTime/endTime 應以實際記錄的時間範圍為準
      // 而非 App 操作時間（因為是事後補登）
      let startTime = session.startTime;
      let endTime = new Date().toISOString();
      if (records.length > 0) {
        const timestamps = records.map(r => new Date(r.timestamp).getTime()).filter(t => !isNaN(t));
        if (timestamps.length > 0) {
          startTime = new Date(Math.min(...timestamps)).toISOString();
          endTime = new Date(Math.max(...timestamps)).toISOString();
        }
      }

      const finalSession: AnesthesiaSession = {
        ...session,
        records,
        startTime,
        endTime,
      };
      await saveSession(finalSession);
      navigation.replace('Results', { session: finalSession });
    }
  };

  const tableWidth = DELETE_COL_WIDTH + VITAL_COLUMNS.reduce((sum, col) => sum + col.width, 0);

  return (
    <View style={styles.container}>
      {/* Patient info bar */}
      <View style={styles.patientInfo}>
        <View>
          <Text style={styles.hospitalName}>{session.patientInfo.hospitalName}</Text>
          <Text style={styles.patientName}>{session.patientInfo.patientName}</Text>
        </View>
        <Text style={styles.caseNumber}>病例: {session.patientInfo.caseNumber}</Text>
      </View>

      {/* Table */}
      <ScrollView style={styles.tableContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={{ width: tableWidth }}>
            {/* Header row */}
            <View style={styles.headerRow}>
              <View style={[styles.deleteCol, styles.headerCell]} />
              {VITAL_COLUMNS.map(col => (
                <View key={col.key} style={[styles.headerCell, { width: col.width }]}>
                  <Text style={styles.headerText}>{col.label}</Text>
                  {col.unit ? <Text style={styles.headerUnit}>{col.unit}</Text> : null}
                </View>
              ))}
            </View>

            {/* Data rows */}
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.dataRow}>
                <TouchableOpacity
                  style={styles.deleteCol}
                  onPress={() => handleDeleteRow(rowIndex)}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
                {VITAL_COLUMNS.map(col => (
                  <View key={col.key} style={[styles.cellContainer, { width: col.width }]}>
                    <TextInput
                      style={[
                        styles.cellInput,
                        col.key === 'notes' && styles.notesCellInput,
                      ]}
                      value={row[col.key]}
                      onChangeText={(text) => handleCellChange(rowIndex, col.key, text)}
                      onBlur={handleCellBlur}
                      placeholder={col.key === 'time' ? 'HH:MM' : ''}
                      placeholderTextColor="#ccc"
                      keyboardType={col.key === 'time' || col.key === 'notes' ? 'default' : 'decimal-pad'}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Bottom buttons */}
      <View style={styles.bottomBar}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddRow}>
            <Text style={styles.addButtonText}>+ 新增一行</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.switchButton} onPress={handleSwitchToRealtime}>
            <Text style={styles.switchButtonText}>切換即時記錄</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.endButton} onPress={handleEndRecording}>
          <Text style={styles.endButtonText}>結束記錄</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  patientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  hospitalName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  caseNumber: {
    fontSize: 14,
    color: '#666',
  },
  tableContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    borderBottomWidth: 1,
    borderBottomColor: '#1976D2',
  },
  headerCell: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.2)',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  headerUnit: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  deleteCol: {
    width: DELETE_COL_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600',
  },
  cellContainer: {
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  cellInput: {
    height: 40,
    paddingHorizontal: 4,
    fontSize: 13,
    textAlign: 'center',
    color: '#333',
  },
  notesCellInput: {
    textAlign: 'left',
  },
  bottomBar: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  switchButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  endButton: {
    backgroundColor: '#f44336',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
