import { AnesthesiaSession } from '@anesthesia/core';

export type RootStackParamList = {
  PatientInfo: undefined;
  History: undefined;
  Monitoring: { session: AnesthesiaSession; isResumed?: boolean };
  BatchMonitoring: { session: AnesthesiaSession; isResumed?: boolean };
  Results: { session: AnesthesiaSession; fromHistory?: boolean };
};
