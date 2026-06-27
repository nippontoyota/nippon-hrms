package epf

import (
	"sort"

	"github.com/nippon-toyota/hrms/pkg/employeeid"
)

func SortByEmployeeID(records []Record) {
	sort.Slice(records, func(i, j int) bool {
		return employeeid.Less(records[i].EmployeeID, records[j].EmployeeID)
	})
}
