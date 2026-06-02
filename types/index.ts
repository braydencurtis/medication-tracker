export interface Medication {
  id: string;
  name: string;
  pet_name: string | null;  // kept for display; new records use pet_id instead
  pet_id: string | null;
  dosage: string | null;
  frequency: number;
  reminder_times: string[];
  days_of_week: number[];   // 0=Sun … 6=Sat; defaults to all 7
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
  status: 'pending' | 'approved' | 'rejected';
  avatar_path: string | null;
  created_at: string;
}

export interface Pet {
  id: string;
  family_id: string;
  name: string;
  species: string | null;
  breed: string | null;
  profile_photo_path: string | null;
  created_at: string;
}

export interface PetPhoto {
  id: string;
  pet_id: string;
  storage_path: string;
  photo_type: 'profile' | 'pre_medication' | 'post_medication' | 'other';
  display_order: number;
  caption: string | null;
  created_at: string;
}
