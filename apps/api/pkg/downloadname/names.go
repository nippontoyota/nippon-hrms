package downloadname

import "time"

const istLocation = "Asia/Kolkata"

// ExportTimestampIST returns a filesystem-safe timestamp in India Standard Time.
func ExportTimestampIST() string {
	loc, err := time.LoadLocation(istLocation)
	if err != nil {
		loc = time.Local
	}
	return time.Now().In(loc).Format("2006-01-02_15-04-05")
}

func EmployeeExport() string {
	return "EmployeeDirectory_Export_" + ExportTimestampIST() + ".xlsx"
}

func EmployeeImportTemplate() string {
	return "EmployeeDirectory_ImportTemplate.csv"
}

func EpfExport() string {
	return "EPFDirectory_Export_" + ExportTimestampIST() + ".xlsx"
}

func EpfImportTemplate() string {
	return "EPFDirectory_ImportTemplate.csv"
}

func SalaryExport(month, year int) string {
	return formatSalaryBase("Export", month, year) + "_" + ExportTimestampIST() + ".xlsx"
}

func SalaryImportTemplate(month, year int) string {
	return formatSalaryBase("ImportTemplate", month, year) + ".csv"
}

func formatSalaryBase(kind string, month, year int) string {
	return "SalaryDirectory_" + kind + "_" + formatPeriod(month, year)
}

func formatPeriod(month, year int) string {
	return time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC).Format("01-2006")
}
