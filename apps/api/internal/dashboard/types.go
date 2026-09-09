package dashboard

type BranchCount struct {
	Branch string `json:"branch"`
	Count  int    `json:"count"`
}

type ExperienceDistribution struct {
	Under1Year    int `json:"under1Year"`
	OneTo3Years   int `json:"oneTo3Years"`
	ThreeTo5Years int `json:"threeTo5Years"`
	FiveTo10Years int `json:"fiveTo10Years"`
	Over10Years   int `json:"over10Years"`
}

type DepartmentCount struct {
	Department string `json:"department"`
	Count      int    `json:"count"`
}

type DashboardStats struct {
	EmployeeCount          int                    `json:"employeeCount"`
	PendingLeaveRequests   int                    `json:"pendingLeaveRequests"`
	PendingDispatchJobs    int                    `json:"pendingDispatchJobs"`
	AttendancePeriods      int                    `json:"attendancePeriods"`
	BranchDistribution     []BranchCount          `json:"branchDistribution"`
	DepartmentDistribution []DepartmentCount      `json:"departmentDistribution"`
	Experience             ExperienceDistribution `json:"experienceDistribution"`
}
