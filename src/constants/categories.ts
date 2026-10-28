import {
  IssueCategory,
  PriorityLevel,
  SurveyCategoryKey,
  SurveyCategoryMeta,
} from '../types';

export const SURVEY_CATEGORIES: SurveyCategoryMeta[] = [
  {
    key: SurveyCategoryKey.Healthcare,
    label: 'Healthcare Facilities',
    shortLabel: 'Healthcare',
    expectedHeader: 'Healthcare Facilities',
    urgencyWeight: 95,
    feasibilityWeight: 72,
    defaultStakeholder: 'Gram Panchayat Health & Sanitation Committee / Mandal PHC Liaison',
  },
  {
    key: SurveyCategoryKey.Education,
    label: 'Education Facilities',
    shortLabel: 'Education',
    expectedHeader: 'Education Facilities',
    urgencyWeight: 82,
    feasibilityWeight: 76,
    defaultStakeholder: 'Village Education Committee / Mandal Educational Officer (MEO) Liaison',
  },
  {
    key: SurveyCategoryKey.Employment,
    label: 'Employment Opportunities',
    shortLabel: 'Employment',
    expectedHeader: 'Employment Opportunities',
    urgencyWeight: 80,
    feasibilityWeight: 68,
    defaultStakeholder: 'MGNREGS Field Assistant / Mandal Skill & Livelihood Mission Cell',
  },
  {
    key: SurveyCategoryKey.Transportation,
    label: 'Transportation Facilities',
    shortLabel: 'Transportation',
    expectedHeader: 'Transportation Facilities',
    urgencyWeight: 84,
    feasibilityWeight: 74,
    defaultStakeholder: 'Panchayat Raj Engineering Sub-Division / Local RTC Depot Coordination',
  },
  {
    key: SurveyCategoryKey.Internet,
    label: 'Internet and Mobile Network',
    shortLabel: 'Internet & Network',
    expectedHeader: 'Internet and Mobile Network',
    urgencyWeight: 68,
    feasibilityWeight: 65,
    defaultStakeholder: 'BharatNet Gram Panchayat Digital Kendra / Telecom Service Coordination',
  },
  {
    key: SurveyCategoryKey.Banking,
    label: 'Banking and ATM Facilities',
    shortLabel: 'Banking & ATM',
    expectedHeader: 'Banking and ATM Facilities',
    urgencyWeight: 72,
    feasibilityWeight: 78,
    defaultStakeholder: 'Lead Bank Financial Inclusion Cell / Business Correspondent (BC) Sakhi',
  },
  {
    key: SurveyCategoryKey.DevelopmentPriority,
    label: 'Village Development Priority',
    shortLabel: 'Dev. Priority',
    expectedHeader: 'Village Development Priority',
    urgencyWeight: 90,
    feasibilityWeight: 80,
    defaultStakeholder: 'Gram Sabha Standing Committee & Panchayat Secretary',
  },
];

export const ISSUE_CATEGORIES: IssueCategory[] = [
  'Healthcare',
  'Education',
  'Employment',
  'Roads and Transportation',
  'Water Supply',
  'Sanitation and Drainage',
  'Electricity and Streetlights',
  'Internet Connectivity',
  'Banking Access',
  'Agriculture',
  'Other Village Development',
];

export const PRIORITY_LEVELS: PriorityLevel[] = ['Critical', 'High', 'Medium', 'Low'];

export function mapSurveyCategoryToIssueCategory(key: SurveyCategoryKey, concernText: string): IssueCategory {
  const lower = concernText.toLowerCase();
  if (lower.includes('water') || lower.includes('borewell') || lower.includes('tap') || lower.includes('drinking')) {
    return 'Water Supply';
  }
  if (lower.includes('drain') || lower.includes('sanitation') || lower.includes('garbage') || lower.includes('waste') || lower.includes('toilet')) {
    return 'Sanitation and Drainage';
  }
  if (lower.includes('street') || lower.includes('light') || lower.includes('power') || lower.includes('electric')) {
    return 'Electricity and Streetlights';
  }
  if (lower.includes('crop') || lower.includes('irrigat') || lower.includes('farm') || lower.includes('agricult')) {
    return 'Agriculture';
  }

  switch (key) {
    case SurveyCategoryKey.Healthcare:
      return 'Healthcare';
    case SurveyCategoryKey.Education:
      return 'Education';
    case SurveyCategoryKey.Employment:
      return 'Employment';
    case SurveyCategoryKey.Transportation:
      return 'Roads and Transportation';
    case SurveyCategoryKey.Internet:
      return 'Internet Connectivity';
    case SurveyCategoryKey.Banking:
      return 'Banking Access';
    case SurveyCategoryKey.DevelopmentPriority:
    default:
      if (lower.includes('road') || lower.includes('bus')) return 'Roads and Transportation';
      if (lower.includes('health') || lower.includes('hospital') || lower.includes('doctor') || lower.includes('clinic')) return 'Healthcare';
      if (lower.includes('school') || lower.includes('college') || lower.includes('library')) return 'Education';
      if (lower.includes('job') || lower.includes('skill') || lower.includes('work')) return 'Employment';
      if (lower.includes('bank') || lower.includes('atm')) return 'Banking Access';
      if (lower.includes('network') || lower.includes('internet') || lower.includes('tower')) return 'Internet Connectivity';
      return 'Other Village Development';
  }
}

export function getSuggestedActionForConcern(categoryKey: SurveyCategoryKey, concernText: string): {
  action: string;
  costRange: string;
  timeline: string;
  outcome: string;
  stakeholder: string;
} {
  const lower = concernText.toLowerCase();
  const catMeta = SURVEY_CATEGORIES.find((c) => c.key === categoryKey) || SURVEY_CATEGORIES[6];

  if (lower.includes('water') || lower.includes('drinking') || lower.includes('borewell') || lower.includes('tap')) {
    return {
      action: 'Conduct water quality & pressure audit; schedule overhead tank chlorination and repair leaking pipeline valves.',
      costRange: '₹35,000 – ₹1,20,000 (Illustrative)',
      timeline: 'Short-term (1–3 Months)',
      outcome: 'Reliable daily potable water supply across affected hamlets.',
      stakeholder: 'Rural Water Supply (RWS) & Sanitation Wing / Gram Panchayat',
    };
  }

  if (lower.includes('drain') || lower.includes('sanitation') || lower.includes('sewage') || lower.includes('waste')) {
    return {
      action: 'Organize immediate desilting drive, deploy ward-wise waste collection tricycles, and propose pucca side-drains under 15th Finance Commission grants.',
      costRange: '₹60,000 – ₹2,50,000 (Illustrative)',
      timeline: 'Short-to-Medium Term (2–6 Months)',
      outcome: 'Elimination of stagnant wastewater and reduced vector-borne disease risk.',
      stakeholder: 'Gram Panchayat Sanitation Committee & Swachh Bharat Gramin Cell',
    };
  }

  if (lower.includes('street') || lower.includes('light') || lower.includes('power') || lower.includes('electric')) {
    return {
      action: 'Complete pole-by-pole streetlight audit and replace faulty fixtures with energy-efficient LED or solar units at dark junctions.',
      costRange: '₹25,000 – ₹90,000 (Illustrative)',
      timeline: 'Short-term (1–2 Months)',
      outcome: 'Improved night-time road safety for women, elders, and commuters.',
      stakeholder: 'Gram Panchayat Streetlight Maintenance & DISCOM Line Staff',
    };
  }

  switch (categoryKey) {
    case SurveyCategoryKey.Healthcare:
      if (lower.includes('emergency') || lower.includes('ambulance') || lower.includes('night')) {
        return {
          action: 'Establish 108/104 emergency response display boards, coordinate weekly ANM/doctor fixed-day clinics, and stock essential first-aid kits at the Village Health Clinic.',
          costRange: '₹30,000 – ₹1,10,000 (Illustrative)',
          timeline: 'Short-term (1–3 Months)',
          outcome: 'Faster emergency triage and predictable local primary care access.',
          stakeholder: catMeta.defaultStakeholder,
        };
      }
      return {
        action: 'Coordinate bi-weekly Mandal PHC mobile medical camps, ensure generic medicine stock at Ayushman Arogya Mandir / Sub-Centre, and display doctor duty rosters.',
        costRange: '₹25,000 – ₹95,000 (Illustrative)',
        timeline: 'Short-to-Medium Term (1–4 Months)',
        outcome: 'Reduced out-of-pocket travel costs for routine outpatient consultations and maternal care.',
        stakeholder: catMeta.defaultStakeholder,
      };

    case SurveyCategoryKey.Education:
      if (lower.includes('digital') || lower.includes('computer') || lower.includes('library')) {
        return {
          action: 'Set up a shared community reading room & digital learning corner in the Panchayat building with CSR/alumni refurbished computers.',
          costRange: '₹45,000 – ₹1,40,000 (Illustrative)',
          timeline: 'Medium-term (3–6 Months)',
          outcome: 'Improved digital literacy and exam preparation access for rural students.',
          stakeholder: catMeta.defaultStakeholder,
        };
      }
      return {
        action: 'Convene School Management Committee (SMC) review for school sanitation/infrastructure repairs and coordinate safe student transport timings for high-school commuters.',
        costRange: '₹40,000 – ₹1,60,000 (Illustrative)',
        timeline: 'Medium-term (3–6 Months)',
        outcome: 'Higher secondary attendance retention and safer school learning facilities.',
        stakeholder: catMeta.defaultStakeholder,
      };

    case SurveyCategoryKey.Employment:
      return {
        action: 'Organize youth skill-mapping camp linked to PMKVY / District Skill Development courses, expand SHG micro-enterprise credit linkage, and publish timely MGNREGS work calendars.',
        costRange: '₹20,000 – ₹75,000 (Illustrative facilitation cost)',
        timeline: 'Medium-term (3–9 Months)',
        outcome: 'Increased non-farm youth employability and seasonal wage stability.',
        stakeholder: catMeta.defaultStakeholder,
      };

    case SurveyCategoryKey.Transportation:
      if (lower.includes('bus') || lower.includes('auto') || lower.includes('frequency') || lower.includes('timing')) {
        return {
          action: 'Submit Gram Sabha resolution with student/worker commuter counts to the local RTC Depot Manager requesting peak-hour morning and evening bus halts.',
          costRange: '₹10,000 – ₹45,000 (Illustrative bus-shelter/signage cost)',
          timeline: 'Short-to-Medium Term (2–4 Months)',
          outcome: 'Dependable public transit connectivity to nearby schools, hospitals, and markets.',
          stakeholder: catMeta.defaultStakeholder,
        };
      }
      return {
        action: 'Patch critical potholes and waterlogged stretches on village approach road; submit engineering estimate to Panchayat Raj department for CC/BT road renewal.',
        costRange: '₹1,50,000 – ₹6,00,000 (Illustrative)',
        timeline: 'Medium-to-Long Term (4–12 Months)',
        outcome: 'All-weather road connectivity for ambulances, school buses, and farm produce transport.',
        stakeholder: catMeta.defaultStakeholder,
      };

    case SurveyCategoryKey.Internet:
      return {
        action: 'Activate BharatNet Wi-Fi hotspot at Gram Panchayat / CSC center for students and e-governance services; submit signal dead-zone report signed by Sarpanch to telecom providers.',
        costRange: '₹15,000 – ₹60,000 (Illustrative CSC Wi-Fi setup)',
        timeline: 'Medium-term (2–6 Months)',
        outcome: 'Reliable digital access for online education, UPI payments, and government welfare portals.',
        stakeholder: catMeta.defaultStakeholder,
      };

    case SurveyCategoryKey.Banking:
      return {
        action: 'Establish fixed-schedule Banking Correspondent (BC Sakhi / DigiPay) micro-ATM counter at the Panchayat Secretariat and conduct financial literacy camps.',
        costRange: '₹15,000 – ₹50,000 (Illustrative kiosk setup)',
        timeline: 'Short-term (1–3 Months)',
        outcome: 'Doorstep cash withdrawal, pension disbursement, and banking access without travelling to town.',
        stakeholder: catMeta.defaultStakeholder,
      };

    case SurveyCategoryKey.DevelopmentPriority:
    default:
      return {
        action: 'Place finding on the upcoming Gram Sabha agenda for technical feasibility inspection and convergence funding allocation.',
        costRange: '₹50,000 – ₹2,50,000 (Illustrative)',
        timeline: 'Medium-term (3–6 Months)',
        outcome: 'Targeted resolution aligned with household-reported village priorities.',
        stakeholder: catMeta.defaultStakeholder,
      };
  }
}
