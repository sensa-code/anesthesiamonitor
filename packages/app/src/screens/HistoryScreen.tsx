import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  AnesthesiaSession,
  SPECIES_LABELS,
  formatDateTime,
  calculateDuration,
} from '@anesthesia/core';
import { RootStackParamList } from '../types';
import { loadSessions, deleteSession } from '../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export default function HistoryScreen({ navigation }: Props) {
  const [sessions, setSessions] = useState<AnesthesiaSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          setIsLoading(true);
          const all = await loadSessions();
          const finished = all
            .filter(s => !!s.endTime)
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
          setSessions(finished);
        } catch (error) {
          console.error('Failed to load sessions:', error);
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }, [])
  );

  const handleViewSession = (session: AnesthesiaSession) => {
    navigation.navigate('Results', { session, fromHistory: true });
  };

  const handleDeleteSession = async (sessionId: string) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('確定要刪除此筆歷史記錄嗎？刪除後無法復原。')
      : await new Promise<boolean>((resolve) => {
          Alert.alert('刪除記錄', '確定要刪除此筆歷史記錄嗎？刪除後無法復原。', [
            { text: '取消', style: 'cancel', onPress: () => resolve(false) },
            { text: '刪除', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });

    if (confirmDelete) {
      try {
        await deleteSession(sessionId);
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  const renderSessionItem = ({ item }: { item: AnesthesiaSession }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleViewSession(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.patientName}>{item.patientInfo.patientName}</Text>
          <Text style={styles.hospitalName}>{item.patientInfo.hospitalName}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteSession(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteButtonText}>刪除</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>病例</Text>
          <Text style={styles.infoValue}>{item.patientInfo.caseNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>種別</Text>
          <Text style={styles.infoValue}>
            {SPECIES_LABELS[item.patientInfo.species] ?? item.patientInfo.species}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>日期</Text>
          <Text style={styles.infoValue}>{formatDateTime(item.startTime)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>時長</Text>
          <Text style={styles.infoValue}>{calculateDuration(item.startTime, item.endTime)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>記錄</Text>
          <Text style={styles.infoValue}>{item.records.length} 筆</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>尚無歷史記錄</Text>
        <Text style={styles.emptySubtitle}>完成一筆麻醉記錄後，就會出現在這裡</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        renderItem={renderSessionItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cardHeaderLeft: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  hospitalName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#f44336',
    fontSize: 13,
    fontWeight: '600',
  },
  cardBody: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
    color: '#999',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
