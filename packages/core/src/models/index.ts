export type Species = 'dog' | 'cat' | 'other';

export interface PatientInfo {
  patientName: string;
  caseNumber: string;
  weight: number;
  species: Species;
}

export interface VitalRecord {
  timestamp: string;
  systolicBP: number | null;      // 收縮壓 (Sys)
  diastolicBP: number | null;     // 舒張壓 (Dia)
  meanBP: number | null;          // 平均壓 (MAP)
  heartRate: number | null;       // 心跳 (HR)
  respiratoryRate: number | null; // 呼吸 (RR)
  spO2: number | null;            // 血氧 (SpO2)
  etCO2: number | null;           // 呼末二氧化碳 (EtCO2)
  anesthesiaConc: number | null;  // 麻醉濃度 (MAC)
  temperature: number | null;     // 體溫 (BT)
  notes: string;                  // 備註 (Others)
}

export interface AnesthesiaSession {
  id: string;
  patientInfo: PatientInfo;
  startTime: string;
  endTime?: string;
  records: VitalRecord[];
}
