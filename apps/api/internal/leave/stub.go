package leave

type StubRepository struct{}

func NewStubRepository() *StubRepository {
	return &StubRepository{}
}
