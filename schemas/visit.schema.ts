import { z } from "zod"

// Visit type enum
export const visitTypeEnum = z.enum(["installation", "maintenance", "delivery", "inspection", "equipment_pickup"], {
  errorMap: () => ({ message: "Tipo de visita inválido" }),
})

// Visit status enum
export const visitStatusEnum = z.enum(["open", "completed", "canceled"], {
  errorMap: () => ({ message: "Status inválido" }),
})

// Create visit schema (for form - with separate date and time)
export const createVisitFormSchema = z.object({
  client_id: z.string().uuid("Cliente inválido"),
  title: z.string().min(3, "Título precisa ter no mínimo 3 caracteres").max(200, "Título muito longo"),
  description: z.string().optional(),
  scheduled_date: z.string().min(1, "Data é obrigatória"),
  scheduled_time: z.string().min(1, "Hora é obrigatória"),
  visit_type: visitTypeEnum,
  status: visitStatusEnum,
  notes: z.string().optional(),
  assigned_to: z.string().uuid("Funcionário inválido").optional().nullable(),
})

export type CreateVisitFormInput = z.infer<typeof createVisitFormSchema>

// Create visit schema (for API - with combined datetime)
export const createVisitSchema = z.object({
  client_id: z.string().uuid("Cliente inválido"),
  title: z.string().min(3, "Título precisa ter no mínimo 3 caracteres").max(200, "Título muito longo"),
  description: z.string().optional().nullable(),
  scheduled_date: z.string().min(1, "Data agendada é obrigatória"),
  visit_type: visitTypeEnum,
  status: visitStatusEnum,
  notes: z.string().optional().nullable(),
  assigned_to: z.string().uuid("Funcionário inválido").optional().nullable(),
})

export type CreateVisitInput = z.infer<typeof createVisitSchema>

// Update visit form schema (for form - with separate date and time)
export const updateVisitFormSchema = z.object({
  id: z.string().uuid("ID da visita inválido"),
  client_id: z.string().uuid("Cliente inválido").optional(),
  title: z.string().min(3, "Título precisa ter no mínimo 3 caracteres").max(200, "Título muito longo").optional(),
  description: z.string().optional(),
  scheduled_date: z.string().min(1, "Data é obrigatória").optional(),
  scheduled_time: z.string().min(1, "Hora é obrigatória").optional(),
  visit_type: visitTypeEnum.optional(),
  status: visitStatusEnum.optional(),
  notes: z.string().optional(),
  assigned_to: z.string().uuid("Funcionário inválido").optional().nullable(),
})

export type UpdateVisitFormInput = z.infer<typeof updateVisitFormSchema>

// Update visit schema (for API - with combined datetime)
export const updateVisitSchema = z.object({
  id: z.string().uuid("ID da visita inválido"),
  client_id: z.string().uuid("Cliente inválido").optional(),
  title: z.string().min(3, "Título precisa ter no mínimo 3 caracteres").max(200, "Título muito longo").optional(),
  description: z.string().optional().nullable(),
  scheduled_date: z.string().min(1, "Data agendada é obrigatória").optional(),
  visit_type: visitTypeEnum.optional(),
  status: visitStatusEnum.optional(),
  notes: z.string().optional().nullable(),
  assigned_to: z.string().uuid("Funcionário inválido").optional().nullable(),
})

export type UpdateVisitInput = z.infer<typeof updateVisitSchema>
