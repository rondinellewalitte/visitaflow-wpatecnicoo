// Utilitários para a aplicação

/**
 * Converte data e hora local para UTC (formato ISO string)
 */
export function localDateTimeToUTC(date: string, time: string): string {
  if (!date || !time) {
    throw new Error('Data e hora são obrigatórias');
  }
  
  const [hours, minutes] = time.split(':').map(Number);
  const localDate = new Date(date);
  localDate.setHours(hours, minutes, 0, 0);
  
  return localDate.toISOString();
}

/**
 * Converte UTC (formato ISO string) para data e hora local
 */
export function utcToLocalDateTime(utcString: string): { date: string; time: string } {
  const date = new Date(utcString);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  
  return { date: dateStr, time: timeStr };
}
