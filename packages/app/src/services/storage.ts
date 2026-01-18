import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnesthesiaSession } from '@anesthesia/core';

const SESSIONS_KEY = 'anesthesia_sessions';

export async function saveSessions(sessions: AnesthesiaSession[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving sessions:', error);
    throw error;
  }
}

export async function loadSessions(): Promise<AnesthesiaSession[]> {
  try {
    const data = await AsyncStorage.getItem(SESSIONS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
}

export async function saveSession(session: AnesthesiaSession): Promise<void> {
  try {
    const sessions = await loadSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    await saveSessions(sessions);
  } catch (error) {
    console.error('Error saving session:', error);
    throw error;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const sessions = await loadSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    await saveSessions(filtered);
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}
