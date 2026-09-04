package dashboard

type BranchCount struct {
	Branch string `json:"branch"`
	Count  int    `json:"count"`
}

type ExperienceDistribution struct {
	Under1Year int `json:"under1Year"`
	OneTo3Years int `json:"oneTo3Years"`
	ThreeTo5Years int `json:"threeTo5Years"`
	FiveTo10Years int `json:"fiveTo10Years"`
	Over10Years int `json:"over10Years"`
}

type DesignationCount struct {
	Designation string `json:"designation"`
	Count       int    `json:"count"`
}

type DashboardStats struct {
	EmployeeCount           int                    `json:"employeeCount"`
	PendingLeaveRequests    int                    `json:"pendingLeaveRequests"`
	PendingDispatchJobs     int                    `json:"pendingDispatchJobs"`
	AttendancePeriods       int                    `json:"attendancePeriods"`
	BranchDistribution      []BranchCount          `json:"branchDistribution"`
	DesignationDistribution []DesignationCount     `json:"designationDistribution"`
	Experience              ExperienceDistribution `json:"experienceDistribution"`
}
