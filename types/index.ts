export interface Medication {
  id: string;
  name: string;
  pet_name: string;
  dosage: string | null;
  frequency: number;
  reminder_times: string[]; // ["08:00", "18:00"] 24h format
  active: boolean;
  created_at: string;
}

export interface DoseLog {
  id: string;
  medication_id: string;
  dose_number: number;
  dose_date: string; // YYYY-MM-DD
  given_at: string | null;
  given_by: string | null;
  created_at: string;
}

export interface TodayDose {
  medication: Medication;
  doseNumber: number;
  log: DoseLog | null;
}
