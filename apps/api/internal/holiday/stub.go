package holiday

import "context"

type StubRepository struct{}

func NewStubRepository() *StubRepository {
	return &StubRepository{}
}

func (r *StubRepository) BulkInsert(ctx context.Context, holidays []Holiday) error {
	return nil
}

func (r *StubRepository) GetUpcoming(ctx context.Context, limit int) ([]Holiday, error) {
	// Return a static list for testing the WhatsApp flow
	return []Holiday{
		{Date: "2026-08-15", Name: "Independence Day", IsOptional: false},
		{Date: "2026-10-02", Name: "Gandhi Jayanti", IsOptional: false},
		{Date: "2026-11-01", Name: "Kannada Rajyotsava", IsOptional: false},
		{Date: "2026-12-25", Name: "Christmas", IsOptional: false},
	}, nil
}
