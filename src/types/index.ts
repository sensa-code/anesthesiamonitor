export type Species = 'dog' | 'cat' | 'other';

export interface PatientInfo {
  patientName: string;
  caseNumber: string;
  weight: number;
  species: Species;
}

export interface VitalRecord {
  timestamp: string;
  systolicBP: number | null;      // 收縮壓
  diastolicBP: number | null;     // 舒張壓
  heartRate: number | null;       // 心跳
  respiratoryRate: number | null; // 呼吸
  spO2: number | null;            // 血氧
  anesthesiaConc: number | null;  // 麻醉濃度
  temperature: number | null;     // 體溫
  notes: string;                  // 備註
}

export interface AnesthesiaSession {
  id: string;
  patientInfo: PatientInfo;
  startTime: string;
  endTime?: string;
  records: VitalRecord[];
}

export type RootStackParamList = {
  PatientInfo: undefined;
  Monitoring: { session: AnesthesiaSession; isResumed?: boolean };
  Results: { session: AnesthesiaSession };
};
