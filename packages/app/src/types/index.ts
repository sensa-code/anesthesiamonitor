import { AnesthesiaSession } from '@anesthesia/core';

export type RootStackParamList = {
  PatientInfo: undefined;
  Monitoring: { session: AnesthesiaSession; isResumed?: boolean };
  Results: { session: AnesthesiaSession };
};
