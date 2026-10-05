package importjob

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
)

func hashParts(parts ...string) string {
	h := sha256.New()
	for _, p := range parts {
		h.Write([]byte(p))
		h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))
}

func EmployeeRowHash(
	id, name, department, mobile, level, branch, designation, zone, managerID string,
	doj, birthday string, yearsExp float64,
	basic, da, revisedBasicDA, hra, travel, hostel, children, totalSalary float64,
	mobileAllow, conveyance, wash, branchAllow, washingAllow, fixedIncentive, special, training, totalAllow, totalWithAllow float64,
	bankName, accountNumber, bankBranch, ifsc string,
) string {
	return hashParts(
		id, name, department, mobile, level, branch, designation, zone, managerID,
		doj, birthday, fmtFloat(yearsExp),
		fmtFloat(basic), fmtFloat(da), fmtFloat(revisedBasicDA), fmtFloat(hra), fmtFloat(travel),
		fmtFloat(hostel), fmtFloat(children), fmtFloat(totalSalary), fmtFloat(mobileAllow),
		fmtFloat(conveyance), fmtFloat(wash), fmtFloat(branchAllow), fmtFloat(washingAllow), fmtFloat(fixedIncentive), fmtFloat(special),
		fmtFloat(training), fmtFloat(totalAllow), fmtFloat(totalWithAllow),
		bankName, accountNumber, bankBranch, ifsc,
	)
}

func EpfRowHash(
	employeeID, name, department, level, doj, doa string,
	yearsDOJ, yearsDOA float64,
	epfNumber, uan, esi string,
) string {
	return hashParts(
		employeeID, name, department, level, doj, doa,
		fmtFloat(yearsDOJ), fmtFloat(yearsDOA),
		epfNumber, uan, esi,
	)
}

func PayrollRowHash(
	employeeID string, month, year int, name string,
	leaves, lop, days, absents float64,
	basic, da, basicDA, hra, travel, childrenHostel, childrenEducation float64,
	mobile, conveyance, branchAllow, wash, washingAllow, fixedIncentive, special, training, incentive float64,
	totalEar, grossWithout, grossPT, pf, pf367, pf833, esi075, esi325 float64,
	tds, salAdv, addDed, loan, advance, lopDed, companyStat float64,
	reimbMed, reimbLTA, zeta, reimbTravel, totalReimb, epfER, netInc, totalDed, actual float64,
) string {
	return hashParts(
		employeeID, strconv.Itoa(month), strconv.Itoa(year), name,
		fmtFloat(leaves), fmtFloat(lop), fmtFloat(days), fmtFloat(absents),
		fmtFloat(basic), fmtFloat(da), fmtFloat(basicDA), fmtFloat(hra), fmtFloat(travel),
		fmtFloat(childrenHostel), fmtFloat(childrenEducation), fmtFloat(mobile),
		fmtFloat(conveyance), fmtFloat(branchAllow), fmtFloat(wash), fmtFloat(washingAllow), fmtFloat(fixedIncentive), fmtFloat(special),
		fmtFloat(training), fmtFloat(incentive), fmtFloat(totalEar), fmtFloat(grossWithout),
		fmtFloat(grossPT), fmtFloat(pf), fmtFloat(pf367), fmtFloat(pf833),
		fmtFloat(esi075), fmtFloat(esi325), fmtFloat(tds), fmtFloat(salAdv),
		fmtFloat(addDed), fmtFloat(loan), fmtFloat(advance), fmtFloat(lopDed),
		fmtFloat(companyStat), fmtFloat(reimbMed), fmtFloat(reimbLTA), fmtFloat(zeta),
		fmtFloat(reimbTravel), fmtFloat(totalReimb), fmtFloat(epfER), fmtFloat(netInc),
		fmtFloat(totalDed), fmtFloat(actual),
	)
}

func fmtFloat(v float64) string {
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.4f", v), "0"), ".")
}

func PayrollNaturalKey(employeeID string, month, year int) string {
	return fmt.Sprintf("%s|%d|%d", employeeID, month, year)
}

func ParsePayrollNaturalKey(key string) (employeeID string, month, year int, ok bool) {
	parts := strings.SplitN(key, "|", 3)
	if len(parts) != 3 {
		return "", 0, 0, false
	}
	m, err1 := strconv.Atoi(parts[1])
	y, err2 := strconv.Atoi(parts[2])
	if err1 != nil || err2 != nil {
		return "", 0, 0, false
	}
	return parts[0], m, y, true
}
