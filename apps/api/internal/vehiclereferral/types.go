package vehiclereferral

import "time"

type Referral struct {
	ID            string    `json:"id"`
	CustomerName  string    `json:"customerName"`
	EmployeeID    string    `json:"employeeId"`
	ReferredName  string    `json:"referredName"`
	ReferredPhone string    `json:"referredPhone"`
	Model         string    `json:"model"`
	CreatedAt     time.Time `json:"createdAt"`
}
