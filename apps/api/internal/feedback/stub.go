package feedback

type StubRepository struct{}

func NewStubRepository() *StubRepository {
	return &StubRepository{}
}
