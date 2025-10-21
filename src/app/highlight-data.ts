export interface LoanApplication {
  Id: number;
  CustomerName: string;
  CreditScore: number;
  LoanType: string;
  RequestedAmount: number;
  ApplicationStatus: string;
  RiskLevel: string;
  SubmissionDate: Date;
}

export const applications: LoanApplication[] = [
  {
    Id: 1,
    CustomerName: "Emma Johnson",
    CreditScore: 780,
    LoanType: "Mortgage",
    RequestedAmount: 450000,
    ApplicationStatus: "Approved",
    RiskLevel: "Low",
    SubmissionDate: new Date(2025, 6, 15),
  },
  {
    Id: 2,
    CustomerName: "Lucas Brown",
    CreditScore: 620,
    LoanType: "Personal",
    RequestedAmount: 25000,
    ApplicationStatus: "Under Review",
    RiskLevel: "High",
    SubmissionDate: new Date(2025, 6, 22),
  },
  {
    Id: 3,
    CustomerName: "Olivia King",
    CreditScore: 720,
    LoanType: "Auto",
    RequestedAmount: 35000,
    ApplicationStatus: "Approved",
    RiskLevel: "Medium",
    SubmissionDate: new Date(2025, 6, 10),
  },
  {
    Id: 4,
    CustomerName: "Isabella Lee",
    CreditScore: 580,
    LoanType: "Personal",
    RequestedAmount: 15000,
    ApplicationStatus: "Rejected",
    RiskLevel: "High",
    SubmissionDate: new Date(2025, 5, 28),
  },
  {
    Id: 5,
    CustomerName: "Mia Davis",
    CreditScore: 750,
    LoanType: "Mortgage",
    RequestedAmount: 320000,
    ApplicationStatus: "Approved",
    RiskLevel: "Low",
    SubmissionDate: new Date(2025, 6, 25),
  },
  {
    Id: 6,
    CustomerName: "Ethan Wilson",
    CreditScore: 690,
    LoanType: "Auto",
    RequestedAmount: 28000,
    ApplicationStatus: "Under Review",
    RiskLevel: "Medium",
    SubmissionDate: new Date(2025, 6, 18),
  },
  {
    Id: 7,
    CustomerName: "Sophia Turner",
    CreditScore: 810,
    LoanType: "Mortgage",
    RequestedAmount: 520000,
    ApplicationStatus: "Approved",
    RiskLevel: "Low",
    SubmissionDate: new Date(2025, 6, 30),
  },
  {
    Id: 8,
    CustomerName: "Noah Smith",
    CreditScore: 640,
    LoanType: "Personal",
    RequestedAmount: 12000,
    ApplicationStatus: "Under Review",
    RiskLevel: "Medium",
    SubmissionDate: new Date(2025, 6, 5),
  },
  {
    Id: 9,
    CustomerName: "James Miller",
    CreditScore: 560,
    LoanType: "Auto",
    RequestedAmount: 22000,
    ApplicationStatus: "Rejected",
    RiskLevel: "High",
    SubmissionDate: new Date(2025, 5, 20),
  },
  {
    Id: 10,
    CustomerName: "Charlotte Garcia",
    CreditScore: 770,
    LoanType: "Mortgage",
    RequestedAmount: 380000,
    ApplicationStatus: "Approved",
    RiskLevel: "Low",
    SubmissionDate: new Date(2025, 6, 28),
  },
];

export const addColumnsValues = (columns: any[]) => {
  return columns.map((col) => {
    if (col.field === "LoanType") {
      return {
        ...col,
        Values: ["Mortgage", "Personal", "Auto"],
      };
    }
    if (col.field === "ApplicationStatus") {
      return {
        ...col,
        Values: ["Approved", "Rejected", "Under Review"],
      };
    }
    if (col.field === "RiskLevel") {
      return {
        ...col,
        Values: ["Low", "Medium", "High"],
      };
    }
    return col;
  });
};
