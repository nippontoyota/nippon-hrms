package whatsapp

import (
	"strconv"
	"testing"

	"github.com/nippon-toyota/hrms/internal/maintenance"
)

func testMaintenanceBranches(count int) []maintenance.Branch {
	branches := make([]maintenance.Branch, count)
	for index := range branches {
		branches[index] = maintenance.Branch{ID: "branch-" + strconv.Itoa(index), Name: "Branch " + strconv.Itoa(index)}
	}
	return branches
}

func TestMaintenanceBranchListSectionsPaginatesWithNextAndBack(t *testing.T) {
	branches := testMaintenanceBranches(11)

	firstPage := maintenanceBranchListSections(branches, 0)[0].Rows
	if len(firstPage) != 10 || firstPage[8].ID != "branch_branch-8" || firstPage[9].ID != "branch_next_9" {
		t.Fatalf("unexpected first maintenance branch page: %#v", firstPage)
	}

	secondPage := maintenanceBranchListSections(branches, 9)[0].Rows
	if len(secondPage) != 3 || secondPage[0].ID != "branch_branch-9" || secondPage[1].ID != "branch_branch-10" || secondPage[2].ID != "branch_back_0" {
		t.Fatalf("unexpected second maintenance branch page: %#v", secondPage)
	}
}

func TestMaintenanceBranchPromptReportsOneBasedPageCount(t *testing.T) {
	if got := maintenanceBranchPrompt(0, 11); got != msgMaintenanceAwaitBranch+"\n\nPage 1 of 2" {
		t.Fatalf("first prompt = %q", got)
	}
	if got := maintenanceBranchPrompt(9, 11); got != msgMaintenanceAwaitBranch+"\n\nPage 2 of 2" {
		t.Fatalf("second prompt = %q", got)
	}
}

func TestMaintenanceCategoryListContainsAllSupportedCategories(t *testing.T) {
	rows := maintenanceCategoryListSections()[0].Rows
	want := []string{"cat_electrical", "cat_plumbing", "cat_hvac", "cat_civil", "cat_it"}
	if len(rows) != len(want) {
		t.Fatalf("got %d categories, want %d", len(rows), len(want))
	}
	for index, row := range rows {
		if row.ID != want[index] {
			t.Errorf("category %d = %q, want %q", index, row.ID, want[index])
		}
	}
}
