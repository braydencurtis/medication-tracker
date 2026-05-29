export interface Medication {
  id: string;
  name: string;
  pet_name: string;
  dosage: string | null;
  frequency: number;
  reminder_times: string[];
  active: boolean;
  family_id: string | null;
  created_at: string;
}

export interface DoseLog {
  id: string;
  medication_id: string;
  dose_number: number;
  dose_date: string;
  given_at: string | null;
  given_by: string | null;
  created_at: string;
}

export interface TodayDose {
  medication: Medication;
  doseNumber: number;
  log: DoseLog | null;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  display_name: string;
  created_at: string;
}
