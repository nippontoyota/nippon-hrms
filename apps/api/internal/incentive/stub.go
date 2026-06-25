package incentive

type StubRepository struct{}

func NewStubRepository() *StubRepository {
	return &StubRepository{}
}
