package attendance

type StubRepository struct{}

func NewStubRepository() *StubRepository {
	return &StubRepository{}
}
