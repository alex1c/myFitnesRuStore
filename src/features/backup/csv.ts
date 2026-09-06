/**
 * CSV export helpers for completed workout sets.
 * Semicolon delimiter + UTF-8 BOM for Russian Excel compatibility.
 */
export const CSV_DELIMITER = ';' as const
export const CSV_HEADERS = [
	'workout_date',
	'workout_name',
	'exercise_name',
	'exercise_id',
	'set_number',
	'set_type',
	'tracking_type',
	'weight_kg',
	'reps',
	'duration_seconds',
	'distance',
	'workout_notes',
	'exercise_notes',
	'workout_id',
] as const

export type CsvSetRow = {
	workoutDate: string
	workoutName: string
	exerciseName: string
	exerciseId: string
	setNumber: number
	setType: string
	trackingType: string
	weightKg: number | null
	reps: number | null
	durationSeconds: number | null
	distance: number | null
	workoutNotes: string | null
	exerciseNotes: string | null
	workoutId: string
}

/** Escape a CSV field for semicolon-delimited UTF-8 output. */
export function escapeCsvField (value: string): string {
	if (
		value.includes('"')
		|| value.includes('\n')
		|| value.includes('\r')
		|| value.includes(CSV_DELIMITER)
	) {
		return `"${value.replace(/"/g, '""')}"`
	}
	return value
}

function formatMachineDecimal (value: number): string {
	if (Number.isInteger(value)) {
		return String(value)
	}
	return String(value)
}

export function buildWorkoutsCsv (rows: CsvSetRow[]): string {
	const lines = [CSV_HEADERS.join(CSV_DELIMITER)]
	for (const row of rows) {
		lines.push(
			[
				escapeCsvField(row.workoutDate),
				escapeCsvField(row.workoutName),
				escapeCsvField(row.exerciseName),
				escapeCsvField(row.exerciseId),
				String(row.setNumber),
				escapeCsvField(row.setType),
				escapeCsvField(row.trackingType),
				row.weightKg === null ? '' : formatMachineDecimal(row.weightKg),
				row.reps === null ? '' : String(row.reps),
				row.durationSeconds === null ? '' : String(row.durationSeconds),
				row.distance === null ? '' : formatMachineDecimal(row.distance),
				escapeCsvField(row.workoutNotes ?? ''),
				escapeCsvField(row.exerciseNotes ?? ''),
				escapeCsvField(row.workoutId),
			].join(CSV_DELIMITER),
		)
	}
	// BOM helps Excel detect UTF-8.
	return `\uFEFF${lines.join('\r\n')}\r\n`
}
