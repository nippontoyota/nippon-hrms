package employee

import (
	"sort"

	"github.com/nippon-toyota/hrms/pkg/employeeid"
)

// SortByEmployeeID sorts employees by employee ID ascending for export.
func SortByEmployeeID(employees []Employee) {
	sort.Slice(employees, func(i, j int) bool {
		return employeeid.Less(employees[i].EmployeeID, employees[j].EmployeeID)
	})
}
