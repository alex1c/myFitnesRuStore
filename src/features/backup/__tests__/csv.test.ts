/**
 * Unit tests for CSV export escaping and formatting.
 */
import {
	buildWorkoutsCsv,
	CSV_DELIMITER,
	CSV_HEADERS,
	escapeCsvField,
	type CsvSetRow,
} from '@/src/features/backup/csv'

describe('CSV export helpers', () => {
	it('uses semicolon headers and UTF-8 BOM', () => {
		const csv = buildWorkoutsCsv([])
		expect(csv.startsWith('\uFEFF')).toBe(true)
		expect(csv).toContain(CSV_HEADERS.join(CSV_DELIMITER))
	})

	it('quotes special characters and keeps Russian text', () => {
		expect(escapeCsvField('Плечо, чуть болело')).toBe('Плечо, чуть болело')
		expect(escapeCsvField('a;b')).toBe('"a;b"')
		expect(escapeCsvField('says "hi"')).toBe('"says ""hi"""')
		expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
	})

	it('formats decimals with dot and deterministic rows', () => {
		const rows: CsvSetRow[] = [
			{
				workoutDate: '2026-01-01T10:00:00.000Z',
				workoutName: 'Грудь',
				exerciseName: 'Жим',
				exerciseId: 'ex_sys_bench_press',
				setNumber: 1,
				setType: 'normal',
				trackingType: 'weight_reps',
				weightKg: 82.5,
				reps: 10,
				durationSeconds: null,
				distance: null,
				workoutNotes: 'Плечо, чуть болело',
				exerciseNotes: 'Сиденье; 4',
				workoutId: 'wo_1',
			},
			{
				workoutDate: '2026-01-02T10:00:00.000Z',
				workoutName: 'Кардио',
				exerciseName: 'Бег',
				exerciseId: 'ex_run',
				setNumber: 1,
				setType: 'normal',
				trackingType: 'distance',
				weightKg: null,
				reps: null,
				durationSeconds: 1800,
				distance: 5.5,
				workoutNotes: null,
				exerciseNotes: 'ok',
				workoutId: 'wo_2',
			},
		]

		const csv = buildWorkoutsCsv(rows)
		const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r\n/)
		expect(lines).toHaveLength(3)
		expect(lines[1]).toContain('82.5')
		expect(lines[1]).toContain('Плечо, чуть болело')
		expect(lines[1]).toContain('"Сиденье; 4"')
		expect(lines[2]).toContain('5.5')
		expect(lines[2]).toContain('1800')
	})
})
