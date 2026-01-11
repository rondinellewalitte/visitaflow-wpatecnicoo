// Tipos para a aplicação VisitaFlow

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  role?: string;
  is_active: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Visit {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  visit_type: 'installation' | 'maintenance' | 'delivery' | 'inspection' | 'equipment_pickup';
  status: 'open' | 'completed' | 'canceled';
  assigned_to: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}
