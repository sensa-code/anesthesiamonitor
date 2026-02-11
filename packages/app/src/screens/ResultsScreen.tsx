import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SPECIES_LABELS, formatDateTime, calculateDuration } from '@anesthesia/core';
import { RootStackParamList } from '../types';
import VitalChart from '../components/VitalChart';
import { exportCSV } from '../services/export';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

export default function ResultsScreen({ navigation, route }: Props) {
  const { session, fromHistory } = route.params;
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await exportCSV(session);
    } catch (error) {
      Alert.alert('錯誤', '匯出失敗，請重試');
    } finally {
      setIsExporting(false);
    }
  };

  const handleGoHome = () => {
    if (fromHistory) {
      navigation.goBack();
    } else {
      navigation.popToTop();
    }
  };

  const handleBackToEdit = () => {
    // 移除 endTime 讓 session 回到編輯模式
    const editableSession = {
      ...session,
      endTime: undefined,
    };
    navigation.replace('Monitoring', { session: editableSession, isResumed: true });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>病患資訊</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>動物醫院</Text>
            <Text style={styles.infoValue}>{session.patientInfo.hospitalName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>病患名稱</Text>
            <Text style={styles.infoValue}>{session.patientInfo.patientName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>病例編號</Text>
            <Text style={styles.infoValue}>{session.patientInfo.caseNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>動物種別</Text>
            <Text style={styles.infoValue}>
              {SPECIES_LABELS[session.patientInfo.species]}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>體重</Text>
            <Text style={styles.infoValue}>{session.patientInfo.weight} kg</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>開始時間</Text>
            <Text style={styles.infoValue}>{formatDateTime(session.startTime)}</Text>
          </View>
          {session.endTime && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>結束時間</Text>
              <Text style={styles.infoValue}>{formatDateTime(session.endTime)}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>總時長</Text>
            <Text style={styles.infoValue}>{calculateDuration(session.startTime, session.endTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>記錄筆數</Text>
            <Text style={styles.infoValue}>{session.records.length} 筆</Text>
          </View>
        </View>

        {session.records.length > 0 ? (
          <View style={styles.chartsSection}>
            <Text style={styles.sectionTitle}>生理數值趨勢</Text>

            <VitalChart
              records={session.records}
              title="收縮壓"
              dataKey="systolicBP"
              color="#e53935"
              unit="mmHg"
            />

            <VitalChart
              records={session.records}
              title="舒張壓"
              dataKey="diastolicBP"
              color="#c62828"
              unit="mmHg"
            />

            <VitalChart
              records={session.records}
              title="平均壓"
              dataKey="meanBP"
              color="#ad1457"
              unit="mmHg"
            />

            <VitalChart
              records={session.records}
              title="心跳"
              dataKey="heartRate"
              color="#d81b60"
              unit="bpm"
            />

            <VitalChart
              records={session.records}
              title="呼吸"
              dataKey="respiratoryRate"
              color="#8e24aa"
              unit="次/分"
            />

            <VitalChart
              records={session.records}
              title="血氧"
              dataKey="spO2"
              color="#1e88e5"
              unit="%"
            />

            <VitalChart
              records={session.records}
              title="呼末二氧化碳"
              dataKey="etCO2"
              color="#0277bd"
              unit="mmHg"
            />

            <VitalChart
              records={session.records}
              title="麻醉濃度"
              dataKey="anesthesiaConc"
              color="#43a047"
              unit="%"
            />

            <VitalChart
              records={session.records}
              title="體溫"
              dataKey="temperature"
              color="#fb8c00"
              unit="°C"
            />
          </View>
        ) : (
          <View style={styles.noDataCard}>
            <Text style={styles.noDataText}>無記錄資料</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          {!fromHistory && (
            <TouchableOpacity
              style={[styles.button, styles.backButton]}
              onPress={handleBackToEdit}
            >
              <Text style={styles.buttonText}>返回編輯</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.exportButton]}
            onPress={handleExportCSV}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>匯出 PDF</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.homeButton, styles.fullWidthButton]}
          onPress={handleGoHome}
        >
          <Text style={styles.buttonText}>返回首頁</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  chartsSection: {
    marginTop: 8,
  },
  noDataCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#f5f5f5',
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidthButton: {
    flex: undefined,
    width: '100%',
  },
  backButton: {
    backgroundColor: '#FF9800',
  },
  exportButton: {
    backgroundColor: '#4CAF50',
  },
  homeButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
