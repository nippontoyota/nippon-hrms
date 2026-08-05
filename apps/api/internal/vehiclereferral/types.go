package vehiclereferral

import "time"

type Referral struct {
	ID            string    `json:"id"`
	CustomerName  string    `json:"customerName"`
	CustomerPhone string    `json:"customerPhone"`
	ReferredName  string    `json:"referredName"`
	ReferredPhone string    `json:"referredPhone"`
	Model         string    `json:"model"`
	CreatedAt     time.Time `json:"createdAt"`
}
