package maintenance

import "strings"

var canonicalBranchNames = []string{
	"Irinjalakuda", "Kalamaserry", "Kayamkulam", "Kazhakoottam", "Kollam", "Kottayam",
	"Muvattupuzha", "Nettor", "Pathanamthitta", "Thiruvalla", "Thrissur",
}

var branchNameAliases = map[string]string{
	"irinjalakuda": "Irinjalakuda",
	"kalamaserry": "Kalamaserry", "kalamaserry_sm": "Kalamaserry", "kalamassery": "Kalamaserry",
	"kayamkulam": "Kayamkulam", "kayamkulam_sm": "Kayamkulam",
	"kazhakoottam": "Kazhakoottam", "kazhakoottam_sm": "Kazhakoottam",
	"kollam": "Kollam", "kottayam": "Kottayam", "muvattupuzha": "Muvattupuzha",
	"nettoo": "Nettor", "nettoo_sm": "Nettor", "nettor": "Nettor", "nettor_sm": "Nettor",
	"pathanamthitta": "Pathanamthitta", "thiruvalla": "Thiruvalla",
	"thrissur": "Thrissur", "thrissur_sm": "Thrissur", "trichur": "Thrissur", "trichur_sm": "Thrissur",
}

func CanonicalBranchName(value string) string {
	trimmed := strings.TrimSpace(value)
	if canonical, ok := branchNameAliases[strings.ToLower(trimmed)]; ok {
		return canonical
	}
	return trimmed
}

func IsCanonicalBranchName(value string) bool {
	canonical := CanonicalBranchName(value)
	for _, name := range canonicalBranchNames {
		if name == canonical {
			return true
		}
	}
	return false
}

func CanonicalBranchOrder() []string {
	return append([]string(nil), canonicalBranchNames...)
}
